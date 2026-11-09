import { ImageResponse } from "next/og";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { computeRecord } from "@/lib/proof/record";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const G = "#19d36b";
const flex = (x) => ({ display: "flex", ...x });
const shortId = (x) => (x ? `${String(x).slice(0, 12)}…${String(x).slice(-8)}` : null);
const stamp = (iso) => new Date(iso).toISOString().slice(0, 16).replace("T", " ") + " UTC";
const PICK = (p) => (p.selection === "home" ? p.fixtures?.home_team : p.selection === "away" ? p.fixtures?.away_team : "Draw");

// The signed-in user's record, with their 10 most recent locks: what was locked, its Walrus blob ID, and when.
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
      <div style={flex({ flexDirection: "column", width: 1080, height: 1350, padding: 56, background: "radial-gradient(circle at 90% 0%, #0f4a31 0%, #07090a 60%)", color: "#fff", fontFamily: "sans-serif" })}>
        <div style={flex({ alignItems: "center", justifyContent: "space-between" })}>
          <div style={flex({ fontSize: 50, fontWeight: 700 })}>Proof<span style={{ color: G }}>Kick</span></div>
          <div style={flex({ fontSize: 22, color: G, letterSpacing: 3 })}>MY RECORD</div>
        </div>
        <div style={flex({ fontSize: 56, fontWeight: 700, marginTop: 28 })}>{`@${handle}`}</div>

        <div style={flex({ marginTop: 26 })}>
          {[["CALLS", String(rows.length)], ["HIT RATE", hit], ["GRADED", String(won + lost)], ["KICKS", String(kickRows.length)]].map(([k, v]) => (
            <div key={k} style={flex({ flexDirection: "column", flex: 1, marginRight: 14, padding: 18, borderRadius: 22, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(8,14,12,0.85)" })}>
              <div style={flex({ fontSize: 18, letterSpacing: 2, color: "rgba(255,255,255,0.55)" })}>{k}</div>
              <div style={flex({ fontSize: 40, fontWeight: 700, color: G, marginTop: 6 })}>{v}</div>
            </div>))}
        </div>

        <div style={flex({ flexDirection: "column", marginTop: 26, padding: 22, borderRadius: 26, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(8,14,12,0.85)" })}>
          <div style={flex({ fontSize: 22, letterSpacing: 3, color: "rgba(255,255,255,0.7)" })}>RECENT 10 LOCKS</div>
          <div style={flex({ fontSize: 18, color: "rgba(255,255,255,0.55)", marginTop: 6 })}>Each lock is saved to Walrus Memory and timestamped on Sui.</div>
          {recent.length ? recent.map((r, i) => (
            <div key={i} style={flex({ flexDirection: "column", marginTop: 10, padding: "10px 14px", borderRadius: 14, background: "rgba(255,255,255,0.04)" })}>
              <div style={flex({ alignItems: "center", justifyContent: "space-between" })}>
                <div style={flex({ fontSize: 18, color: "rgba(255,255,255,0.6)" })}>{stamp(r.locked_at)}</div>
                <div style={flex({ fontSize: 18, color: r.anchor_digest ? G : "rgba(255,255,255,0.4)" })}>{r.anchor_digest ? "Sui: yes" : "Sui: none"}</div>
              </div>
              <div style={flex({ fontSize: 22, fontWeight: 700, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden" })}>
                {`${r.fixtures?.home_team ?? "?"} vs ${r.fixtures?.away_team ?? "?"}  ·  ${PICK(r) ?? "?"} @ ${Number(r.odds_taken).toFixed(2)}`}
              </div>
              <div style={flex({ fontSize: 18, color: "rgba(255,255,255,0.7)", marginTop: 4 })}>{`Walrus blob  ${shortId(r.memory_blob_id) ?? "proof pending"}`}</div>
            </div>)) : <div style={flex({ fontSize: 22, color: "rgba(255,255,255,0.6)", marginTop: 14 })}>No locks yet.</div>}
        </div>

        <div style={flex({ fontSize: 22, color: "rgba(255,255,255,0.75)", marginTop: 22 })}>{`Testnet kicks: ${kickSettled} settled of ${kickRows.length} · play money`}</div>
        <div style={flex({ marginTop: "auto", fontSize: 18, color: "rgba(255,255,255,0.5)" })}>{`Exported ${new Date().toISOString().slice(0, 10)} · every call is timestamped on Sui · full record in the CSV`}</div>
      </div>
    ),
    { width: 1080, height: 1350 },
  );
}
