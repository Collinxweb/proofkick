import { ImageResponse } from "next/og";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { computeRecord } from "@/lib/proof/record";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const G = "#19d36b";
const flex = (x) => ({ display: "flex", ...x });
const shortId = (x) => (x ? `${String(x).slice(0, 12)}…${String(x).slice(-8)}` : "proof pending");
const stamp = (iso) => new Date(iso).toISOString().slice(0, 16).replace("T", " ") + " UTC";
const PICK = (p) => (p.selection === "home" ? p.fixtures?.home_team : p.selection === "away" ? p.fixtures?.away_team : "Draw");

// The signed-in user's record. The 10 most recent locks are listed by Walrus blob ID, with the match, pick and time under it.
export async function GET() {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return new Response("Sign in first.", { status: 401 });
  const db = supabaseAdmin();

  const { data: picks } = await db.from("picks")
    .select("status, odds_taken, locked_at, memory_blob_id, anchor_digest, selection, fixtures(home_team, away_team)")
    .eq("user_id", user.id).order("locked_at", { ascending: false }).limit(500);
  const { data: prof } = await db.from("profiles").select("handle").eq("id", user.id).maybeSingle();
  const { data: kicks } = await db.from("kick_entries").select("status").eq("user_id", user.id);

  const rows = picks ?? [];
  const won = rows.filter((r) => r.status === "won").length;
  const lost = rows.filter((r) => r.status === "lost").length;
  const hit = won + lost ? `${((won / (won + lost)) * 100).toFixed(1)}%` : "—";
  const kickRows = kicks ?? [];
  const kickSettled = kickRows.filter((k) => ["won", "lost", "refunded"].includes(k.status)).length;
  const recent = rows.slice(0, 10);
  const handle = prof?.handle ?? "tipster";

  return new ImageResponse(
    (
      <div style={flex({ flexDirection: "column", width: 1080, height: 1350, padding: 52, background: "radial-gradient(circle at 90% 0%, #0f4a31 0%, #07090a 60%)", color: "#fff", fontFamily: "sans-serif" })}>
        <div style={flex({ alignItems: "center", justifyContent: "space-between" })}>
          <div style={flex({ fontSize: 46, fontWeight: 700 })}>Proof<span style={{ color: G }}>Kick</span></div>
          <div style={flex({ fontSize: 20, color: G, letterSpacing: 3 })}>MY RECORD</div>
        </div>
        <div style={flex({ fontSize: 48, fontWeight: 700, marginTop: 18 })}>{`@${handle}`}</div>

        <div style={flex({ marginTop: 18 })}>
          {[["CALLS", String(rows.length)], ["HIT RATE", hit], ["GRADED", String(won + lost)], ["KICKS", String(kickRows.length)]].map(([k, v]) => (
            <div key={k} style={flex({ flexDirection: "column", flex: 1, marginRight: 12, padding: "12px 16px", borderRadius: 18, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(8,14,12,0.85)" })}>
              <div style={flex({ fontSize: 16, letterSpacing: 2, color: "rgba(255,255,255,0.55)" })}>{k}</div>
              <div style={flex({ fontSize: 34, fontWeight: 700, color: G, marginTop: 4 })}>{v}</div>
            </div>))}
        </div>

        <div style={flex({ flexDirection: "column", marginTop: 20, padding: 18, borderRadius: 24, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(8,14,12,0.85)" })}>
          <div style={flex({ fontSize: 18, letterSpacing: 3, color: "rgba(255,255,255,0.7)" })}>RECENT 10 LOCKS · WALRUS BLOB IDS</div>
          <div style={flex({ fontSize: 15, color: "rgba(255,255,255,0.55)", marginTop: 4 })}>Each lock is saved to Walrus Memory and timestamped on Sui.</div>
          {recent.length ? recent.map((r, i) => (
            <div key={i} style={flex({ flexDirection: "column", marginTop: 8, padding: "8px 12px", borderRadius: 12, background: "rgba(255,255,255,0.04)" })}>
              <div style={flex({ alignItems: "center", justifyContent: "space-between" })}>
                <div style={flex({ fontSize: 21, fontWeight: 700 })}>{shortId(r.memory_blob_id)}</div>
                <div style={flex({ fontSize: 15, color: "rgba(255,255,255,0.6)" })}>{stamp(r.locked_at)}</div>
              </div>
              <div style={flex({ alignItems: "center", justifyContent: "space-between", marginTop: 3 })}>
                <div style={flex({ fontSize: 16, color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap", overflow: "hidden", flex: 1 })}>
                  {`${r.fixtures?.home_team ?? "?"} vs ${r.fixtures?.away_team ?? "?"} · ${PICK(r) ?? "?"} @ ${Number(r.odds_taken).toFixed(2)}`}
                </div>
                <div style={flex({ fontSize: 15, marginLeft: 12, color: r.anchor_digest ? G : "rgba(255,255,255,0.4)" })}>{r.anchor_digest ? "Sui: yes" : "Sui: none"}</div>
              </div>
            </div>)) : <div style={flex({ fontSize: 20, color: "rgba(255,255,255,0.6)", marginTop: 12 })}>No locks yet.</div>}
        </div>

        <div style={flex({ fontSize: 20, color: "rgba(255,255,255,0.75)", marginTop: 16 })}>{`Testnet kicks: ${kickSettled} settled of ${kickRows.length} · play money`}</div>
        <div style={flex({ marginTop: "auto", fontSize: 16, color: "rgba(255,255,255,0.5)" })}>{`Exported ${new Date().toISOString().slice(0, 10)} · every call is timestamped on Sui · full record in the CSV`}</div>
      </div>
    ),
    { width: 1080, height: 1350 },
  );
}
