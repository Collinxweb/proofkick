import Explain from "@/components/Explain";

// Trading competition: coming soon. Prize details are not set, and nothing here promises money.
export default function Competition({ rows, handles }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-panel p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1 text-sm font-semibold text-white">Trading competition <Explain text="A future contest on Kick markets. Prizes and rules are not set yet. Anything involving real money needs legal and age checks first, and will be announced only once approved." /></p>
        <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-[10px] text-white/60">Coming soon</span>
      </div>
      <p className="mt-2 text-xs text-white/55">The competition is being prepared. Prize details, rules and eligibility will be announced once they are approved. Nothing is promised until then.</p>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-white/40">Testnet standings (play money, no prizes)</p>
      <div className="mt-2 space-y-1.5">
        {rows.map((r, i) => (
          <div key={r.user_id} className="flex items-center justify-between text-xs">
            <span className="text-white/80">{i + 1}. @{handles[r.user_id] ?? "user"}</span>
            <span className="text-white/60">{r.net >= 0 ? "+" : ""}{r.net.toFixed(2)} KICK · {r.settled} settled</span>
          </div>))}
        {!rows.length && <p className="text-xs text-white/45">No settled kicks yet.</p>}
      </div>
    </div>
  );
}
