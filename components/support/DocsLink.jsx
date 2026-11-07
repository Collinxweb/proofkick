// Shows the documentation link once NEXT_PUBLIC_DOCS_URL is set. Nothing is shown until then.
export default function DocsLink() {
  const url = process.env.NEXT_PUBLIC_DOCS_URL;
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-white/10 bg-panel px-4 py-3 text-sm text-white">
      <span>ProofKick documentation</span>
      <span className="text-xs text-accent">Read</span>
    </a>
  );
}
