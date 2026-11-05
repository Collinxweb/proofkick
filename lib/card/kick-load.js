import { supabaseAdmin } from "@/lib/supabase/admin";

const ASSET = { BTC: "BITCOIN", ETH: "ETHEREUM", PAXG: "GOLD (PAXG)" };
const PAIR = { BTC: "BTC", ETH: "ETH", PAXG: "XAU" };
const dt = (iso) => new Date(iso).toISOString().slice(11, 16) + " UTC";

// One kick as a card: the pick, entry and settlement prices, the result and the payout. Testnet play money, labelled as such.
export async function loadKickCard(entryId) {
  const db = supabaseAdmin();
  const { data: e } = await db.from("kick_entries").select("id, user_id, side, stake, status, payout, entry_price, kick_testnet_tx, kick_digest, created_at, kick_rounds(asset, horizon, state, outcome, expires_at, close_price, open_price)").eq("id", entryId).maybeSingle();
  if (!e?.kick_rounds) return null;
  const { data: prof } = await db.from("profiles").select("handle, avatar_url").eq("id", e.user_id).maybeSingle();
  const r = e.kick_rounds;
  const stake = Number(e.stake);
  const payout = e.payout != null ? Number(e.payout) : null;
  const net = payout != null ? payout - stake : null;
  const settled = e.status === "won" || e.status === "lost" || e.status === "refunded";
  const pick = e.side === "long" ? "GREEN" : "RED";
  const status = settled ? (e.status === "won" ? "SETTLED · WON" : e.status === "lost" ? "SETTLED · LOST" : "REFUNDED") : "OPEN";
  return {
    entryId: e.id, handle: prof?.handle ?? "user", avatarUrl: prof?.avatar_url ?? null,
    asset: r.asset, horizon: r.horizon, title: `${PAIR[r.asset] ?? r.asset} / ${r.horizon} ROUND`, coinName: ASSET[r.asset] ?? r.asset,
    pick, stake, status, outcomeWord: e.status === "won" ? "WON" : e.status === "lost" ? "LOST" : e.status === "refunded" ? "REFUNDED" : "PENDING",
    entryPrice: e.entry_price != null ? Number(e.entry_price) : null,
    settlementPrice: r.close_price != null ? Number(r.close_price) : null,
    roundClose: dt(r.expires_at), countdown: settled ? null : countdown(r.expires_at),
    payout, net, returnPct: net != null && stake > 0 ? (net / stake) * 100 : null,
    recordId: `#PK-${e.created_at.slice(0, 10).replace(/-/g, "")}-${e.id.slice(0, 4).toUpperCase()}`,
    testnetTx: e.kick_testnet_tx, mainnetDigest: e.kick_digest,
  };
}

function countdown(iso) {
  const s = Math.max(0, Math.floor((Date.parse(iso) - Date.now()) / 1000));
  const p = (x) => String(x).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}
