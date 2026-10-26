module proofkick::receipt;

use sui::event;

/// kind: 0 = test, 1 = pick lock, 2 = settlement, 3 = daily merkle root
public struct Receipt has key, store {
    id: UID,
    kind: u8,
    strategy_id: vector<u8>,
    record_hash: vector<u8>,
    ref: vector<u8>,
    ts_ms: u64,
}

public struct ReceiptMinted has copy, drop {
    receipt_id: ID,
    kind: u8,
    strategy_id: vector<u8>,
    record_hash: vector<u8>,
    ref: vector<u8>,
    ts_ms: u64,
}

/// Mints an immutable receipt: nobody (including the minter) can edit or delete it afterwards.
public fun mint(
    kind: u8,
    strategy_id: vector<u8>,
    record_hash: vector<u8>,
    ref: vector<u8>,
    ts_ms: u64,
    ctx: &mut TxContext,
) {
    let receipt = Receipt { id: object::new(ctx), kind, strategy_id, record_hash, ref, ts_ms };
    event::emit(ReceiptMinted {
        receipt_id: object::id(&receipt),
        kind,
        strategy_id,
        record_hash,
        ref,
        ts_ms,
    });
    transfer::freeze_object(receipt);
}
