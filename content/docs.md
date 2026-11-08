# ProofKick documentation

*Status: 8 November 2026. This page is updated as the product changes.*

## What ProofKick is

ProofKick is a football prediction record. You lock a call before kick-off. The call is saved to Walrus Memory and timestamped on Sui, so it can't be edited afterwards. When the match finishes, the result is graded from match data. Your record is public, and anyone can check it.

ProofKick also has **Kick Markets**, a practice layer where you stake play-money **KICK** on whether the price of BTC, ETH or gold (PAXG) closes higher or lower than it opened.

**KICK has no real-world value.** It is testnet play money and cannot be exchanged for money. Kick is for people aged 18 or over.

ProofKick is a record and a practice tool. It gives no betting, financial or investment advice, and past results don't predict future ones.

## Parts of the product

| Part | What it does | Status |
|---|---|---|
| Calls | Lock a single football pick before kick-off | Live |
| Multis | Combine picks into one ticket with combined odds | Live |
| Proofs | Each lock is saved to Walrus and timestamped on Sui, with a link to the transaction | Live. Proofs run in the background and can be retried |
| Grading | Results come from football-data.org. A multi settles when all its legs are final | Live. Demo matches are graded by hand |
| Record | Call hit rate, multi win rate, pending count and CLV, each with its sample size | Live |
| Share pages and cards | Every call and multi has a page, a card image and a Share button | Live |
| Club logos | Football-data.org crests, cached in storage | Live. One club, Rennes, is set by hand |
| Personal recall note | A private note on the call sheet from your own settled picks in the same market | Built for team wins, draws and multi legs |
| Kick Markets, pool rounds | Stake KICK on the direction of BTC, ETH or gold | Live on testnet |
| Kick Markets, fixed odds | A fixed payout at a quoted chance, with a 3% house margin | Live on testnet. Withdraw is built |
| Kick strategies | A rule that places a kick each round when it matches | Needs the database migration |
| Football strategies | Auto-picks that fire when a rule matches a fixture | Scheduled every 15 minutes |
| Football multi escrow | Stake held on-chain until settled | Planned. Not yet live |
| Feedback | Sends feedback to GitHub issues | Live |
| Support | Telegram team link | Live |

## Calls and proofs

1. You pick a match and a result (home, draw or away) and lock it.
2. The call is stored in the database first, so a slow network can't lose it.
3. The call is saved to Walrus Memory as an encrypted snapshot.
4. A Sui receipt records the snapshot's hash on mainnet. The call's page links to that transaction.
5. When the match finishes, the call is graded. A call that loses stays on your record. A void call is not counted.

A **call hit rate** counts won and lost calls. Multi legs count as calls. A **multi win rate** counts settled multis only. Pending calls are in neither.

## Multis

- Add two or more selections. Each match shows only the selection you chose, and the slip bar shows the count. Tap it to see them all.
- Locking a multi locks every leg. If the lock fails, the message says which step failed.
- One losing leg loses the whole multi.
- Manual grading settles every multi that is now final, so a multi never stays pending after its legs have lost.

## Kick Markets: pool rounds

- Each market has a 24-hour round starting at 12:00 UTC. Entries close at 18:00 UTC.
- Weekly rounds take entries until the last 24 hours before they close.
- Each side's stakes form a pool. Winners share the other side's pool in proportion to their stake.
- **One-sided round:** if everyone stakes the same side, there is nothing to pay winners from, so the round is refunded in full.
- **Tie:** if the closing price equals the opening price, the round is refunded in full.
- The **potential payout** shown is an estimate. It changes as others join. If nobody is on the other side, it equals your stake.

### Refunds and withdrawing

A refunded round shows the reason on the Settled tab. The stake is still held by the round until you withdraw.

1. Open **My Kicks**.
2. Press **Withdraw** on the refunded kick.
3. The stake returns to your testnet balance.

Winnings are withdrawn the same way, and the amount paid appears on the kick.

## Kick Markets: fixed odds

- The chance is taken from the momentum reading at the moment you kick. GREEN uses the up reading, and RED uses the down reading.
- The server signs the quote, valid for about 50 seconds. The chance and payout can't be changed afterwards.
- Payout = stake × 0.97 ÷ chance. At a 76% chance, 1000 KICK pays 1276.
- The house mints only the top-up above your stake when your side wins, up to a cap per round (default 5000 KICK).
- Entries close 5 minutes before the round expires.
- Settlement compares the closing price with the opening price. A tie refunds all stakes.
- Withdraw a settled fixed kick from My Kicks.

## Kick strategies

A strategy is a rule with a market, a round length, a threshold and a stake per round. It places one kick per round when its rule matches and entries are open. A strategy kicks at most once per round.

Thresholds are starting points and have not been back-tested. A strategy can lose its whole stake each round.

## Football strategies

A football strategy creates a pick when its rule matches a fixture. The job runs every 15 minutes and skips any fixture that already has a pick. A job that finds no matches creates nothing, which is expected.

## Scheduled jobs

- **Kick job:** every 5 minutes. It settles expired pool rounds (oldest first), opens new rounds on schedule, then writes mainnet records with the time left. A lock stops two runs overlapping.
- **Fixed-odds job:** once a day at 12:06 UTC. It settles yesterday's fixed rounds, then opens today's.
- **Football triggers:** every 15 minutes.

## Accounts and keys

- **Account wallet:** the Sui testnet wallet that owns the admin objects. Its key lives only on the server and in GitHub secrets.
- **Testnet account:** each user's Kick account, created by the server. Claim KICK there with the claim button. No wallet is needed.
- **Quote key:** signs fixed-odds quotes. Its public half is registered on-chain.
- Keys never appear in the app, in logs, or in chat. The admin check route returns only the address.

## Known limits

- Wallet claims are not available. Use the claim button.
- The momentum chance is an indicator. It has not been tested against real outcomes.
- A kick can lose its whole stake.
- Football multi escrow is not live, so multi stakes are records, not held funds.
- Terms will be finalised before any real-value use.

## Changelog

- **Pivot:** ProofKick became a reputation record, not a betting tool.
- **Records:** calls, multis, proofs, grading, share pages and cards.
- **Kick:** 12:00 UTC round schedule, unique round IDs, checked writes, per-round settlement.
- **Kick redesign:** new Kick page and My Kick Calls with record figures.
- **Logos:** club crests cached in storage.
- **Fixed odds:** placement, daily open and settle, and withdrawals.
- **Refund reasons:** Settled tab explains refunds, and the return figure ignores refunds.
- **Scheduling:** the Kick job runs every 5 minutes with a lock, and settles oldest rounds first.
- **Docs:** this page lives inside the app at `/docs`.

## Contact

Telegram: t.me/C0llinXweb3
