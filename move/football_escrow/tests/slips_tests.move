// Runs with `sui move test` only.
#[test_only]
module football_escrow::slips_tests;

use football_escrow::slips;

#[test]
fun three_picks_at_2_38_pays_2380_and_the_house_adds_1380() {
    let stake = 1000;
    let payout = slips::payout_for(stake, 238);
    assert!(payout == 2380, 0);
    assert!(slips::house_topup(stake, payout) == 1380, 1);
}

#[test]
fun a_loss_needs_no_topup() {
    assert!(slips::house_topup(1000, 0) == 0, 2);
}
