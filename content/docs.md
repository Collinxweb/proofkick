# ProofKick documentation

*Status: 9 November 2026. This page is updated as the product changes.*

## What ProofKick is

ProofKick is a football prediction record. You lock a call before kick-off. The call is saved to Walrus Memory as an encrypted snapshot, and a receipt is written to Sui, so the time and content can be checked later. Once locked, a call can't be edited. When the match finishes, the call is graded from match data. Your record is public, and anyone can check each call.

ProofKick also has **Kick Markets**, a practice layer where you stake play-money **KICK** on whether BTC, ETH or gold (PAXG) closes higher or lower than it opened.

**KICK has no real-world value.** It is testnet play money and can't be exchanged for money. Kick is for people aged 18 or over.

ProofKick is a record and a practice tool. It gives no betting, financial or investment advice, and past results don't predict future ones.

## Parts of the product

| Part | What it does | Status |
|---|---|---|
| Calls | Lock a single football pick before kick-off | Live |
| Multis | Combine picks into one ticket with combined odds | Live |
| Proofs | Each lock is saved to Walrus and timestamped on Sui, with a link to the receipt | Live. Proofs run in the background and can be retried |
| Grading | Results come from football-data.org. A multi settles when all its legs are final | Live. Demo matches are graded by hand |
| Record | Call hit rate, multi win rate, pending count and CLV, each with its sample size | Live |
| Share pages and cards | Every call and multi has a page, a card image with its Walrus blob and Sui receipt, and a Share button | Live |
| Record summary card | A card with your handle, your figures, and your 10 most recent locks, each with its Walrus blob ID, match, pick, odds and time | Live at /api/export/record-card. The Summary card button in Settings uses it once the change is applied |
| Club logos | Football-data.org crests, cached in storage | Live. One club, Rennes, is set by hand |
| Personal recall note | A private note on the call sheet from your own settled picks in the same market | Live for team wins, draws and multi legs |
| Kick Markets, pool rounds | Stake KICK on the direction of BTC, ETH or gold | Live on testnet |
| Kick Markets, fixed odds | A fixed payout at a quoted chance, with a 3% house margin | Live on testnet. Withdraw is built |
| Kick strategies | A rule that places a kick each round when it matches | Needs the database migration |
| Football strategies | Auto-picks that fire when a rule matches a fixture | Scheduled every 15 minutes |
| Wallet claim | Claim 10,000 KICK to your wallet, paying the gas yourself | Built. Being tested |
| Wallet-signed kicks | Kicking and withdrawing from the wallet | Not live. Planned |
| Football multi escrow | Stake held on-chain until settled | Planned. Not yet live |
| Feedback | Sends feedback to GitHub issues | Live |
| Support | Telegram team link | Live |

## Calls and proofs

1. You pick a match and a result (home, draw or away) and lock it.
2. The call is stored in the database first, so a slow network can't lose it.
3. The call is saved to Walrus Memory as an encrypted snapshot.
4. A Sui receipt records the snapshot's hash. The call's page links to it.
5. When the match finishes, the call is graded. A call that loses stays on your record. A void call is not counted.

A **call hit rate** counts won and lost calls. Multi legs count as calls. A **multi win rate** counts settled multis only. Pending calls are in neither.

## Personal recall note

When you're about to call a team to win, or a draw between two teams, ProofKick can show a private note based on your own settled picks in that market.

- **Team to win:** your picks where the same team won, at home or away.
- **Draw:** your picks where the same two teams drew, in either order.
- Multi legs count as picks, and the note says how many were included.
- The note appears only once you have at least three comparable settled picks.

The note is visible only to you. It doesn't change your call, and dismissing it changes nothing. It's a summary of your own record, not a forecast.

Example: "Your history: Arsenal to win, 2 wins from 4 settled picks from 2026-05-10 to 2026-10-18 (incl. 1 multi leg). Latest loss: 1-2 vs Brighton, 2026-10-18."

## Multis

- Add two or more selections. Each match shows only the selection you chose, and the slip bar shows the count. Tap it to see them all.
- Locking a multi locks every leg. If the lock fails, the message says which step failed.
- One losing leg loses the whole multi.
- Manual grading settles every multi that is now final, so a multi never stays pending after its legs have lost.

## Share cards and the record card

- **Call and multi cards** show the match or slip, the result once graded, the club logos, and a proof line with the Walrus blob ID and the Sui receipt.
- **Kick cards** show the pick, the prices, the result and payout, and the Walrus blob and receipt for the kick.
- **The record summary card** (Settings → Summary card) lists your 10 most recent locks. Each row shows its Walrus blob ID as the headline, then the match, pick and odds, the UTC lock time, and whether a Sui receipt exists.

## Kick Markets: pool rounds

- Each market has a 24-hour round that opens at 12:00 UTC and takes entries until 18:00 UTC. It settles 24 hours after it opens.
- Weekly rounds take entries until the last 24 hours before they close.
- Each side's stakes form a pool. Winners share the other side's pool in proportion to their stake.
- **One-sided round:** if everyone stakes the same side, there is nothing to pay winners from, so the round is refunded in full.
- **Tie:** if the closing price equals the opening price, the round is refunded in full.
- The **potential payout** shown is an estimate. It changes as others join. If nobody is on the other side, it equals your stake.

### Settlement

- Settlement runs in batches. Several expired rounds are settled in one on-chain transaction, oldest first.
- If a batch fails, each round in it is retried on its own, so one bad round can't block the rest.
- Each settled round gets a mainnet record, written after the on-chain settlement.

### Refunds and withdrawing

Your stake stays held by the round until you withdraw. Your balance only goes up when you press Withdraw.

1. Open **My Kicks**. A notice above the tabs shows how many kicks are ready to withdraw.
2. Press **Withdraw** on the kick.
3. The stake, plus any winnings, returns to your testnet balance.

The Settled tab shows the reason for each refund, and the return figure leaves refunds out.

## Kick Markets: fixed odds

- The chance is taken from the momentum reading at the moment you kick. GREEN uses the up reading, and RED the down reading.
- The server signs the quote, valid for about 50 seconds. The chance and payout can't be changed afterwards.
- Payout = stake × 0.97 ÷ chance. At a 76% chance, 1000 KICK pays 1276.
- The house mints only the top-up above your stake when your side wins, up to a cap per round (default 5000 KICK).
- Entries close 5 minutes before the round expires.
- Settlement compares the closing price with the opening price, in the same units the contract uses. A tie refunds all stakes.
- Withdraw a settled fixed kick from My Kicks.
- Fixed rounds are kept apart from pool rounds by an `F-` prefix in their IDs.

## Accounts, wallets and claiming

- **Testnet account:** each user has a Kick account the server creates. Claim KICK there with the claim button. No wallet is needed.
- **Claim to wallet:** on the claim page, connect your wallet on the testnet network and claim 10,000 KICK to it. Your wallet pays the small SUI gas fee, and the app doesn't sponsor it.
- **Moving wallet KICK:** the claim page shows your app account address with a copy button. Send KICK from your wallet to that address to use it on the markets.
- **Wallet-signed kicks** are not live yet. Until they are, the app account is the one that can kick.
- Each user's claim is limited to one per address, and the contract enforces it.

## Scheduled jobs

The Kick system runs as separate steps. Each step is its own request with its own time budget and its own lock, so a slow step doesn't stop the others.

| Step | What it does | How often |
|---|---|---|
| settle | Settles expired pool rounds, oldest first, in batches | Every 5 minutes |
| open | Opens pool rounds that are due | Every 5 minutes |
| fixed | Settles expired fixed-odds rounds, then opens due ones | Every 5 minutes |
| records | Writes any missing mainnet records | Every 10 minutes |
| status | Read-only: shows what is due and what is open | When needed |

A lock stops two runs of the same step overlapping. It clears itself after two minutes if a run is cut off.

Football triggers run every 15 minutes, separately from the Kick steps.

## Kick strategies

A strategy is a rule with a market, a round length, a threshold and a stake per round. It places one kick per round when its rule matches and entries are open. A strategy kicks at most once per round.

Thresholds are starting points and have not been back-tested. A strategy can lose its whole stake each round.

## Football strategies

A football strategy creates a pick when its rule matches a fixture. The job runs every 15 minutes and skips any fixture that already has a pick. A run that finds no matches creates nothing, which is expected.

## Accounts and keys

- **Account wallet:** the Sui testnet wallet that owns the admin objects. Its key lives only on the server and in GitHub secrets.
- **Quote key:** signs fixed-odds quotes. Its public half is registered on-chain.
- Keys never appear in the app, in logs, or in chat. The admin check route returns only the address the key controls.

## Known limits

- Wallet-signed kicks and withdrawals are not live yet.
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
- **Refunds:** the Settled tab explains refunds, and the return figure leaves them out.
- **Settlement:** batched on-chain settlement, with per-round retry.
- **Scheduling:** separate Kick steps with their own budgets and locks, and a read-only status step.
- **Proof on cards:** the Walrus blob and Sui receipt appear on call, multi and Kick cards.
- **Record summary card:** the 10 most recent locks, with blob IDs, timestamps and what each lock was.
- **Recall note:** private note from your own settled picks, for team wins, draws and multi legs.
- **Wallet claim:** claim to your wallet, paying your own gas.
- **Claim page:** shows the app account and wallet balances, with a copy button and the steps to move KICK.
- **Docs:** this page lives inside the app at `/docs`.

## Contact

Telegram: t.me/C0llinXweb3
