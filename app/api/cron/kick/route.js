import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { openRounds, retryOpenRecords, planAt, record, KICK_RECEIPT_KIND } from "@/lib/kick/ops";
import { settleBatch } from "@/lib/kick/settle-batch";
import { openFixedRounds, settleFixedExpired } from "@/lib/kick/fixed-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Each step is its own request with its own time budget, so one slow step can't stop the others.
// settle  : settle expired pool rounds (oldest first, in batches)
// open    : open pool rounds that are due
// fixed   : settle expired fixed-odds rounds, then open due ones
// records : write mainnet records that are missing
// status  : read-only snapshot of what is due and what is open
// reset   : archive open pool rounds and open a fresh set (manual)

const BUDGET = 45_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One run per step at a time. The lease expires by itself after two minutes if a run is cut off.
async function takeLock(db, name, now) {
  const { data, error } = await db.from("kick_job_lock")
    .update({ locked_until: new Date(now + 120_000).toISOString() })
    .eq("name", name).lt("locked_until", new Date(now).toISOString()).select("name");
  if (error) throw error;
  return (data ?? []).length > 0;
}
async function releaseLock(db, name) {
  await db.from("kick_job_lock").update({ locked_until: new Date(0).toISOString() }).eq("name", name);
}

// Writes the mainnet record for settled rounds that don't have one yet.
async function recordSettled(db, deadline) {
  const { data: rows } = await db.from("kick_rounds")
    .select("id, asset, horizon, kind, outcome, open_price, close_price, settled_at")
    .in("state", ["settled", "void"]).is("close_digest", null)
    .order("settled_at", { ascending: true }).limit(10);
  const out = [];
  for (const r of rows ?? []) {
    if (Date.now() > deadline - 15_000) { out.push({ id: r.id, skipped: "time budget used" }); break; }
    const snap = {
      v: 1, kind: "kick-round-settle", round: r.id, asset: r.asset, horizon: r.horizon, round_kind: r.kind,
      outcome: r.outcome, open_price: String(r.open_price), close_price: String(r.close_price), settled_at: r.settled_at, backfill: true,
    };
    const rec = await record(snap, KICK_RECEIPT_KIND.settle, r.id);
    const patch = { close_snapshot_blob: rec.blobId };
    if (rec.digest) patch.close_digest = rec.digest;
    await db.from("kick_rounds").update(patch).eq("id", r.id);
    out.push({ id: r.id, mainnetReceipt: rec.digest ?? `not written yet: ${rec.error}` });
  }
  return out;
}

async function status(db, now) {
  const iso = new Date(now).toISOString();
  const count = async (q) => (await q).count ?? null;
  const dueUnsettledPool = await count(db.from("kick_rounds").select("id", { count: "exact", head: true }).eq("kind", "pool").eq("state", "open").lte("expires_at", iso));
  const dueUnsettledFixed = await count(db.from("kick_rounds").select("id", { count: "exact", head: true }).eq("kind", "fixed").eq("state", "open").lte("expires_at", iso));
  const { data: live } = await db.from("kick_rounds").select("id, kind, state, opens_at, entry_closes_at, expires_at").eq("state", "open").eq("archived", false).gt("expires_at", iso).order("opens_at", { ascending: true });
  const { data: locks } = await db.from("kick_job_lock").select("name, locked_until");
  return { at: iso, dueUnsettledPool, dueUnsettledFixed, liveRounds: live ?? [], locks: locks ?? [] };
}

export async function GET(req) {
  const u = new URL(req.url);
  if (!process.env.CRON_SECRET || u.searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const now = Date.now();
  const db = supabaseAdmin();
  const step = u.searchParams.get("step") ?? "settle";
  const out = { at: new Date(now).toISOString(), step };

  if (step === "status") return NextResponse.json(await status(db, now));
  if (!["settle", "open", "fixed", "records", "reset"].includes(step)) {
    return NextResponse.json({ error: `unknown step: ${step}` }, { status: 400 });
  }

  if (!(await takeLock(db, step, now))) {
    return NextResponse.json({ ...out, skipped: `the ${step} step is already running` });
  }
  try {
    if (step === "settle") {
      out.settled = await settleBatch(db, now, now + BUDGET);
    } else if (step === "open") {
      out.opened = await openRounds(db, now, now + BUDGET);
    } else if (step === "fixed") {
      out.settled = await settleFixedExpired(db, now, now + 25_000);
      out.opened = await openFixedRounds(db, now, now + BUDGET);
    } else if (step === "records") {
      out.openRecords = await retryOpenRecords(db, now + BUDGET);
      out.settledRecords = await recordSettled(db, now + BUDGET);
    } else if (step === "reset") {
      const given = u.searchParams.get("start");
      if (!given) {
        const { error } = await db.from("kick_rounds").update({ archived: true }).eq("state", "open").eq("archived", false).eq("kind", "pool");
        if (error) return NextResponse.json({ error: `could not archive: ${error.message}` }, { status: 500 });
        out.archived = true;
      }
      const start = given ? Number(given) : Math.floor(now / 60000) * 60000;
      out.start = start;
      out.opened = await openRounds(db, now, now + BUDGET, planAt(start));
    }
    return NextResponse.json(out);
  } finally {
    await releaseLock(db, step);
  }
}
