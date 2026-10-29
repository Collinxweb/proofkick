// Satori (next/og) layout: every element with several children must be display:flex.
const G = "#19d36b";
const initials = (n) => String(n).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const flex = (extra) => ({ display: "flex", ...extra });

export default function SlipCard({ slip, logo, avatar, qr }) {
  const rows = slip.selections.slice(0, 6), extra = slip.selections.length - rows.length;
  return (
    <div style={flex({ flexDirection: "column", width: 1080, height: 1350, padding: 44, background: "radial-gradient(circle at 85% 0%, #0f4a31 0%, #07090a 55%)", color: "#fff", fontFamily: "sans-serif" })}>
      <div style={flex({ alignItems: "center", justifyContent: "space-between" })}>
        <div style={flex({ alignItems: "center" })}>
          {logo ? <img src={logo} width={64} height={64} style={{ marginRight: 14 }} /> : null}
          <div style={flex({ fontSize: 50, fontWeight: 700 })}>Proof<span style={{ color: G }}>Kick</span></div>
        </div>
        <div style={flex({ fontSize: 20, color: G, letterSpacing: 3 })}>REAL PEOPLE. REAL RECORDS.</div>
      </div>

      <div style={flex({ alignItems: "center", marginTop: 34 })}>
        <div style={flex({ width: 124, height: 124, borderRadius: 62, border: `4px solid ${G}`, overflow: "hidden", alignItems: "center", justifyContent: "center", background: "#12382a", fontSize: 54, fontWeight: 700 })}>
          {avatar ? <img src={avatar} width={124} height={124} style={{ objectFit: "cover" }} /> : initials(slip.handle)}
        </div>
        <div style={flex({ flexDirection: "column", marginLeft: 28 })}>
          <div style={flex({ alignItems: "center", fontSize: 44, fontWeight: 700 })}>
            {`@${slip.handle}`}
            {slip.verified ? <div style={flex({ marginLeft: 14, padding: "4px 14px", borderRadius: 14, background: "rgba(25,211,107,0.18)", color: G, fontSize: 20 })}>Verified on Sui</div> : null}
          </div>
          <div style={flex({ marginTop: 12, fontSize: 26, color: "rgba(255,255,255,0.75)" })}>
            {`${slip.total} picks   |   Win rate ${slip.winrate == null ? "—" : `${(slip.winrate * 100).toFixed(1)}%`}`}
          </div>
        </div>
      </div>

      <div style={flex({ flexDirection: "column", marginTop: 30, padding: 24, borderRadius: 30, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(8,14,12,0.85)" })}>
        <div style={flex({ alignItems: "center", justifyContent: "space-between", marginBottom: 12 })}>
          <div style={flex({ flexDirection: "column" })}>
            <div style={flex({ fontSize: 28, letterSpacing: 4, fontWeight: 700 })}>PREDICTION SLIP</div>
            <div style={flex({ fontSize: 21, color: "rgba(255,255,255,0.55)", marginTop: 4 })}>{`${slip.selections.length} SELECTION${slip.selections.length > 1 ? "S" : ""}   /   ${slip.dateLabel}`}</div>
          </div>
          <div style={flex({ padding: "8px 24px", borderRadius: 24, border: `2px solid ${G}`, color: G, fontSize: 22, letterSpacing: 2 })}>{slip.selections.length > 1 ? "COMBINED" : "SINGLE"}</div>
        </div>
        {rows.map((s, i) => (
          <div key={i} style={flex({ alignItems: "center", height: 86, margin: "6px 0", padding: "0 20px", borderRadius: 22, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" })}>
            <div style={flex({ width: 52, color: G, fontSize: 28, fontWeight: 700 })}>{String(i + 1).padStart(2, "0")}</div>
            <div style={flex({ width: 54, height: 54, borderRadius: 27, background: "rgba(255,255,255,0.10)", alignItems: "center", justifyContent: "center", fontSize: 21, fontWeight: 700, marginRight: 18 })}>{initials(s.home)}</div>
            <div style={flex({ flexDirection: "column", flex: 1, overflow: "hidden" })}>
              <div style={flex({ fontSize: 28, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>{`${s.home} vs ${s.away}`}</div>
              <div style={flex({ fontSize: 21, color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap" })}>{`${s.market}  •  ${s.pick}`}</div>
            </div>
            <div style={flex({ padding: "10px 22px", borderRadius: 16, background: "rgba(25,211,107,0.18)", color: G, fontSize: 28, fontWeight: 700, marginLeft: 12 })}>{s.odds}</div>
          </div>))}
        {extra > 0 ? <div style={flex({ fontSize: 22, color: "rgba(255,255,255,0.55)", marginTop: 6 })}>{`+ ${extra} more selection${extra > 1 ? "s" : ""}`}</div> : null}
      </div>

      <div style={flex({ marginTop: 26, padding: 26, borderRadius: 30, border: `1px solid ${G}`, background: "rgba(25,211,107,0.07)", alignItems: "center" })}>
        <div style={flex({ flexDirection: "column", width: 300 })}>
          <div style={flex({ fontSize: 22, letterSpacing: 3, color: "rgba(255,255,255,0.7)" })}>TOTAL ODDS</div>
          <div style={flex({ fontSize: 76, fontWeight: 700, color: G })}>{slip.totalOdds}</div>
        </div>
        <div style={flex({ flexDirection: "column", flex: 1, paddingLeft: 26 })}>
          {slip.stake ? (
            <div style={flex({ flexDirection: "column" })}>
              <div style={flex({ fontSize: 22, letterSpacing: 3, color: "rgba(255,255,255,0.7)" })}>STAKE</div>
              <div style={flex({ fontSize: 32, fontWeight: 700 })}>{`${slip.stake} ${slip.currency ?? ""}`}</div>
              <div style={flex({ fontSize: 22, letterSpacing: 3, color: "rgba(255,255,255,0.7)", marginTop: 8 })}>POTENTIAL RETURN</div>
              <div style={flex({ fontSize: 32, fontWeight: 700, color: G })}>{`${slip.potential} ${slip.currency ?? ""}`}</div>
            </div>
          ) : (
            <div style={flex({ flexDirection: "column", fontSize: 26, color: "rgba(255,255,255,0.8)" })}>
              <div style={flex({ fontWeight: 700 })}>Locked before kick-off</div>
              <div style={flex({ fontSize: 22, color: "rgba(255,255,255,0.55)", marginTop: 6 })}>Saved on Walrus, anchored on Sui.</div>
            </div>)}
        </div>
      </div>

      <div style={flex({ marginTop: "auto", alignItems: "center", justifyContent: "space-between" })}>
        <div style={flex({ flexDirection: "column" })}>
          <div style={flex({ fontSize: 34, fontWeight: 700 })}>Follow this prediction on ProofKick</div>
          <div style={flex({ fontSize: 22, color: G, marginTop: 6 })}>{slip.demo ? "SAMPLE PREVIEW - NOT REAL PICKS" : "Scan to open the full record"}</div>
        </div>
        {qr ? (
          <div style={flex({ padding: 10, background: "#fff", borderRadius: 14 })}>
            <svg width={150} height={150} viewBox={`0 0 ${qr.n} ${qr.n}`}><path d={qr.d} fill="#000" /></svg>
          </div>) : null}
      </div>
    </div>
  );
}
