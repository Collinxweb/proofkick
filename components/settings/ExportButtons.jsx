// Downloads. CSV holds every call, multi leg and kick with its transaction links. The card is a PNG summary.
export default function ExportButtons() {
  const btn = "flex-1 rounded-full border border-accent/50 py-3 text-center text-sm font-semibold text-accent";
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-panel p-4">
      <div><p className="text-sm font-semibold text-white">Export your record</p>
        <p className="mt-1 text-xs text-white/50">The full CSV has every call, multi leg and kick, with the Sui and testnet transaction links. Open it in any spreadsheet app.</p></div>
      <div className="flex gap-2">
        <a href="/api/export?format=csv" download className={btn}>Full record (CSV)</a>
        <a href="/api/export?format=card" download className={btn}>Summary card (PNG)</a>
      </div>
    </div>
  );
}
