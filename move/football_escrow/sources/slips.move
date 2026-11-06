// Football multi escrow (testnet). A multi's stake is held on-chain in a shared Slip until the server settles it.
//
// Trust model (say this plainly): the server grades the matches and signs the result by calling settle_slip with the
// AdminCap. The contract does not check the football result itself. It enforces that a slip settles once, that the
// payout is covered by the stake plus the admin's top-up, and that only the owner can claim.
//
// Money flow: a won slip pays more than the stake, so the house (the admin) tops up the difference when settling.
// A lost slip pays nothing. A void slip refunds the stake.
module football_escrow::slips;

use sui::balance::Balance;
use sui::coin::{Self, Coin};
use sui::event;

const PENDING: u8 = 0;
const WON: u8 = 1;
const LOST: u8 = 2;
const VOID: u8 = 3;

const EWrongState: u64 = 1;
const ENotOwner: u64 = 2;
const EPayoutNotCovered: u64 = 3;
const EBadOutcome: u64 = 4;
const EZeroStake: u64 = 5;
const EAlreadyClaimed: u64 = 6;

public struct AdminCap has key, store { id: UID }

// Shared. Holds the stake until settlement and the payout until claimed.
public struct Slip<phantom T> has key {
    id: UID,
    owner: address,
    slip_ref: vector<u8>,
    bal: Balance<T>,
    stake: u64,
    state: u8,
    payout: u64,
    claimed: bool,
}

public struct SlipCreated has copy, drop { slip: ID, owner: address, stake: u64, slip_ref: vector<u8> }
public struct SlipSettled has copy, drop { slip: ID, outcome: u8, payout: u64, house_topup: u64 }
public struct SlipClaimed has copy, drop { slip: ID, holder: address, paid: u64 }

fun init(ctx: &mut TxContext) {
    transfer::transfer(AdminCap { id: object::new(ctx) }, ctx.sender());
}

// The user escrows the stake. slip_ref is the off-chain slip ID, so the record links to the app.
public fun create_slip<T>(stake: Coin<T>, slip_ref: vector<u8>, ctx: &mut TxContext) {
    let amount = stake.value();
    assert!(amount > 0, EZeroStake);
    let id = object::new(ctx);
    let sid = id.to_inner();
    event::emit(SlipCreated { slip: sid, owner: ctx.sender(), stake: amount, slip_ref });
    transfer::share_object(Slip<T> {
        id,
        owner: ctx.sender(),
        slip_ref,
        bal: stake.into_balance(),
        stake: amount,
        state: PENDING,
        payout: 0,
        claimed: false,
    });
}

// outcome: 1 won, 2 lost, 3 void. For a win, payout is what the owner receives. The admin tops up any shortfall.
// Any top-up not needed is returned to the admin.
public fun settle_slip<T>(_: &AdminCap, slip: &mut Slip<T>, outcome: u8, payout: u64, topup: Coin<T>, ctx: &mut TxContext) {
    assert!(slip.state == PENDING, EWrongState);
    let mut house = topup.into_balance();
    let mut settled_payout = 0;
    if (outcome == WON) {
        let escrowed = slip.bal.value();
        assert!(payout + 0 <= escrowed + house.value(), EPayoutNotCovered);
        if (payout > escrowed) {
            let need = payout - escrowed;
            slip.bal.join(house.split(need));
        };
        settled_payout = payout;
    } else if (outcome == VOID) {
        settled_payout = slip.stake;
    } else if (outcome == LOST) {
        settled_payout = 0;
    } else {
        abort EBadOutcome
    };
    slip.state = outcome;
    slip.payout = settled_payout;
    let topup_used = if (outcome == WON && payout > slip.stake) { payout - slip.stake } else { 0 };
    event::emit(SlipSettled { slip: object::id(slip), outcome, payout: settled_payout, house_topup: topup_used });
    transfer::public_transfer(coin::from_balance(house, ctx), ctx.sender());
}

// The owner withdraws the payout once.
public fun claim<T>(slip: &mut Slip<T>, ctx: &mut TxContext) {
    assert!(slip.state != PENDING, EWrongState);
    assert!(ctx.sender() == slip.owner, ENotOwner);
    assert!(!slip.claimed, EAlreadyClaimed);
    slip.claimed = true;
    let amount = slip.payout;
    event::emit(SlipClaimed { slip: object::id(slip), holder: slip.owner, paid: amount });
    if (amount > 0) {
        transfer::public_transfer(coin::from_balance(slip.bal.split(amount), ctx), slip.owner);
    };
}
