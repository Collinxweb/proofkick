// What a kick could pay right now. An estimate: pool rounds change as others kick; fixed rounds are priced at the kick.
export function potentialPayout({ kind, side, stake, chanceBps, longPool, shortPool }) {
  if (kind === "fixed") return chanceBps ? Math.floor((stake * 9700) / chanceBps) : null;
  const sidePool = side === "long" ? longPool : shortPool;
  const total = longPool + shortPool;
  if (!(sidePool > 0)) return null;
  return (stake / sidePool) * total;
}
