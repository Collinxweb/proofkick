// The proof line on a card: the real Walrus blob ID and Sui receipt, shortened so they fit.
const short = (x) => (x ? `${String(x).slice(0, 10)}…${String(x).slice(-6)}` : null);
const flex = (x) => ({ display: "flex", ...x });

export default function ProofLine({ blob, receipt, receiptLabel = "Sui receipt", color = "#19d36b" }) {
  if (!blob && !receipt) return null;
  return (
    <div style={flex({ flexDirection: "column", marginTop: 14, padding: "12px 16px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.35)" })}>
      <div style={flex({ alignItems: "center", justifyContent: "space-between", marginBottom: 4 })}>
        <div style={flex({ fontSize: 16, letterSpacing: 2, color: "rgba(255,255,255,0.55)" })}>WALRUS BLOB</div>
        <div style={flex({ fontSize: 18, color: "#fff" })}>{short(blob) ?? "—"}</div>
      </div>
      <div style={flex({ alignItems: "center", justifyContent: "space-between" })}>
        <div style={flex({ fontSize: 16, letterSpacing: 2, color: "rgba(255,255,255,0.55)" })}>{receiptLabel.toUpperCase()}</div>
        <div style={flex({ fontSize: 18, color })}>{short(receipt) ?? "—"}</div>
      </div>
    </div>
  );
}
