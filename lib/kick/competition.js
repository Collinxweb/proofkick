// Testnet standings from settled kicks only. Play money: no prizes are attached to this table.
export function standings(entries) {
  const by = {};
  for (const e of entries) {
    if (!(e.status === "won" || e.status === "lost" || e.status === "refunded")) continue;
    const r = (by[e.user_id] ??= { user_id: e.user_id, net: 0, settled: 0 });
    r.net += Number(e.payout ?? 0) - Number(e.stake);
    r.settled++;
  }
  return Object.values(by).sort((a, b) => b.net - a.net || b.settled - a.settled).slice(0, 10);
}
