// Link to the documentation page inside the app.
export default function DocsLink() {
  return (
    <a href="/docs" className="flex items-center justify-between rounded-2xl border border-white/10 bg-panel px-4 py-3 text-sm text-white">
      <span>ProofKick documentation</span>
      <span className="text-xs text-accent">Read</span>
    </a>
  );
}
