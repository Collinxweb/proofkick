import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { kind: "bug"|"suggestion", title, body, showName } -> a GitHub issue in the ProofKick repo.
// Needs FEEDBACK_GITHUB_TOKEN (a token with Issues: write on the repo). Issues on a public repo are public.
export async function POST(req) {
  const { data: { user } } = await supabaseServer().auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to send feedback." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const kind = b.kind === "bug" ? "bug" : "suggestion";
  const title = String(b.title ?? "").trim();
  const body = String(b.body ?? "").trim();
  if (title.length < 5 || title.length > 120) return NextResponse.json({ error: "Title: 5 to 120 characters." }, { status: 400 });
  if (body.length < 10 || body.length > 2000) return NextResponse.json({ error: "Details: 10 to 2000 characters." }, { status: 400 });
  const token = process.env.FEEDBACK_GITHUB_TOKEN?.trim();
  if (!token) return NextResponse.json({ error: "Feedback is not connected yet. Please try again later." }, { status: 503 });
  const repo = process.env.FEEDBACK_REPO?.trim() || "Collinxweb/proofkick";
  let who = "Reported anonymously";
  if (b.showName) {
    const { data: me } = await supabaseAdmin().from("profiles").select("handle").eq("id", user.id).maybeSingle();
    if (me?.handle) who = `Reported by @${me.handle}`;
  }
  const r = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "content-type": "application/json" },
    body: JSON.stringify({ title: `[${kind}] ${title}`, body: `${body}\n\n---\nType: ${kind}\n${who}\nSent from ProofKick settings.` }),
  });
  if (!r.ok) return NextResponse.json({ error: `Could not send feedback (GitHub ${r.status}). Please try again.` }, { status: 502 });
  const issue = await r.json();
  return NextResponse.json({ ok: true, url: issue.html_url });
}
