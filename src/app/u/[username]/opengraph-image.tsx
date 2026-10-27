import { ImageResponse } from "next/og";
import { supabaseAdmin } from "../../../lib/supabase/server";
import { computeTrackStats } from "../../../lib/track/stats";

export const alt = "proofkick statement";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

// Share card. Numbers come from the same stats function as the page. If the record source is not
// configured, the card says unverified and shows no numbers.
export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  let line = "unverified: record source not connected";
  const db = supabaseAdmin();
  if (db) {
    const { data: profile } = await db.from("profiles").select("id").eq("username", username).maybeSingle();
    if (profile) {
      const { data: rows } = await db
        .from("picks")
        .select("id, selection, market, odds_at_log, result, settled_at, strategies!inner(user_id)")
        .eq("strategies.user_id", profile.id);
      const s = computeTrackStats(
        (rows ?? []).map((p: any) => ({ id: p.id, selection: p.selection, market: p.market, oddsAtLog: Number(p.odds_at_log), result: p.result, settledAt: p.settled_at }))
      );
      line = `${s.won}W ${s.lost}L · ${s.winRate === null ? "n/a" : `${(s.winRate * 100).toFixed(1)}%`} win rate · ${s.settled} settled`;
    }
  }
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", background: "#09090b", color: "#f4f4f5", padding: 80 }}>
        <div style={{ fontSize: 56, fontWeight: 700 }}>@{username}</div>
        <div style={{ fontSize: 36, marginTop: 24 }}>{line}</div>
        <div style={{ fontSize: 24, marginTop: 40, color: "#a1a1aa" }}>proofkick.app/u/{username}</div>
      </div>
    ),
    { ...size }
  );
}
