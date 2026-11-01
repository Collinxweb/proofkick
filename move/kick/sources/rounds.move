// Kick rounds: two-sided pools (long = close above open, short = close below open).
// Winners share the whole pool pro rata to stake. Ties and one-sided pools are refunded in full.
//
// Trust model (say this plainly in the pitch):
// - The admin (AdminCap holder) opens rounds and settles them with the price prints.
// - The contract refuses a direction that contradicts the recorded prices, refuses to settle early,
//   and refuses a one-sided pool as a winner. It can void, which refunds everyone.
// - The admin cannot take money out: redeem only ever pays a holder's own stake, pro rata.
module kick::rounds;

use kick::kick_token::KICK_TOKEN;
use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event;
use sui::table::{Self, Table};

const OPEN: u8 = 0;
const SETTLED: u8 = 1;
const VOID: u8 = 2;

const LONG: u8 = 1;
const SHORT: u8 = 2;

const EWrongState: u64 = 1;
const EOutsideEntryWindow: u64 = 2;
const EBadSide: u64 = 3;
const EZeroStake: u64 = 4;
const ENotExpired: u64 = 5;
const EBadOutcome: u64 = 6;
const EOutcomeContradictsPrices: u64 = 7;
const EOneSidedNeedsVoid: u64 = 8;
const EBadWindow: u64 = 9;
const EBadPrice: u64 = 10;
const ENothingToRedeem: u64 = 11;

public struct AdminCap has key, store {
    id: UID,
}

public struct Round has key {
    id: UID,
    code: vector<u8>,
    opens_ms: u64,
    entry_close_ms: u64,
    expires_ms: u64,
    open_price_micro: u64,
    close_price_micro: u64,
    bal: Balance<KICK_TOKEN>,
    long_total: u64,
    short_total: u64,
    long_stakes: Table<address, u64>,
    short_stakes: Table<address, u64>,
    state: u8,
    outcome: u8,
}

public struct RoundOpened has copy, drop {
    round: ID,
    code: vector<u8>,
    opens_ms: u64,
    entry_close_ms: u64,
    expires_ms: u64,
    open_price_micro: u64,
}

public struct Kicked has copy, drop {
    round: ID,
    kicker: address,
    side: u8,
    amount: u64,
    ts_ms: u64,
}

public struct Settled has copy, drop {
    round: ID,
    outcome: u8,
    open_price_micro: u64,
    close_price_micro: u64,
    long_total: u64,
    short_total: u64,
}

public struct Redeemed has copy, drop {
    round: ID,
    holder: address,
    paid: u64,
}

fun init(ctx: &mut TxContext) {
    transfer::transfer(AdminCap { id: object::new(ctx) }, ctx.sender());
}

public fun open_round(
    _: &AdminCap,
    code: vector<u8>,
    opens_ms: u64,
    entry_close_ms: u64,
    expires_ms: u64,
    open_price_micro: u64,
    ctx: &mut TxContext,
) {
    assert!(opens_ms < entry_close_ms && entry_close_ms < expires_ms, EBadWindow);
    assert!(open_price_micro > 0, EBadPrice);
    let id = object::new(ctx);
    let round_id = object::uid_to_inner(&id);
    event::emit(RoundOpened {
        round: round_id,
        code: copy code,
        opens_ms,
        entry_close_ms,
        expires_ms,
        open_price_micro,
    });
    transfer::share_object(Round {
        id,
        code,
        opens_ms,
        entry_close_ms,
        expires_ms,
        open_price_micro,
        close_price_micro: 0,
        bal: balance::zero<KICK_TOKEN>(),
        long_total: 0,
        short_total: 0,
        long_stakes: table::new(ctx),
        short_stakes: table::new(ctx),
        state: OPEN,
        outcome: 0,
    });
}

// Only accepted between opens_ms and entry_close_ms, using the chain clock.
public fun kick(round: &mut Round, stake: Coin<KICK_TOKEN>, side: u8, clock: &Clock, ctx: &mut TxContext) {
    assert!(round.state == OPEN, EWrongState);
    let now = clock.timestamp_ms();
    assert!(now >= round.opens_ms && now < round.entry_close_ms, EOutsideEntryWindow);
    assert!(side == LONG || side == SHORT, EBadSide);
    let amount = stake.value();
    assert!(amount > 0, EZeroStake);
    let who = ctx.sender();
    round.bal.join(stake.into_balance());
    if (side == LONG) {
        round.long_total = round.long_total + amount;
        add_stake(&mut round.long_stakes, who, amount);
    } else {
        round.short_total = round.short_total + amount;
        add_stake(&mut round.short_stakes, who, amount);
    };
    event::emit(Kicked {
        round: object::id(round),
        kicker: who,
        side,
        amount,
        ts_ms: now,
    });
}

// Settles after expiry. The outcome must agree with the recorded prices; a void is always allowed.
public fun settle_round(
    _: &AdminCap,
    round: &mut Round,
    outcome: u8,
    close_price_micro: u64,
    clock: &Clock,
) {
    assert!(round.state == OPEN, EWrongState);
    assert!(clock.timestamp_ms() >= round.expires_ms, ENotExpired);
    assert!(close_price_micro > 0, EBadPrice);
    assert!(outcome == LONG || outcome == SHORT || outcome == 0, EBadOutcome);
    if (outcome == 0) {
        round.state = VOID;
    } else {
        assert!(round.long_total > 0 && round.short_total > 0, EOneSidedNeedsVoid);
        if (outcome == LONG) {
            assert!(close_price_micro > round.open_price_micro, EOutcomeContradictsPrices);
        } else {
            assert!(close_price_micro < round.open_price_micro, EOutcomeContradictsPrices);
        };
        round.state = SETTLED;
    };
    round.outcome = outcome;
    round.close_price_micro = close_price_micro;
    event::emit(Settled {
        round: object::id(round),
        outcome,
        open_price_micro: round.open_price_micro,
        close_price_micro,
        long_total: round.long_total,
        short_total: round.short_total,
    });
}

// Each holder withdraws their own share once the round is settled or voided. One redemption per holder.
public fun redeem(round: &mut Round, ctx: &mut TxContext) {
    assert!(round.state != OPEN, EWrongState);
    let who = ctx.sender();
    let long_stake = take_stake(&mut round.long_stakes, who);
    let short_stake = take_stake(&mut round.short_stakes, who);
    assert!(long_stake > 0 || short_stake > 0, ENothingToRedeem);
    let paid = if (round.state == VOID) {
        long_stake + short_stake
    } else {
        let mine = if (round.outcome == LONG) long_stake else short_stake;
        payout_of(mine, round.outcome, round.long_total, round.short_total)
    };
    if (paid > 0) {
        let coins = coin::from_balance(round.bal.split(paid), ctx);
        transfer::public_transfer(coins, who);
    };
    event::emit(Redeemed {
        round: object::id(round),
        holder: who,
        paid,
    });
}

// Pro-rata payout for one winning stake. Rounded down, so the pool can never be overpaid.
public fun payout_of(stake: u64, outcome: u8, long_total: u64, short_total: u64): u64 {
    if (stake == 0) return 0;
    let winning = if (outcome == LONG) long_total else short_total;
    assert!(winning > 0, EOneSidedNeedsVoid);
    let total = long_total + short_total;
    (((stake as u128) * (total as u128)) / (winning as u128)) as u64
}

fun add_stake(stakes: &mut Table<address, u64>, who: address, amount: u64) {
    if (stakes.contains(who)) {
        let s = stakes.borrow_mut(who);
        *s = *s + amount;
    } else {
        stakes.add(who, amount);
    };
}

fun take_stake(stakes: &mut Table<address, u64>, who: address): u64 {
    if (stakes.contains(who)) stakes.remove(who) else 0
}
