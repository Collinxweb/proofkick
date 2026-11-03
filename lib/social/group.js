// Turns a list of calls into feed items. A multi is one ticket: its legs are hidden as separate calls and shown once.
// calls: picks [{id, locked_at, ...}]; slips: [{ id, kind, legs: [{ position, pick }] }]
export function groupCalls({ calls, slips }) {
  const inMulti = new Set();
  for (const s of slips ?? []) if (s.kind === "multi") for (const l of s.legs) inMulti.add(l.pick.id);
  const items = [];
  for (const c of calls ?? []) if (!inMulti.has(c.id)) items.push({ type: "call", at: c.locked_at, c });
  for (const s of slips ?? []) {
    if (s.kind !== "multi" || !s.legs?.length) continue;
    const legs = [...s.legs].sort((a, b) => a.position - b.position).map((l) => l.pick);
    const at = legs.map((p) => p.locked_at).sort()[0];
    items.push({ type: "slip", at, slip: s, legs });
  }
  return items.sort((a, b) => new Date(b.at) - new Date(a.at));
}
