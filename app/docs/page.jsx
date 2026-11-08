import fs from "node:fs";
import path from "node:path";
import Link from "next/link";

// The docs are a Markdown file in the repo, rendered here so they read inside the app.
const SOURCE = path.join(process.cwd(), "content", "docs.md");

function inline(text, key) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, i) => {
    if (part.startsWith("**")) return <strong key={`${key}-${i}`} className="text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`")) return <code key={`${key}-${i}`} className="rounded bg-white/10 px-1 py-0.5 text-[12px] text-accent">{part.slice(1, -1)}</code>;
    return <span key={`${key}-${i}`}>{part}</span>;
  });
}

function render(md) {
  const lines = md.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const key = `l${i}`;
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("# ")) { out.push(<h1 key={key} className="mt-2 text-2xl font-semibold text-white">{inline(line.slice(2), key)}</h1>); i++; continue; }
    if (line.startsWith("## ")) { out.push(<h2 key={key} className="mt-8 text-lg font-semibold text-accent">{inline(line.slice(3), key)}</h2>); i++; continue; }
    if (line.startsWith("### ")) { out.push(<h3 key={key} className="mt-5 text-base font-semibold text-white">{inline(line.slice(4), key)}</h3>); i++; continue; }
    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!/^\|\s*-/.test(lines[i])) rows.push(lines[i].split("|").slice(1, -1).map((c) => c.trim()));
        i++;
      }
      const [head, ...body] = rows;
      out.push(
        <div key={key} className="mt-3 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-white/70">
              <tr>{head.map((c, j) => <th key={j} className="px-3 py-2 font-semibold">{inline(c, `${key}h${j}`)}</th>)}</tr>
            </thead>
            <tbody className="text-white/70">
              {body.map((r, ri) => <tr key={ri} className="border-t border-white/5">{r.map((c, j) => <td key={j} className="px-3 py-2 align-top">{inline(c, `${key}r${ri}c${j}`)}</td>)}</tr>)}
            </tbody>
          </table>
        </div>);
      continue;
    }
    if (line.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- ")) { items.push(lines[i].slice(2)); i++; }
      out.push(<ul key={key} className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-white/75">{items.map((t, j) => <li key={j}>{inline(t, `${key}i${j}`)}</li>)}</ul>);
      continue;
    }
    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\. /, "")); i++; }
      out.push(<ol key={key} className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-white/75">{items.map((t, j) => <li key={j}>{inline(t, `${key}n${j}`)}</li>)}</ol>);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#|\||- |\d+\. )/.test(lines[i])) { para.push(lines[i]); i++; }
    out.push(<p key={key} className="mt-2 text-sm leading-relaxed text-white/75">{inline(para.join(" "), key)}</p>);
  }
  return out;
}

export default function Docs() {
  const md = fs.readFileSync(SOURCE, "utf8");
  return (
    <main className="mx-auto min-h-dvh max-w-md md:max-w-2xl px-4 pb-16 pt-6">
      <Link href="/dashboard" className="text-sm text-white/60">← Back to ProofKick</Link>
      <article className="mt-4">{render(md)}</article>
    </main>
  );
}
