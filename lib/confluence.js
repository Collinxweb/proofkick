// Strategy rules: a SCOPE (leagues, days) plus SIGNALS, and a confluence threshold (how many signals must agree).
// Pure functions, safe to run in the browser (live preview) and on the server (validation).
export const LEAGUES = [
  ["soccer_epl", "Premier League"], ["soccer_spain_la_liga", "La Liga"], ["soccer_germany_bundesliga", "Bundesliga"],
  ["soccer_italy_serie_a", "Serie A"], ["soccer_france_ligue_one", "Ligue 1"], ["soccer_uefa_champs_league", "Champions League"],
];
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const OUTCOMES = { home: "Home Win", draw: "Draw", away: "Away Win" };
const LEAGUE_NAME = Object.fromEntries(LEAGUES);

export const SIGNALS = {
  odds: { label: "Odds range", hint: "Only back prices inside a sensible band.", fields: [["min", "Min"], ["max", "Max"]], defaults: { min: "1.8", max: "2.3" } },
  prob: { label: "Market probability", hint: "Chance the bookmakers collectively give your pick, with their margin removed.", fields: [["min", "Min %"]], defaults: { min: "45" } },
  role: { label: "Favourite or underdog", hint: "Whether the market rates your pick as the favourite.", choice: ["favourite", "underdog"], defaults: { value: "favourite" } },
  gap: { label: "Mismatch size", hint: "Gap between home and away odds. A big gap means a clear favourite.", fields: [["min", "Min gap"]], defaults: { min: "1" } },
  margin: { label: "Market sharpness", hint: "Low bookmaker margin means prices sit closer to fair value.", fields: [["max", "Max margin %"]], defaults: { max: "7" } },
  books: { label: "Bookmaker agreement", hint: "More bookmakers pricing the match gives a steadier consensus.", fields: [["min", "Min bookmakers"]], defaults: { min: "6" } },
  hours: { label: "Kick-off window", hint: "Hours in UTC (Nigeria is UTC+1).", fields: [["from", "From hour"], ["to", "To hour"]], defaults: { from: "12", to: "22" } },
  // Team stats, built from finished matches this season (football-data.org). Need team stats to be loaded.
  form: { label: "Recent form", hint: "Points the pick side took in its last 5 matches (max 15).", fields: [["min", "Min points"]], defaults: { min: "9" } },
  formGap: { label: "Form advantage", hint: "Last-5 points of the pick side minus the opponent's.", fields: [["min", "Min gap"]], defaults: { min: "4" } },
  venuePpg: { label: "Home or away record", hint: "Points per game the pick side takes at this venue (home team at home, away team away).", fields: [["min", "Min points/game"]], defaults: { min: "1.8" } },
  goalsFor: { label: "Scoring at this venue", hint: "Goals the pick side scores per game at this venue.", fields: [["min", "Min goals/game"]], defaults: { min: "1.6" } },
  goalsAgainst: { label: "Leaky opponent", hint: "Goals the opponent concedes per game at its own venue.", fields: [["min", "Min goals/game"]], defaults: { min: "1.4" } },
  tableGap: { label: "League position gap", hint: "How many places the pick side sits above the opponent.", fields: [["min", "Min places"]], defaults: { min: "5" } },
  rest: { label: "Rest days", hint: "Days since the pick side last played.", fields: [["min", "Min days"]], defaults: { min: "4" } },
  btts: { label: "Both teams score rate", hint: "Average share of both teams' matches where both sides scored.", fields: [["min", "Min %"]], defaults: { min: "55" } },
  over25: { label: "Over 2.5 goals rate", hint: "Average share of both teams' matches with 3 or more goals.", fields: [["min", "Min %"]], defaults: { min: "55" } },
};
export const STAT_SIGNALS = ["form", "formGap", "venuePpg", "goalsFor", "goalsAgainst", "tableGap", "rest", "btts", "over25"];
export const SIDE_SIGNALS = ["form", "formGap", "venuePpg", "goalsFor", "goalsAgainst", "tableGap", "rest"]; // need a home or away pick
const RANGES = { form: [0, 15], formGap: [-15, 15], venuePpg: [0, 3], goalsFor: [0, 5], goalsAgainst: [0, 5], tableGap: [1, 19], rest: [0, 30], btts: [1, 99], over25: [1, 99] };

export const TEMPLATES = {
  "Value favourite": { selection: "home", signals: { role: { value: "favourite" }, odds: { min: "1.5", max: "2.2" }, prob: { min: "48" }, margin: { max: "7" } }, required: 3 },
  "Safe banker": { selection: "home", signals: { prob: { min: "65" }, books: { min: "6" }, margin: { max: "7" } }, required: 3 },
  "Underdog hunter": { selection: "away", signals: { role: { value: "underdog" }, odds: { min: "3", max: "6" }, gap: { min: "1.5" } }, required: 2 },
  "Form favourite": { selection: "home", signals: { form: { min: "10" }, venuePpg: { min: "2" }, role: { value: "favourite" }, goalsAgainst: { min: "1.3" } }, required: 3 },
  "Goals expected": { selection: "home", signals: { btts: { min: "55" }, over25: { min: "55" }, goalsFor: { min: "1.5" } }, required: 2 },
};

const num = (v) => (v === "" || v == null ? NaN : Number(v));

export function buildRules(input) {
  const sel = input.selection;
  if (!OUTCOMES[sel]) return { error: "Pick an outcome." };
  const out = [], seen = new Set();
  for (const raw of input.signals ?? []) {
    if (!SIGNALS[raw.id] || seen.has(raw.id)) return { error: "Unknown or repeated signal." };
    seen.add(raw.id);
    const s = { id: raw.id };
    if (raw.id === "odds") {
      const min = num(raw.min), max = num(raw.max);
      if (!(min >= 1.01 && max > min && max <= 50)) return { error: "Odds range: min 1.01 or more, max above min and at most 50." };
      Object.assign(s, { min, max });
    } else if (raw.id === "prob") {
      const min = num(raw.min); if (!(min >= 1 && min <= 99)) return { error: "Probability must be 1 to 99%." }; s.min = min;
    } else if (raw.id === "role") {
      if (!["favourite", "underdog"].includes(raw.value)) return { error: "Choose favourite or underdog." }; s.value = raw.value;
    } else if (raw.id === "gap") {
      const min = num(raw.min); if (!(min >= 0.1 && min <= 50)) return { error: "Mismatch gap must be 0.1 to 50." }; s.min = min;
    } else if (raw.id === "margin") {
      const max = num(raw.max); if (!(max >= 1 && max <= 30)) return { error: "Margin must be 1 to 30%." }; s.max = max;
    } else if (raw.id === "books") {
      const min = num(raw.min); if (!(Number.isInteger(min) && min >= 1 && min <= 40)) return { error: "Bookmakers must be a whole number from 1 to 40." }; s.min = min;
    } else if (raw.id === "hours") {
      const from = num(raw.from), to = num(raw.to);
      if (!(Number.isInteger(from) && Number.isInteger(to) && from >= 0 && from <= 23 && to >= 0 && to <= 23 && from !== to)) return { error: "Kick-off hours must be two different whole numbers from 0 to 23." };
      Object.assign(s, { from, to });
    } else if (RANGES[raw.id]) {
      const [lo, hi] = RANGES[raw.id], v = num(raw.min);
      if (!(v >= lo && v <= hi)) return { error: `${SIGNALS[raw.id].label}: enter a value from ${lo} to ${hi}.` };
      s.min = v;
    }
    out.push(s);
  }
  if (!out.length) return { error: "Turn on at least one signal." };
  const required = Math.min(Math.max(Math.round(num(input.required)) || out.length, 1), out.length);
  const leagues = (input.leagues ?? []).filter((l) => LEAGUE_NAME[l]);
  const days = (input.days ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  // `conditions` mirrors the rules in the older flat format so anything reading that shape keeps working.
  const conditions = [];
  if (leagues.length) conditions.push({ field: "league", op: "in", value: leagues });
  if (days.length) conditions.push({ field: "weekday", op: "in", value: days });
  for (const s of out) conditions.push(s.id === "odds" ? { field: "odds", op: "between", value: [s.min, s.max] } : { field: s.id, op: "signal", value: s });
  return { rules: { version: 2, market: "h2h", selection: sel, scope: { leagues, days }, signals: out, confluence: { required, of: out.length },
    description: String(input.description ?? "").trim().slice(0, 200), conditions } };
}

// Understands v2 rules and the older flat `conditions` format.
function normalize(r) {
  if (r.signals) return r;
  const scope = { leagues: [], days: [] }, signals = [];
  for (const c of r.conditions ?? []) {
    if (c.field === "league") scope.leagues = c.value;
    else if (c.field === "weekday") scope.days = c.value;
    else if (c.field === "odds") signals.push({ id: "odds", min: c.value[0], max: c.value[1] });
  }
  return { ...r, scope, signals, confluence: { required: signals.length } };
}

export function derive(odds, sel) {
  const { home, draw, away } = odds ?? {};
  if (!(home > 1 && draw > 1 && away > 1) || !(odds[sel] > 1)) return null;
  const sum = 1 / home + 1 / draw + 1 / away;
  return { price: odds[sel], prob: 1 / odds[sel] / sum, margin: sum - 1, gap: Math.abs(home - away), books: odds.books ?? 0,
    favourite: sel !== "draw" && odds[sel] <= Math.min(home, away) };
}

function passes(s, d, hour, ctx, sel) {
  const side = sel === "home" ? "home" : sel === "away" ? "away" : null;
  const S = side && ctx ? ctx[side] : null, O = side && ctx ? ctx[side === "home" ? "away" : "home"] : null;
  switch (s.id) {
    case "form": return S ? S.last5pts >= s.min : false;
    case "formGap": return S && O ? S.last5pts - O.last5pts >= s.min : false;
    case "venuePpg": return (S?.venuePpg ?? -1) >= s.min;
    case "goalsFor": return (S?.venueGf ?? -1) >= s.min;
    case "goalsAgainst": return (O?.venueGa ?? -1) >= s.min;
    case "tableGap": return S && O ? O.pos - S.pos >= s.min : false;
    case "rest": return S ? S.rest >= s.min : false;
    case "btts": return ctx ? ((ctx.home.bttsRate + ctx.away.bttsRate) / 2) * 100 >= s.min : false;
    case "over25": return ctx ? ((ctx.home.over25Rate + ctx.away.over25Rate) / 2) * 100 >= s.min : false;
    case "odds": return d.price >= s.min && d.price <= s.max;
    case "prob": return d.prob * 100 >= s.min;
    case "role": return (s.value === "favourite") === d.favourite;
    case "gap": return d.gap >= s.min;
    case "margin": return d.margin * 100 <= s.max;
    case "books": return d.books >= s.min;
    case "hours": return s.from < s.to ? hour >= s.from && hour < s.to : hour >= s.from || hour < s.to;
    default: return false;
  }
}

// fx: { league, kickoff_at, odds:{home,draw,away,books} }  ->  how many signals agree, and whether the pick fires.
export function evaluate(rules, fx, selection = rules.selection) {
  const r = normalize({ ...rules, selection });
  const d = derive(fx.odds, selection);
  if (!d) return { eligible: false, pass: false, passed: [], failed: [], score: 0, required: 0, total: 0 };
  const k = new Date(fx.kickoff_at);
  const scopeOk = (!r.scope?.leagues?.length || r.scope.leagues.includes(fx.league)) && (!r.scope?.days?.length || r.scope.days.includes(k.getUTCDay()));
  const passed = r.signals.filter((s) => passes(s, d, k.getUTCHours(), fx.context, selection)).map((s) => s.id);
  const required = Math.min(r.confluence?.required ?? r.signals.length, r.signals.length);
  return { eligible: true, needsStats: r.signals.some((s) => STAT_SIGNALS.includes(s.id)) && !fx.context, scopeOk, passed, failed: r.signals.map((s) => s.id).filter((id) => !passed.includes(id)), score: passed.length, required, total: r.signals.length,
    pass: scopeOk && passed.length >= required };
}

function sigText(s) {
  switch (s.id) {
    case "odds": return `odds ${s.min} to ${s.max}`;
    case "prob": return `market probability at least ${s.min}%`;
    case "role": return `pick is the ${s.value}`;
    case "gap": return `home/away odds gap at least ${s.min}`;
    case "margin": return `bookmaker margin at most ${s.max}%`;
    case "books": return `at least ${s.min} bookmakers pricing it`;
    case "hours": return `kick-off ${s.from}:00 to ${s.to}:00 UTC`;
    case "form": return `last-5 form at least ${s.min} points`;
    case "formGap": return `form ${s.min}+ points better than the opponent`;
    case "venuePpg": return `at least ${s.min} points per game at this venue`;
    case "goalsFor": return `scores ${s.min}+ goals per game at this venue`;
    case "goalsAgainst": return `opponent concedes ${s.min}+ goals per game`;
    case "tableGap": return `${s.min}+ places above the opponent`;
    case "rest": return `at least ${s.min} rest days`;
    case "btts": return `both-teams-score rate at least ${s.min}%`;
    case "over25": return `over 2.5 goals rate at least ${s.min}%`;
    default: return s.id;
  }
}

export function describe(rules) {
  const r = normalize(rules), parts = [`Back ${OUTCOMES[r.selection]}`];
  if (r.scope?.leagues?.length) parts.push(`in ${r.scope.leagues.map((l) => LEAGUE_NAME[l]).join(", ")}`);
  if (r.scope?.days?.length) parts.push(`on ${r.scope.days.map((d) => DAYS[d]).join(", ")}`);
  const sig = r.signals.map(sigText);
  if (sig.length === 1) parts.push(`when ${sig[0]}`);
  else if (sig.length) parts.push(`when ${r.confluence.required >= sig.length ? "all" : `at least ${r.confluence.required} of`} ${sig.length} signals agree: ${sig.join("; ")}`);
  return parts.join(" ");
}
