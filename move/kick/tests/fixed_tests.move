// Runs with `sui move test` only.
#[test_only]
module kick::fixed_tests;

use kick::fixed;

#[test]
fun seventy_six_percent_pays_1276_with_the_margin() {
    // 1000 at 76%: 1000 x 0.97 / 0.76 = 1276
    assert!(fixed::payout_of(1000, 7600) == 1276, 0);
}

#[test]
fun fifty_percent_pays_1940_with_the_margin() {
    assert!(fixed::payout_of(1000, 5000) == 1940, 1);
}
