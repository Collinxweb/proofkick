# KICK (testnet) and Kick rounds

Testnet only. KICK is play money with no value. Nothing here is deployed to mainnet.

- `kick_token`: the KICK coin (6 decimals). A shared `Faucet` holds the TreasuryCap. `claim` gives 10,000 KICK, once per wallet.
- `rounds`: two-sided pools per round. `open_round`, `kick`, `settle_round`, `redeem`.

## Trust model
- Admin (AdminCap) opens and settles rounds, using price prints from the public price source.
- Contract checks: no kicks outside the entry window, no settling before expiry, no direction that contradicts the recorded prices, no winner on a one-sided pool.
- Admin can void (everyone is refunded). Admin cannot withdraw pool money: redeem pays only the holder's own stake.
- Settlement is admin-signed on testnet. The receipts make it verifiable, not trustless.

## Build and test
- Compile and publish through the GitHub workflow `publish-kick-testnet` (uses the secret `KICK_DEPLOYER_KEY`).
- `sui move test` runs the tests in `tests/`.
