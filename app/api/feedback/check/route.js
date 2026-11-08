import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (x, status = 200) => NextResponse.json(x, { status });

// GET ?secret=CRON_SECRET            -> can the token read the repo?
// GET ?secret=CRON_SECRET&create=1   -> can it also create an issue? (the test issue is closed straight away)
export async function GET(req) {
  const u = new URL(req.url);
  if (!process.env.CRON_SECRET || u.searchParams.get("secret") !== process.env.CRON_SECRET) return json({ error: "forbidden" }, 403);
  const token = process.env.FEEDBACK_GITHUB_TOKEN?.trim();
  const repo = (process.env.FEEDBACK_REPO || "Collinxweb/proofkick").trim();
  if (!token) return json({ ok: false, step: "token", fix: "FEEDBACK_GITHUB_TOKEN is not set in Vercel. Add it, then redeploy." });

  const h = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  const r = await fetch(`https://api.github.com/repos/${repo}`, { headers: h, cache: "no-store" });
  if (r.status === 401) return json({ ok: false, step: "token", status: 401, fix: "The token is invalid or expired. Create a new fine-grained token and replace FEEDBACK_GITHUB_TOKEN." });
  if (r.status === 404) return json({ ok: false, step: "repo", status: 404, repo, fix: `The token cannot see ${repo}. Edit the token and under Repository access select this repository. Also check FEEDBACK_REPO is spelled exactly ${repo}.` });
  if (!r.ok) return json({ ok: false, step: "repo", status: r.status, fix: "GitHub returned an unexpected status. Send this reply to support." });
  const body = await r.json();

  if (u.searchParams.get("create") !== "1") {
    return json({ ok: true, step: "read", repo, canPushHint: body.permissions?.push ?? null, note: "The token can read the repo. Add &create=1 to test that issues can be created." });
  }

  const cr = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST", headers: { ...h, "Content-Type": "application/json" },
    body: JSON.stringify({ title: "ProofKick feedback check (auto-closed)", body: "Automated check from the feedback route. Safe to ignore." }),
  });
  if (cr.status === 403 || cr.status === 404) return json({ ok: false, step: "issues", status: cr.status, fix: "The token can read the repo but cannot create issues. Edit the token and under Repository permissions set Issues to Read and write." });
  if (!cr.ok) return json({ ok: false, step: "issues", status: cr.status, fix: "Creating an issue failed. Send this reply to support." });
  const issue = await cr.json();
  await fetch(`https://api.github.com/repos/${repo}/issues/${issue.number}`, {
    method: "PATCH", headers: { ...h, "Content-Type": "application/json" }, body: JSON.stringify({ state: "closed" }),
  });
  return json({ ok: true, step: "issues", repo, issue: issue.number, note: "A test issue was created and closed. Feedback will now work." });
}
