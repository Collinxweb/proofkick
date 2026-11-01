import { ImageResponse } from "next/og";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { computeRecord } from "@/lib/proof/record";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "ProofKick record";

const G = "#19d36b";
const f = (extra) => ({ display: "flex", ...extra });
const LABEL = { home: "Home Win", draw: "Draw", away: "Away Win" };

// Link preview for WhatsApp, Telegram and X: hit rate, streak and best graded calls, straight from the graded record.
export default async function Image({ params }) {
  const db = supabaseAdmin();
  const { data: prof } = await db.from("profiles").select("id, handle").eq("handle", params.handle).maybeSingle();
  const { data: rows } = prof ? await db.from("picks").select("status, odds_taken, graded_at, anchor_object_id, selection, fixtures(home_team, away_team)").eq("user_id", prof.id).order("graded_at", { ascending: false, nullsFirst: false }).limit(300) : { data: [] };
  const list = rows ?? [];
  const rec = computeRecord(list.map((r) => ({ result: r.status, odds_taken: r.odds_taken, graded_at: r.graded_at })));
  const best = list.filter((r) => r.status === "won").sort((a, b) => Number(b.odds_taken) - Number(a.odds_taken)).slice(0, 3);
  const anchored = list.filter((r) => r.anchor_object_id).length;
  const stats = [["HIT RATE", rec.winrate == null ? "—" : `${(rec.winrate * 100).toFixed(0)}%`], ["STREAK", rec.streak.type ? `${rec.streak.n}${rec.streak.type}` : "—"], ["GRADED", `${rec.graded}`]];
  return new ImageResponse((
    <div style={f({ flexDirection: "column", width: 1200, height: 630, padding: 56, background: "radial-gradient(circle at 90% 0%, #0f4a31 0%, #07090a 60%)", color: "#fff", fontFamily: "sans-serif" })}>
      <div style={f({ justifyContent: "space-between", alignItems: "center" })}>
        <div style={f({ fontSize: 44, fontWeight: 700 })}>Proof<span style={{ color: G }}>Kick</span></div>
        <div style={f({ fontSize: 22, color: G, letterSpacing: 3 })}>NOBODY CAN FAKE THEIR RECORD</div>
      </div>
      <div style={f({ marginTop: 34, fontSize: 64, fontWeight: 700 })}>{`@${prof?.handle ?? params.handle}`}</div>
      <div style={f({ marginTop: 24 })}>
        {stats.map(([k, v]) => (
          <div key={k} style={f({ flexDirection: "column", marginRight: 28, padding: "18px 30px", borderRadius: 24, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.05)" })}>
            <div style={f({ fontSize: 20, letterSpacing: 3, color: "rgba(255,255,255,0.6)" })}>{k}</div>
            <div style={f({ fontSize: 56, fontWeight: 700, color: G })}>{v}</div>
          </div>))}
      </div>
      <div style={f({ marginTop: 26, fontSize: 22, letterSpacing: 3, color: "rgba(255,255,255,0.6)" })}>BEST GRADED CALLS</div>
      <div style={f({ flexDirection: "column", marginTop: 8 })}>
        {best.length ? best.map((b, i) => (
          <div key={i} style={f({ fontSize: 28, marginTop: 6 })}>{`${b.fixtures?.home_team} vs ${b.fixtures?.away_team}  •  ${LABEL[b.selection]} @ ${Number(b.odds_taken).toFixed(2)}`}</div>))
          : <div style={f({ fontSize: 26, color: "rgba(255,255,255,0.5)", marginTop: 6 })}>No graded wins yet</div>}
      </div>
      <div style={f({ marginTop: "auto", fontSize: 22, color: "rgba(255,255,255,0.6)" })}>{`${anchored} call${anchored === 1 ? "" : "s"} timestamped on Sui, saved on Walrus before kick-off`}</div>
    </div>
  ), { ...size });
}
