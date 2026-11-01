// KICK: testnet play money. No value, no mainnet deployment.
// The TreasuryCap lives inside a shared Faucet and never leaves it, so only `claim` can mint.
module kick::kick_token;

use sui::coin::{Self, TreasuryCap};
use sui::table::{Self, Table};

public struct KICK_TOKEN has drop {}

const DECIMALS: u8 = 6;
const CLAIM_AMOUNT: u64 = 10_000_000_000; // 10,000 KICK per wallet, base units (6 decimals)

const EAlreadyClaimed: u64 = 1;

public struct Faucet has key {
    id: UID,
    cap: TreasuryCap<KICK_TOKEN>,
    claimed: Table<address, bool>,
}

fun init(witness: KICK_TOKEN, ctx: &mut TxContext) {
    let (cap, metadata) = coin::create_currency(
        witness,
        DECIMALS,
        b"KICK",
        b"KICK",
        b"ProofKick testnet play token. No value.",
        option::none(),
        ctx,
    );
    transfer::public_freeze_object(metadata);
    transfer::share_object(Faucet {
        id: object::new(ctx),
        cap,
        claimed: table::new(ctx),
    });
}

// One claim per wallet, enforced here, not in the app.
public fun claim(faucet: &mut Faucet, ctx: &mut TxContext) {
    let who = ctx.sender();
    assert!(!faucet.claimed.contains(who), EAlreadyClaimed);
    faucet.claimed.add(who, true);
    let coins = coin::mint(&mut faucet.cap, CLAIM_AMOUNT, ctx);
    transfer::public_transfer(coins, who);
}

public fun has_claimed(faucet: &Faucet, who: address): bool {
    faucet.claimed.contains(who)
}
