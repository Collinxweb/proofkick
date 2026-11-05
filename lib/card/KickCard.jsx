// Satori card for one kick, styled to match the football card. Every element with several children is display:flex.
const G = "#19d36b", R = "#f87171";
const flex = (x) => ({ display: "flex", ...x });
const fmt = (n, d = 2) => (n == null ? "—" : Number(n).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }));

export default function KickCard({ k, avatar, qr }) {
  const settled = k.status !== "OPEN";
  const won = k.outcomeWord === "WON";
  const tone = won ? G : k.outcomeWord === "LOST" ? R : "rgba(255,255,255,0.7)";
  const cell = (label, value, color = "#fff") => (
    <div style={flex({ flexDirection: "column", alignItems: "center", flex: 1 })}>
      <div style={flex({ fontSize: 20, color: "rgba(255,255,255,0.6)" })}>{label}</div>
      <div style={flex({ fontSize: 30, fontWeight: 700, color, marginTop: 6 })}>{value}</div>
    </div>);
  return (
    <div style={flex({ flexDirection: "column", width: 1024, height: 700, padding: 36, background: "radial-gradient(circle at 90% 0%, #0f4a31 0%, #07090a 60%)", color: "#fff", fontFamily: "sans-serif", borderRadius: 36, border: "2px solid rgba(25,211,107,0.35)" })}>
      <div style={flex({ alignItems: "center", justifyContent: "space-between" })}>
        <div style={flex({ alignItems: "center" })}>
          <div style={flex({ width: 72, height: 72, borderRadius: 36, background: G, alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 700, color: "#06140d", overflow: "hidden" })}>
            {avatar ? <img src={avatar} width={72} height={72} style={{ objectFit: "cover" }} /> : (k.handle[0] ?? "P").toUpperCase()}
          </div>
          <div style={flex({ flexDirection: "column", marginLeft: 16 })}>
            <div style={flex({ fontSize: 34, fontWeight: 700 })}>{`@${k.handle}`}</div>
            <div style={flex({ fontSize: 20, color: "rgba(255,255,255,0.55)" })}>On ProofKick</div>
          </div>
        </div>
        <div style={flex({ flexDirection: "column", alignItems: "center", padding: "10px 26px", borderRadius: 28, border: `2px solid ${G}` })}>
          <div style={flex({ fontSize: 24, fontWeight: 700, color: G })}>KICK TESTNET</div>
          <div style={flex({ fontSize: 16, color: "rgba(255,255,255,0.7)" })}>PLAY MONEY</div>
        </div>
      </div>

      <div style={flex({ alignItems: "center", justifyContent: "space-between", marginTop: 28, padding: 24, borderRadius: 26, background: "rgba(8,14,12,0.85)", border: "1px solid rgba(255,255,255,0.1)" })}>
        <div style={flex({ alignItems: "center" })}>
          <div style={flex({ width: 96, height: 96, borderRadius: 48, background: "#f7931a", alignItems: "center", justifyContent: "center", fontSize: 52, fontWeight: 700, color: "#fff" })}>{k.asset === "BTC" ? "₿" : k.asset === "ETH" ? "Ξ" : "Au"}</div>
          <div style={flex({ flexDirection: "column", marginLeft: 22 })}>
            <div style={flex({ fontSize: 38, fontWeight: 700 })}>{k.title}</div>
            <div style={flex({ fontSize: 22, color: "rgba(255,255,255,0.6)", marginTop: 4 })}>{k.coinName}</div>
          </div>
        </div>
        <div style={flex({ flexDirection: "column", alignItems: "center", padding: "16px 30px", borderRadius: 22, border: `2px solid ${won ? G : k.pick === "GREEN" ? G : R}`, background: won ? "rgba(25,211,107,0.12)" : "rgba(255,255,255,0.03)" })}>
          <div style={flex({ fontSize: 40, fontWeight: 700, color: k.pick === "GREEN" ? G : R })}>{settled ? (won ? `🏆 WON` : k.outcomeWord) : `${k.pick} ${k.pick === "GREEN" ? "↑" : "↓"}`}</div>
          <div style={flex({ fontSize: 20, color: "rgba(255,255,255,0.7)", marginTop: 4 })}>{settled ? `${k.pick} ${won ? "✓" : ""}` : "YOUR PICK"}</div>
        </div>
      </div>

      <div style={flex({ marginTop: 22, padding: "18px 0", borderTop: "1px solid rgba(255,255,255,0.1)", borderBottom: "1px solid rgba(255,255,255,0.1)" })}>
        {cell("Stake", `${fmt(k.stake, 0)} KICK`)}
        {cell("Entry Price", k.entryPrice != null ? `$${fmt(k.entryPrice)}` : "—")}
        {settled ? cell("Settlement", k.settlementPrice != null ? `$${fmt(k.settlementPrice)}` : "—") : cell("Round Close", k.roundClose)}
        {settled ? cell("Net Result", k.net != null ? `${k.net >= 0 ? "+" : ""}${fmt(k.net, 0)} KICK` : "—", k.net != null && k.net >= 0 ? G : R) : cell("Countdown", k.countdown ?? "—", G)}
      </div>

      {settled && (
        <div style={flex({ alignItems: "center", justifyContent: "space-between", marginTop: 16, padding: "16px 22px", borderRadius: 22, background: "rgba(25,211,107,0.08)", border: "1px solid rgba(25,211,107,0.35)" })}>
          <div style={flex({ flexDirection: "column" })}><div style={flex({ fontSize: 20, color: "rgba(255,255,255,0.6)" })}>Payout</div><div style={flex({ fontSize: 30, fontWeight: 700 })}>{k.payout != null ? `${fmt(k.payout, 0)} KICK` : "—"}</div></div>
          <div style={flex({ flexDirection: "column" })}><div style={flex({ fontSize: 20, color: "rgba(255,255,255,0.6)" })}>Return</div><div style={flex({ fontSize: 30, fontWeight: 700, color: tone })}>{k.returnPct != null ? `${k.returnPct >= 0 ? "+" : ""}${fmt(k.returnPct, 1)}%` : "—"}</div></div>
        </div>)}

      <div style={flex({ alignItems: "center", justifyContent: "space-between", marginTop: "auto" })}>
        <div style={flex({ flexDirection: "column" })}>
          <div style={flex({ fontSize: 30, fontWeight: 700 })}>Proof<span style={{ color: G }}>Kick</span></div>
          <div style={flex({ fontSize: 18, color: G, marginTop: 4 })}>Testnet play money · No real value · Timestamped on Sui testnet</div>
        </div>
        <div style={flex({ alignItems: "center" })}>
          <div style={flex({ flexDirection: "column", alignItems: "flex-end", marginRight: 18 })}>
            <div style={flex({ fontSize: 18, color: "rgba(255,255,255,0.6)" })}>Record ID</div>
            <div style={flex({ fontSize: 24, fontWeight: 700 })}>{k.recordId}</div>
            <div style={flex({ fontSize: 18, color: settled ? tone : G, marginTop: 4 })}>{k.status}</div>
          </div>
          {qr ? <div style={flex({ padding: 8, background: "#fff", borderRadius: 12 })}><img src={qr} width={110} height={110} /></div> : null}
        </div>
      </div>
    </div>
  );
}
