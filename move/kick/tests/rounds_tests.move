// Runs with `sui move test`, never included in a publish.
#[test_only]
module kick::rounds_tests;

use kick::rounds;

#[test]
fun payout_splits_the_pool_pro_rata() {
    // pool = 400 long + 600 short = 1000
    assert!(rounds::payout_of(100, 1, 400, 600) == 250, 0);
    assert!(rounds::payout_of(300, 1, 400, 600) == 750, 1);
    assert!(rounds::payout_of(600, 2, 400, 600) == 1000, 2);
    assert!(rounds::payout_of(0, 1, 400, 600) == 0, 3);
}

#[test]
fun payouts_never_exceed_the_pool() {
    // three long stakes that do not divide evenly into the pool
    let total = 100 + 200 + 333;
    let paid = rounds::payout_of(100, 1, total, 500) + rounds::payout_of(200, 1, total, 500) + rounds::payout_of(333, 1, total, 500);
    assert!(paid <= total + 500, 4);
}
