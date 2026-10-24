// Mock data for StratTrack. Fixtures, scores and odds are fictional prototype data.

export const NOW = new Date('2026-10-23T23:42:00+01:00');

// fixtures: id, date (kickoff, ISO), home, away, derby, openH (opening home odds), odds [H, D, A], ov [Over, Under], bt [Yes, No]
export const FIXTURES = [
  { id: 'F01', kickoff: '2026-10-10T15:00:00+01:00', home: 'Arsenal', away: 'Wolves', derby: false, openH: 1.36, odds: [1.30, 5.80, 9.50], ov: [1.62, 2.30], bt: [2.05, 1.72] },
  { id: 'F02', kickoff: '2026-10-10T15:00:00+01:00', home: 'Brighton', away: 'Fulham', derby: false, openH: 2.25, odds: [2.10, 3.40, 3.50], ov: [2.05, 1.75], bt: [1.80, 1.95] },
  { id: 'F03', kickoff: '2026-10-11T15:00:00+01:00', home: 'Liverpool', away: 'Everton', derby: true, openH: 1.50, odds: [1.45, 4.75, 7.00], ov: [1.65, 2.20], bt: [1.95, 1.80] },
  { id: 'F04', kickoff: '2026-10-11T17:30:00+01:00', home: 'Chelsea', away: 'Bournemouth', derby: false, openH: 1.62, odds: [1.70, 3.90, 4.80], ov: [1.72, 2.10], bt: [1.85, 1.90] },
  { id: 'F05', kickoff: '2026-10-14T20:00:00+01:00', home: 'Man City', away: 'Aston Villa', derby: false, openH: 1.40, odds: [1.35, 5.25, 8.00], ov: [1.60, 2.30], bt: [2.05, 1.70] },
  { id: 'F06', kickoff: '2026-10-15T15:00:00+01:00', home: 'Tottenham', away: 'Man Utd', derby: true, openH: 2.45, odds: [2.60, 3.50, 2.65], ov: [1.85, 1.95], bt: [1.75, 2.05] },
  { id: 'F07', kickoff: '2026-10-17T20:00:00+01:00', home: 'Newcastle', away: 'Crystal Palace', derby: false, openH: 1.95, odds: [1.80, 3.60, 4.40], ov: [2.15, 1.70], bt: [2.30, 1.60] },
  { id: 'F08', kickoff: '2026-10-17T15:00:00+01:00', home: 'West Ham', away: 'Brentford', derby: false, openH: 2.20, odds: [2.40, 3.40, 3.00], ov: [1.90, 1.90], bt: [1.75, 2.00] },
  { id: 'F09', kickoff: '2026-10-18T15:00:00+01:00', home: 'Nottingham Forest', away: 'Sunderland', derby: false, openH: 2.10, odds: [1.95, 3.60, 3.90], ov: [1.85, 1.95], bt: [1.85, 1.90] },
  { id: 'F10', kickoff: '2026-10-18T17:30:00+01:00', home: 'Leeds', away: 'Burnley', derby: false, openH: 1.80, odds: [1.85, 3.70, 4.20], ov: [1.60, 2.30], bt: [1.70, 2.10] },
  { id: 'F11', kickoff: '2026-10-19T15:00:00+01:00', home: 'Arsenal', away: 'Chelsea', derby: true, openH: 1.85, odds: [1.75, 3.80, 4.50], ov: [1.75, 2.05], bt: [1.80, 1.95] },
  { id: 'F12', kickoff: '2026-10-19T15:00:00+01:00', home: 'Everton', away: 'Brighton', derby: false, openH: 2.05, odds: [2.00, 3.40, 3.80], ov: [2.20, 1.68], bt: [2.10, 1.70] },
  { id: 'F13', kickoff: '2026-10-21T20:00:00+01:00', home: 'Man Utd', away: 'Liverpool', derby: true, openH: 2.90, odds: [3.10, 3.60, 2.20], ov: [1.75, 2.05], bt: [1.85, 1.90] },
  { id: 'F14', kickoff: '2026-10-21T15:00:00+01:00', home: 'Aston Villa', away: 'Newcastle', derby: false, openH: 2.40, odds: [2.30, 3.40, 3.10], ov: [1.70, 2.10], bt: [1.70, 2.10] },
  { id: 'F15', kickoff: '2026-10-22T15:00:00+01:00', home: 'Fulham', away: 'West Ham', derby: true, openH: 2.00, odds: [2.15, 3.30, 3.50], ov: [2.10, 1.75], bt: [2.25, 1.65] },
  { id: 'F16', kickoff: '2026-10-22T17:30:00+01:00', home: 'Bournemouth', away: 'Nottingham Forest', derby: false, openH: 2.10, odds: [2.00, 3.40, 3.80], ov: [1.55, 2.45], bt: [1.70, 2.10] },
  { id: 'F17', kickoff: '2026-10-24T17:30:00+01:00', home: 'Wolves', away: 'Liverpool', derby: false, openH: 4.40, odds: [4.20, 3.90, 1.75], ov: [1.85, 1.95], bt: [1.80, 1.95] },
  { id: 'F18', kickoff: '2026-10-24T15:00:00+01:00', home: 'Crystal Palace', away: 'Arsenal', derby: true, openH: 4.30, odds: [4.50, 3.90, 1.70], ov: [2.05, 1.75], bt: [2.10, 1.70] },
  { id: 'F19', kickoff: '2026-10-25T16:00:00+01:00', home: 'Man City', away: 'Tottenham', derby: true, openH: 1.38, odds: [1.30, 5.50, 9.00], ov: [1.55, 2.40], bt: [2.10, 1.65] },
  { id: 'F20', kickoff: '2026-10-25T14:00:00+01:00', home: 'Brentford', away: 'Everton', derby: false, openH: 2.15, odds: [2.25, 3.40, 3.30], ov: [1.90, 1.90], bt: [1.80, 1.95] },
  { id: 'F21', kickoff: '2026-10-26T15:00:00+01:00', home: 'Sunderland', away: 'Leeds', derby: false, openH: 2.20, odds: [2.10, 3.40, 3.50], ov: [1.95, 1.85], bt: [1.85, 1.90] },
  { id: 'F22', kickoff: '2026-10-26T17:30:00+01:00', home: 'Newcastle', away: 'Man Utd', derby: false, openH: 2.30, odds: [2.45, 3.40, 2.90], ov: [1.80, 2.00], bt: [1.75, 2.05] },
];

// Final scores for finished fixtures (mock). Upcoming fixtures have no score.
export const SCORES = {
  F01: [2, 0], F02: [1, 1], F03: [3, 1], F04: [2, 2], F05: [3, 0], F06: [1, 2],
  F07: [1, 0], F08: [0, 3], F09: [2, 1], F10: [3, 2], F11: [2, 1], F12: [0, 0],
  F13: [0, 2], F14: [2, 2], F15: [1, 0], F16: [3, 1],
};

export const isFinished = (fid) => !!SCORES[fid];
export const fixtureById = (fid) => FIXTURES.find((f) => f.id === fid);

export const isoDate = (iso) => new Date(iso);

// Candidate picks a strategy could log for one fixture (market, selection, odds).
export function candidatesFor(f) {
  const fav = f.odds[0] <= f.odds[2] ? 'home' : 'away';
  const drift = +(((f.openH - f.odds[0]) / f.openH) * 100).toFixed(1); // + = home price shortened
  return [
    { fid: f.id, market: 'MW', marketLabel: 'Match Winner', selection: f.home, side: 'home', fav: fav === 'home', drift, odds: f.odds[0] },
    { fid: f.id, market: 'MW', marketLabel: 'Match Winner', selection: 'Draw', side: null, fav: false, drift: null, odds: f.odds[1] },
    { fid: f.id, market: 'MW', marketLabel: 'Match Winner', selection: f.away, side: 'away', fav: fav === 'away', drift: null, odds: f.odds[2] },
    { fid: f.id, market: 'OU', marketLabel: 'Over/Under 2.5', selection: 'Over 2.5', side: null, fav: false, drift: null, ou: 'Over', odds: f.ov[0] },
    { fid: f.id, market: 'OU', marketLabel: 'Over/Under 2.5', selection: 'Under 2.5', side: null, fav: false, drift: null, ou: 'Under', odds: f.ov[1] },
    { fid: f.id, market: 'BTTS', marketLabel: 'BTTS', selection: 'BTTS Yes', side: null, fav: false, drift: null, btts: 'Yes', odds: f.bt[0] },
    { fid: f.id, market: 'BTTS', marketLabel: 'BTTS', selection: 'BTTS No', side: null, fav: false, drift: null, btts: 'No', odds: f.bt[1] },
  ];
}

// Rule evaluation. rules: { markets: ['MW'|'OU'|'BTTS'], side: 'any'|'home'|'away', fav: 'any'|'fav'|'dog', ouSel: 'any'|'Over'|'Under', oddsMin, oddsMax, driftMin }
export function matches(rules, c, f) {
  if (!rules.markets.includes(c.market)) return false;
  if (c.market === 'OU' && rules.ouSel !== 'any' && c.ou !== rules.ouSel) return false;
  if (c.odds < rules.oddsMin || c.odds > rules.oddsMax) return false;
  if (rules.side !== 'any' && c.side !== rules.side) return false;
  if (rules.fav === 'fav' && !c.fav) return false;
  if (rules.fav === 'dog' && (c.market !== 'MW' || c.side === null || c.fav)) return false;
  if (rules.driftMin > 0) {
    if (c.drift === null || c.drift < rules.driftMin) return false;
  }
  return true;
}

// Result of a candidate given a score.
export function resultOf(c, score) {
  if (!score) return 'pending';
  const [h, a] = score;
  const total = h + a;
  switch (c.market) {
    case 'MW':
      if (c.selection === 'Draw') return h === a ? 'won' : 'lost';
      if (c.side === 'home') return h > a ? 'won' : 'lost';
      return a > h ? 'won' : 'lost';
    case 'OU':
      return (c.ou === 'Over' ? total > 2.5 : total < 2.5) ? 'won' : 'lost';
    case 'BTTS':
      return ((h > 0 && a > 0) === (c.btts === 'Yes')) ? 'won' : 'lost';
    default:
      return 'pending';
  }
}

export const STRATEGIES = [
  { id: 's1', name: 'Home Favs 1.4–1.9', sport: 'Football', league: 'EPL', rules: { markets: ['MW'], side: 'home', fav: 'fav', ouSel: 'any', oddsMin: 1.4, oddsMax: 1.9, driftMin: 0 }, created: '2026-09-28', color: '#22c55e' },
  { id: 's2', name: 'Over 2.5 Open Games', sport: 'Football', league: 'EPL', rules: { markets: ['OU'], side: 'any', fav: 'any', ouSel: 'Over', oddsMin: 1.7, oddsMax: 2.2, driftMin: 0 }, created: '2026-09-30', color: '#f59e0b' },
  { id: 's3', name: 'BTTS Yes Value', sport: 'Football', league: 'EPL', rules: { markets: ['BTTS'], side: 'any', fav: 'any', ouSel: 'any', oddsMin: 1.6, oddsMax: 2.2, driftMin: 0 }, created: '2026-10-02', color: '#38bdf8' },
  { id: 's4', name: 'Away Value Hunter', sport: 'Football', league: 'EPL', rules: { markets: ['MW'], side: 'away', fav: 'dog', ouSel: 'any', oddsMin: 2.8, oddsMax: 4.5, driftMin: 0 }, created: '2026-10-03', color: '#a78bfa' },
  { id: 's5', name: 'Shortening Home Drift', sport: 'Football', league: 'EPL', rules: { markets: ['MW'], side: 'home', fav: 'any', ouSel: 'any', oddsMin: 1.5, oddsMax: 3.0, driftMin: 4 }, created: '2026-10-05', color: '#f43f5e' },
  { id: 's6', name: 'Under 2.5 Tight Matches', sport: 'Football', league: 'EPL', rules: { markets: ['OU'], side: 'any', fav: 'any', ouSel: 'Under', oddsMin: 1.6, oddsMax: 2.2, driftMin: 0 }, created: '2026-10-06', color: '#14b8a6' },
];

// Pool of all candidate picks across fixtures (for builder preview and seed).
export function candidatePool() {
  const out = [];
  for (const f of FIXTURES) for (const c of candidatesFor(f)) out.push({ ...c, fixture: f });
  return out;
}

// Seed picks for each strategy: all matching candidates, capped to keep ~40 total. Earliest picks first, pending picks always kept.
const CAPS = { s1: 5, s2: 8, s3: 9, s4: 4, s5: 6, s6: 8 }; // total 40 picks
export function seedPicks() {
  const pool = candidatePool();
  const result = {};
  for (const s of STRATEGIES) {
    const m = pool.filter((c) => matches(s.rules, c, c.fixture));
    // keep the timeline sane: one pick per fixture per strategy
    const seen = new Set();
    const uniq = m.filter((c) => { if (seen.has(c.fid)) return false; seen.add(c.fid); return true; });
    const sorted = uniq.sort((a, b) => new Date(a.fixture.kickoff) - new Date(b.fixture.kickoff));
    const cap = CAPS[s.id];
    const pend = sorted.filter((c) => !isFinished(c.fid));
    const settled = sorted.filter((c) => isFinished(c.fid));
    result[s.id] = [...settled.slice(-(cap - pend.length)), ...pend].sort((a, b) => new Date(a.fixture.kickoff) - new Date(b.fixture.kickoff));
  }
  return result;
}

// Stats for a strategy's picks given results (map fid -> score). Returns settled picks with result attached.
export function settledPicks(picks, scores) {
  return picks.map((p) => {
    const score = scores[p.fid];
    return { ...p, result: resultOf(p, score), score };
  });
}

export function statsOf(picks, scores) {
  const sp = settledPicks(picks, scores);
  const won = sp.filter((p) => p.result === 'won').length;
  const lost = sp.filter((p) => p.result === 'lost').length;
  const pending = sp.filter((p) => p.result === 'pending').length;
  const settled = won + lost;
  const winrate = settled ? Math.round((won / settled) * 100) : null;
  // current streak from latest settled backwards
  let streak = 0;
  let streakType = null;
  const chron = sp.filter((p) => p.result !== 'pending').sort((a, b) => new Date(a.fixture.kickoff) - new Date(b.fixture.kickoff));
  for (let i = chron.length - 1; i >= 0; i--) {
    const r = chron[i].result;
    if (streakType === null) streakType = r;
    if (r !== streakType) break;
    streak++;
  }
  // running winrate series for chart
  let w = 0, s2 = 0;
  const series = chron.map((p) => { if (p.result === 'won') w++; s2++; return Math.round((w / s2) * 100); });
  // credibility: smoothed winrate, with a 'learning' flag until 3 settled
  const credibility = Math.round(((won + 1) / (settled + 2)) * 100);
  return { won, lost, pending, settled, winrate, streak, streakType, series, credibility, chron };
}

// Credibility insight from settled picks. Returns text + bucket details.
export function insightOf(settledList) {
  const s = settledList.filter((p) => p.result === 'won' || p.result === 'lost');
  if (s.length < 3) return { text: `still learning (${s.length}/3 settled picks)`, tone: 'muted', dims: [] };
  const wr = (arr) => (arr.length ? arr.filter((p) => p.result === 'won').length / arr.length : null);
  const dims = [
    { name: ['derbies', 'regular fixtures'], a: s.filter((p) => p.fixture.derby), b: s.filter((p) => !p.fixture.derby) },
    { name: ['at home', 'on the road'], a: s.filter((p) => p.side === 'home'), b: s.filter((p) => p.side === 'away') },
    { name: ['short prices', 'bigger prices'], a: s.filter((p) => p.odds < 2), b: s.filter((p) => p.odds >= 2) },
  ];
  let best = null;
  for (const d of dims) {
    if (d.a.length < 2 || d.b.length < 2) continue;
    const ra = wr(d.a), rb = wr(d.b);
    const gap = Math.abs(ra - rb);
    if (!best || gap > best.gap) best = { gap, d, ra, rb };
  }
  if (!best || best.gap < 0.2) return { text: `no clear split yet across ${s.length} settled picks`, tone: 'muted', dims: [] };
  const good = best.ra >= best.rb ? 0 : 1;
  const bad = 1 - good;
  const goodWr = Math.round((good === 0 ? best.ra : best.rb) * 100);
  const badWr = Math.round((good === 0 ? best.rb : best.ra) * 100);
  return {
    text: `edge holds ${best.d.name[good]} (${goodWr}%), collapses ${best.d.name[bad]} (${badWr}%)`,
    tone: 'good',
    dims: [],
  };
}

// Memory log: how the credibility insight changed after each settled result.
export function memoryLog(picks, scores) {
  const sp = settledPicks(picks, scores).filter((p) => p.result !== 'pending').sort((a, b) => new Date(a.fixture.kickoff) - new Date(b.fixture.kickoff));
  const log = [];
  let last = null;
  for (let k = 1; k <= sp.length; k++) {
    const pref = sp.slice(0, k);
    const ins = insightOf(pref).text;
    const p = sp[k - 1];
    if (ins !== last) {
      log.push({ at: p.fixture.kickoff, after: `${p.fixture.home} v ${p.fixture.away}`, result: p.result, text: ins, changed: last !== null });
      last = ins;
    }
  }
  return log;
}

