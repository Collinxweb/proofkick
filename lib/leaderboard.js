// rows are compact: [userIndex, won(1|0), clv|null, league]. Only graded calls (won/lost) are included; voids never count.
export function rankUsers({ rows, users, league = null, metric = "hit", minGraded = 10 }) {
  const agg = {};
  for (const [u, w, clv, lg] of rows) {
    if (league && lg !== league) continue;
    const a = (agg[u] ??= { u, n: 0, w: 0, clvSum: 0, clvN: 0 });
    a.n++; a.w += w;
    if (clv != null) { a.clvSum += clv; a.clvN++; }
  }
  const list = Object.values(agg).filter((a) => a.n >= minGraded && (metric !== "clv" || a.clvN >= minGraded))
    .map((a) => ({ ...users[a.u], graded: a.n, hit: a.w / a.n, clv: a.clvN ? a.clvSum / a.clvN : null, clvN: a.clvN }));
  return list.sort(metric === "clv" ? (x, y) => y.clv - x.clv || y.graded - x.graded : (x, y) => y.hit - x.hit || y.graded - x.graded);
}
