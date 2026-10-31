const avg = (a) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 100) / 100 : null);

// Average 1X2 price across bookmakers for one The Odds API event. The same maths prices a call and sets its closing line.
export function consensus(e) {
  const side = { home: [], draw: [], away: [] };
  for (const b of e.bookmakers ?? []) {
    for (const o of b.markets?.find((m) => m.key === "h2h")?.outcomes ?? []) {
      if (o.name === e.home_team) side.home.push(o.price);
      else if (o.name === e.away_team) side.away.push(o.price);
      else if (o.name === "Draw") side.draw.push(o.price);
    }
  }
  return { home: avg(side.home), draw: avg(side.draw), away: avg(side.away), books: e.bookmakers?.length ?? 0 };
}
