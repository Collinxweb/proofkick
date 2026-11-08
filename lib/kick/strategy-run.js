// Runs every active Kick strategy: if its rule matches and its market is inside the entry window, it places one kick per round.
import { fetchCandles } from "./prices";
import { impliedPct } from "./rounds";
import { momentum } from "./chance";
import { evaluateKickRule } from "./strategy-rules";
import { placeKick } from "./place";

export async function runKickStrategies(db, now = Date.now()) {
  const report = { checked: 0, kicked: 0, skipped: 0, notes: [] };
  const nowIso = new Date(now).toISOString();
  const { data: strategies } = await db.from("kick_strategies").select("*").eq("active", true).limit(200);
  const candleCache = {};
  for (const s of strategies ?? []) {
    report.checked++;
    const { data: open } = await db.from("kick_rounds").select("*").eq("asset", s.asset).eq("horizon", s.horizon).eq("kind", "pool").eq("state", "open").eq("archived", false)
      .lte("opens_at", nowIso).gt("entry_closes_at", nowIso).order("opens_at", { ascending: false }).limit(1);
    const round = open?.[0];
    if (!round) { report.skipped++; continue; }
    const { data: done } = await db.from("kick_strategy_runs").select("round_id").eq("strategy_id", s.id).eq("round_id", round.id).maybeSingle();
    if (done) { report.skipped++; continue; }
    if (!(s.asset in candleCache)) candleCache[s.asset] = await fetchCandles(s.asset).catch(() => null);
    const c = candleCache[s.asset];
    const last = c?.length ? c[c.length - 1].close : null;
    const mom = c && last ? momentum({ candles: c, openPrice: Number(round.open_price), currentPrice: last }) : { upPct: null };
    const { data: entries } = await db.from("kick_entries").select("side, stake").eq("round_id", round.id);
    let long = 0, short = 0;
    for (const e of entries ?? []) if (e.side === "long") long += Number(e.stake); else short += Number(e.stake);
    const implied = impliedPct(long, short);
    const side = evaluateKickRule({ rule: s.rule, threshold: Number(s.threshold), momentumUp: mom.upPct ?? null, impliedLong: implied.long, impliedShort: implied.short });
    if (!side) { report.skipped++; continue; }
    const r = await placeKick({ db, userId: s.user_id, round, side, amount: Number(s.stake) });
    if (!r.ok) { report.notes.push(`${s.id}: ${r.error}`); continue; }
    await db.from("kick_strategy_runs").insert({ strategy_id: s.id, round_id: round.id, side });
    report.kicked++;
  }
  return report;
}
