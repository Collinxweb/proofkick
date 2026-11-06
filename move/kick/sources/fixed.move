// Fixed-odds Kick rounds (testnet play money). Fair odds with a 3% house margin.
// The chance (in hundredths of a percent, 7600 = 76%) is quoted by the server at the moment of the kick and signed.
// Payout = stake x (10000 - 300) / chance_bps. At 76% a 1000 KICK stake pays 1276.
// The house mints only the top-up a winning side needs, and only up to the round's house cap.
// Trust model: the server prices and signs quotes; the admin opens rounds, settles them with price prints, and mints
// the top-up. The contract checks the quote signature, the cut-off, the stake limit, exposure, and settlement consistency.
module kick::fixed;

use kick::kick_token::{KICK_TOKEN, Faucet};
use kick::rounds::{AdminCap, mint_house};
use sui::balance::{Self, Balance};
use sui::bcs;
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::ed25519;
use sui::event;

const OPEN: u8 = 0;
const SETTLED: u8 = 1;
const VOID: u8 = 2;
const LONG: u8 = 1;   // GREEN: price closes up
const SHORT: u8 = 2;  // RED: price closes down
const BPS: u128 = 10000;
const MARGIN_BPS: u128 = 300;     // 3% house margin
const MIN_CHANCE_BPS: u64 = 100;  // 1%
const MAX_CHANCE_BPS: u64 = 9900; // 99%
const QUOTE_MAX_MS: u64 = 60_000;
const MAX_STAKE: u64 = 10_000_000_000; // 10,000 KICK, 6 decimals

const EWrongState: u64 = 1;
const ECutOff: u64 = 2;
const EQuoteExpired: u64 = 3;
const EBadQuote: u64 = 4;
const EBadChance: u64 = 5;
const EZeroStake: u64 = 6;
const EStakeTooBig: u64 = 7;
const EExposure: u64 = 8;
const EBadSide: u64 = 9;
const ENotExpired: u64 = 10;
const EOutcome: u64 = 11;
const EBadWindow: u64 = 12;
const EWrongRound: u64 = 13;
const EHouseCap: u64 = 14;
const EBadKey: u64 = 15;

// Shared. Holds the server's public key used to verify quotes.
public struct FixedConfig has key { id: UID, quote_key: vector<u8> }

public struct FixedRound has key {
    id: UID,
    code: vector<u8>,
    cutoff_ms: u64,
    expires_ms: u64,
    open_price_micro: u64,
    close_price_micro: u64,
    house_cap: u64,
    bal: Balance<KICK_TOKEN>,
    exp_long: u64,
    exp_short: u64,
    state: u8,
    outcome: u8,
}

// Owned by the kicker. Redeeming consumes it.
public struct FixedTicket has key, store {
    id: UID,
    round: ID,
    side: u8,
    stake: u64,
    chance_bps: u64,
    payout: u64,
}

public struct FixedOpened has copy, drop { round: ID, code: vector<u8>, cutoff_ms: u64, expires_ms: u64, open_price_micro: u64, house_cap: u64 }
public struct FixedKicked has copy, drop { round: ID, kicker: address, side: u8, stake: u64, chance_bps: u64, payout: u64, ts_ms: u64 }
public struct FixedSettled has copy, drop { round: ID, outcome: u8, open_price_micro: u64, close_price_micro: u64, house_topup: u64 }
public struct FixedRedeemed has copy, drop { round: ID, holder: address, paid: u64 }

// Config is created by the admin after the upgrade (init does not run on upgrade).
public fun create_config(_: &AdminCap, quote_key: vector<u8>, ctx: &mut TxContext) {
    assert!(quote_key.length() == 32, EBadKey);
    transfer::share_object(FixedConfig { id: object::new(ctx), quote_key });
}

public fun set_quote_key(_: &AdminCap, cfg: &mut FixedConfig, quote_key: vector<u8>) {
    assert!(quote_key.length() == 32, EBadKey);
    cfg.quote_key = quote_key;
}

public fun open_fixed_round(
    _: &AdminCap,
    code: vector<u8>,
    cutoff_ms: u64,
    expires_ms: u64,
    open_price_micro: u64,
    house_cap: u64,
    ctx: &mut TxContext,
) {
    assert!(cutoff_ms < expires_ms && open_price_micro > 0, EBadWindow);
    let id = object::new(ctx);
    let rid = id.to_inner();
    event::emit(FixedOpened { round: rid, code, cutoff_ms, expires_ms, open_price_micro, house_cap });
    transfer::share_object(FixedRound {
        id, code, cutoff_ms, expires_ms, open_price_micro, close_price_micro: 0, house_cap,
        bal: balance::zero<KICK_TOKEN>(), exp_long: 0, exp_short: 0, state: OPEN, outcome: 0,
    });
}

// Payout for a stake at a quoted chance, with the 3% margin, rounded down.
public fun payout_of(stake: u64, chance_bps: u64): u64 {
    (((stake as u128) * (BPS - MARGIN_BPS)) / (chance_bps as u128)) as u64
}

fun quote_message(round_id: ID, side: u8, chance_bps: u64, valid_until_ms: u64): vector<u8> {
    let mut m = vector::empty<u8>();
    vector::append(&mut m, bcs::to_bytes(&round_id));
    vector::append(&mut m, bcs::to_bytes(&side));
    vector::append(&mut m, bcs::to_bytes(&chance_bps));
    vector::append(&mut m, bcs::to_bytes(&valid_until_ms));
    m
}

public fun kick_fixed(
    round: &mut FixedRound,
    cfg: &FixedConfig,
    stake: Coin<KICK_TOKEN>,
    side: u8,
    chance_bps: u64,
    valid_until_ms: u64,
    quote_sig: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(round.state == OPEN, EWrongState);
    let now = clock.timestamp_ms();
    assert!(now < round.cutoff_ms, ECutOff);
    assert!(now <= valid_until_ms && valid_until_ms <= now + QUOTE_MAX_MS, EQuoteExpired);
    assert!(side == LONG || side == SHORT, EBadSide);
    assert!(chance_bps >= MIN_CHANCE_BPS && chance_bps <= MAX_CHANCE_BPS, EBadChance);
    let msg = quote_message(object::id(round), side, chance_bps, valid_until_ms);
    assert!(ed25519::ed25519_verify(&quote_sig, &cfg.quote_key, &msg), EBadQuote);

    let amount = stake.value();
    assert!(amount > 0, EZeroStake);
    assert!(amount <= MAX_STAKE, EStakeTooBig);
    let payout = payout_of(amount, chance_bps);

    round.bal.join(stake.into_balance());
    if (side == LONG) {
        round.exp_long = round.exp_long + payout;
    } else {
        round.exp_short = round.exp_short + payout;
    };
    let worst = if (round.exp_long > round.exp_short) { round.exp_long } else { round.exp_short };
    assert!(worst <= round.bal.value() + round.house_cap, EExposure);

    let rid = object::id(round);
    event::emit(FixedKicked { round: rid, kicker: ctx.sender(), side, stake: amount, chance_bps, payout, ts_ms: now });
    transfer::public_transfer(FixedTicket { id: object::new(ctx), round: rid, side, stake: amount, chance_bps, payout }, ctx.sender());
}

// outcome: 0 void (tie, refund), 1 GREEN, 2 RED. A winning side is topped up from the house, up to the round's cap.
public fun settle_fixed(
    admin: &AdminCap,
    round: &mut FixedRound,
    faucet: &mut Faucet,
    outcome: u8,
    close_micro: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(round.state == OPEN, EWrongState);
    assert!(clock.timestamp_ms() >= round.expires_ms, ENotExpired);
    assert!(close_micro > 0, EOutcome);
    assert!(outcome == 0 || outcome == LONG || outcome == SHORT, EOutcome);
    let mut topup: u64 = 0;
    if (outcome == 0) {
        round.state = VOID;
    } else {
        if (outcome == LONG) {
            assert!(close_micro > round.open_price_micro, EOutcome);
        } else {
            assert!(close_micro < round.open_price_micro, EOutcome);
        };
        let winning = if (outcome == LONG) { round.exp_long } else { round.exp_short };
        let have = round.bal.value();
        if (winning > have) {
            topup = winning - have;
            assert!(topup <= round.house_cap, EHouseCap);
            let top = mint_house(admin, faucet, topup, ctx);
            round.bal.join(top.into_balance());
        };
        round.state = SETTLED;
    };
    round.outcome = outcome;
    round.close_price_micro = close_micro;
    event::emit(FixedSettled { round: object::id(round), outcome, open_price_micro: round.open_price_micro, close_price_micro: close_micro, house_topup: topup });
}

// A holder redeems a ticket: the payout if their side won, the stake back if the round was voided, nothing otherwise.
public fun redeem_fixed(round: &mut FixedRound, ticket: FixedTicket, ctx: &mut TxContext) {
    assert!(round.state != OPEN, EWrongState);
    let FixedTicket { id, round: rid, side, stake, chance_bps: _, payout } = ticket;
    assert!(rid == object::id(round), EWrongRound);
    let amount = if (round.state == VOID) { stake } else if (side == round.outcome) { payout } else { 0 };
    object::delete(id);
    event::emit(FixedRedeemed { round: rid, holder: ctx.sender(), paid: amount });
    if (amount > 0) {
        transfer::public_transfer(coin::from_balance(round.bal.split(amount), ctx), ctx.sender());
    };
}
