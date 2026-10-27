# stratTrack v0.2 (app/)

Real Next.js app for stratTrack. The original Vite prototype is still at the repo root and runs separately.

## Setup

1. `cd app && npm install --legacy-peer-deps` (the default install crashes on this toolchain).
2. `cp .env.example .env.local` and fill in what you have. Empty keys fall back to mock mode.
3. Apply the schema: `supabase/migrations/0001_init.sql` (via the Supabase SQL editor or `supabase db push`).
4. Seed: `npx tsx scripts/seed.ts`. Fixtures and odds seed without any extra setup. Strategy rows are only inserted when `SEED_OWNER_ID` is set to a real auth user id.
5. Dev: `npm run dev`. Build: `npm run build`. Tests: `npx vitest run`.

## Env vars

- NEXT_PUBLIC_SUPABASE_URL: Supabase project URL.
- NEXT_PUBLIC_SUPABASE_ANON_KEY: Supabase anon key (client and RLS-scoped server reads).
- SUPABASE_URL: server URL, falls back to the public one.
- SUPABASE_SERVICE_ROLE_KEY: service role, used by cron, results and seed jobs only. Never expose it to the browser.
- ODDS_API_KEY: the-odds-api key. Without it, the odds cron serves deterministic mock EPL data.
- CRON_SECRET: bearer secret that protects /api/cron/odds and /api/results.
- SEED_OWNER_ID: auth user id that owns the seeded sample strategies.
- MEMWAL_ACCOUNT_ID, MEMWAL_PRIVATE_KEY: Walrus Memory account (mainnet relayer https://relayer.memory.walrus.xyz, set explicitly). Without them, credibility memories are logged in mock mode and nothing is written.
- NEXT_PUBLIC_TATUM_RPC_URL, TATUM_API_KEY: Tatum RPC for Sui wallet reads. Stub without keys.
- NEXT_PUBLIC_SUI_NETWORK: mainnet or testnet, default testnet.

## Cron budget

The odds cron runs every 2 hours: 12 calls per day, about 360 per month, under the 500 free credits on the-odds-api (regions=uk, markets=h2h, soccer_epl).

## What's real vs mocked

Real and working now:
- Rules engine (`src/lib/rules/engine.ts`): market filter (match_winner, over_under, btts), odds range, home/away and favorite/underdog conditions, odds drift %. Pure functions, 13 unit tests.
- Track stats and settlement (`src/lib/track/`): won/lost/push per market, winrate, streak and edge. 6 unit tests.
- Booking export format (`src/lib/booking/export.ts`): SportyBet and Bet9ja deep-link builders.
- Supabase schema with a DB trigger that blocks picks logged after kickoff. Server-side `assertLoggable` enforces the same rule.
- Odds ingestion code path: snapshot averaging and upserts, ready for the real API.
- Next.js routes, auth callback, and the App Router pages.

Mocked until keys arrive:
- Odds: without ODDS_API_KEY, the cron serves the fixtures in `src/lib/mock/epl.ts`. The two fixtures are Arsenal vs Chelsea and Man City vs Liverpool.
- Booking codes: `mockBookingCode` is a deterministic LCG, not a real operator code. Real SportyBet and Bet9ja codes need the operators' own flows.
- Memwal credibility writes: mock mode logs only.
- Sui wallet connect: stub button, no adapter wired.
- Auth providers: Google OAuth and magic link work once the Supabase project keys are set. Without them, the panel stays in mock mode.

Not done: a full UI for the strategy builder, live Tatum reads, production deployment.

## Known caveats

- Node 20 here. Several deps want Node 22 and print EBADENGINE warnings; the build still passes.
- The shell in this environment blocks some write patterns, so files were written individually.
