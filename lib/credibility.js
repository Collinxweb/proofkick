// Experimental credibility score out of 100. Mostly the record, a little closing-line value, a capped bit of social proof.
// Weights are exported so the profile page can show exactly how the number is made.
export const WEIGHTS = { record: 70, clv: 20, social: 10 };
export const CLV_FULL = 0.05; // +5% average CLV earns the full CLV share
export const LIKES_FULL = 20; // 20 qualified likes earn the full social share

// Lower bound of the 95% Wilson interval: a small sample cannot score like a big one.
export function wilson(w, n) {
  if (!n) return 0;
  const z = 1.96, p = w / n;
  return (p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) / (1 + (z * z) / n);
}

// No score at all until a caller has `minGraded` graded calls, so a lucky 3-for-3 never shows a number.
// CLV only counts in proportion to how many calls actually have a closing line (clvN).
// qualifiedLikes: likes on graded calls from accounts that themselves have enough graded calls, so fresh fake accounts add nothing.
export function credibility({ wins, graded, avgClv, clvN = 0, qualifiedLikes = 0, minGraded = 10 }) {
  if (graded < minGraded) return null;
  const record = wilson(wins, graded);
  const clv = avgClv == null ? 0 : Math.min(1, Math.max(0, avgClv / CLV_FULL)) * Math.min(1, clvN / minGraded);
  const social = Math.min(1, qualifiedLikes / LIKES_FULL);
  return { score: Math.round(WEIGHTS.record * record + WEIGHTS.clv * clv + WEIGHTS.social * social), record, clv, social };
}
