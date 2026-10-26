# ProofKick
Football predictions with verifiable records.

## Setup
1. `npm install`, copy `.env.example` to `.env.local`, fill in Supabase keys.
2. Supabase SQL editor: run `db/001_schema.sql`, then `db/002_auth.sql`.
3. Supabase Auth: enable Google; add `<site>/auth/callback` to redirect URLs.
4. `npm run dev`.

## Status
Done: onboarding, Google + email magic link auth, caution gate, Terms, Privacy, schema.
Next: fixtures/odds sync, dashboard, picks, strategies, booking cards, Walrus, Sui anchor, Sui wallet login.
