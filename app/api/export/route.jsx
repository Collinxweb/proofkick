import { ImageResponse } from "next/og";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadSlips } from "@/lib/social/data";
import { computeRecord } from "@/lib/proof/record";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const cell = (v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const SUI = (d) => (d ? `https://suiscan.xyz/mainnet/tx/${d}` : "");
const TESTNET = (d) => (d ? `https://suiscan.xyz/testnet/tx/${d}` : "");

// GET /api/export?format=csv  -> the full record: every call, multi leg and kick, with every transaction link.
// GET /api/export?format=card -> a summary card (PNG) with the headline numbers.
export async function GET(req) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return new Response("Sign in to export your record.", { status: 401 });
  const db = supabaseAdmin();
  const format = new URL(req.url).searchParams.get("format") === "card" ? "card" : "csv";
  const { data: prof } = await db.from("profiles").select("handle").eq("id", user.id).maybeSingle();
  const { data: picks } = await db.from("picks").select("id, selection, odds_taken, status, locked_at, final_home, final_away, memory_blob_id, anchor_digest, source, reasoning, fixtures(home_team, away_team, kickoff_at, league)").eq("user_id", user.id).order("locked_at", { ascending: true });
  const slips = await loadSlips(db, (picks ?? []).map((p) => p.id));
  const slipOf = {};
  for (const s of slips) for (const l of s.legs) slipOf[l.pick.id] = { id: s.id, kind: s.kind, status: s.status, stake: s.stake, payout: s.grossPayout };
  const { data: kicks } = await db.from("kick_entries").select("id, side, stake, status, payout, created_at, kick_testnet_tx, kick_digest, kick_snapshot_blob, payout_testnet_tx, kick_rounds(asset, horizon, outcome, state)").eq("user_id", user.id).order("created_at", { ascending: true });

  if (format === "card") {
    const rec = computeRecord((picks ?? []).map((p) => ({ result: p.status, odds_taken: p.odds_taken, graded_at: p.locked_at })));
    const settled = (kicks ?? []).filter((k) => k.status === "won" || k.status === "lost" || k.status === "refunded");
    const net = settled.reduce((a, k) => a + (Number(k.payout ?? 0) - Number(k.stake)), 0);
    const hit = rec.winrate == null ? "—" : `${(rec.winrate * 100).toFixed(1)}%`;
    const stats = [["CALLS", String((picks ?? []).length)], ["HIT RATE", hit], ["GRADED", String(rec.graded)], ["KICKS", String((kicks ?? []).length)]];
    return new ImageResponse((
      <div style={{ display: "flex", flexDirection: "column", width: 1080, height: 1080, padding: 64, background: "radial-gradient(circle at 90% 0%, #0f4a31 0%, #07090a 60%)", color: "#fff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 48, fontWeight: 700 }}>ProofKick<span style={{ fontSize: 22, color: "#19d36b", alignSelf: "center" }}>MY RECORD</span></div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 60, fontWeight: 700 }}>{`@${prof?.handle ?? "user"}`}</div>
        <div style={{ display: "flex", flexWrap: "wrap", marginTop: 36 }}>
          {stats.map(([k, v]) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", width: 440, margin: 10, padding: 28, borderRadius: 24, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", fontSize: 20, letterSpacing: 3, color: "rgba(255,255,255,0.6)" }}>{k}</div>
              <div style={{ display: "flex", fontSize: 58, fontWeight: 700, color: "#19d36b" }}>{v}</div>
            </div>))}
        </div>
        <div style={{ display: "flex", marginTop: 30, fontSize: 26, color: "rgba(255,255,255,0.75)" }}>{`Testnet kicks: ${settled.length} settled · net ${net.toFixed(2)} KICK (play money)`}</div>
        <div style={{ display: "flex", marginTop: "auto", fontSize: 22, color: "rgba(255,255,255,0.55)" }}>{`Exported ${new Date().toISOString().slice(0, 10)} · every call is timestamped on Sui · full record in the CSV`}</div>
      </div>
    ), { width: 1080, height: 1080 });
  }

  // Every row is built by column name, then written in header order, so values always sit under the right heading.
  const COLS = ["type", "slip_id", "slip_status", "stake", "league", "home", "away", "kickoff_utc", "selection", "odds", "call_status", "final_score", "locked_utc", "walrus_blob", "sui_timestamp_tx", "sui_timestamp_url", "kick_round", "kick_side", "kick_stake_KICK", "kick_status", "kick_payout_KICK", "kick_testnet_tx", "kick_mainnet_receipt", "kick_withdraw_tx"];
  const rows = [COLS];
  const write = (obj) => COLS.map((c) => (obj[c] === undefined || obj[c] === null ? "" : obj[c]));
  for (const p of picks ?? []) {
    const s = slipOf[p.id];
    const multi = s?.kind === "multi";
    rows.push(write({
      type: multi ? "multi_leg" : "call", slip_id: multi ? s.id : "", slip_status: multi ? s.status : "", stake: multi ? (s.stake ?? "") : "",
      league: p.fixtures?.league, home: p.fixtures?.home_team, away: p.fixtures?.away_team, kickoff_utc: p.fixtures?.kickoff_at,
      selection: p.selection, odds: Number(p.odds_taken).toFixed(2), call_status: p.status,
      final_score: p.final_home != null ? `${p.final_home}-${p.final_away}` : "", locked_utc: p.locked_at,
      walrus_blob: p.memory_blob_id, sui_timestamp_tx: p.anchor_digest, sui_timestamp_url: SUI(p.anchor_digest),
    }));
  }
  for (const k of kicks ?? []) {
    rows.push(write({
      type: "kick", kick_round: `${k.kick_rounds?.asset ?? ""} ${k.kick_rounds?.horizon ?? ""}`, kick_side: k.side,
      kick_stake_KICK: Number(k.stake), kick_status: k.status, kick_payout_KICK: k.payout != null ? Number(k.payout) : "",
      kick_testnet_tx: TESTNET(k.kick_testnet_tx), kick_mainnet_receipt: SUI(k.kick_digest), kick_withdraw_tx: TESTNET(k.payout_testnet_tx),
      locked_utc: k.created_at,
    }));
  }
  const csv = rows.map((r) => r.map(cell).join(",")).join("\n");
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="proofkick-record-${prof?.handle ?? "me"}.csv"` } });
}
