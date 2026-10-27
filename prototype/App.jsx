import React, { useMemo, useState } from 'react';
import {
  STRATEGIES, FIXTURES, SCORES, seedPicks, statsOf, settledPicks, insightOf, memoryLog,
  candidatePool, matches, resultOf, isFinished, fixtureById,
} from './data.js';

const PICKS_SEED = seedPicks();
const shortDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const shortTime = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fmtKick = (iso) => `${shortDate(iso)} · ${shortTime(iso)}`;

const MARKET_SHORT = { MW: 'MW', OU: 'O/U', BTTS: 'BTTS' };

function Spark({ data, color, w = 180, h = 44 }) {
  if (!data || data.length < 2) return <svg width={w} height={h} className="spark" />;
  const min = Math.min(...data), max = Math.max(...data);
  const range = Math.max(1, max - min);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * (w - 4) + 2, h - 4 - ((v - min) / range) * (h - 8)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L${pts[pts.length - 1][0]},${h} L${pts[0][0]},${h} Z`;
  const gid = `g${color.replace('#', '')}`;
  return (
    <svg width={w} height={h} className="spark" viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />
    </svg>
  );
}

function ResultPill({ r }) {
  return <span className={`pill res-${r}`}>{r === 'pending' ? 'pending' : r === 'won' ? 'won' : r === 'lost' ? 'lost' : 'push'}</span>;
}

function sportBadge(s) {
  return <span className="badge sport">⚽ {s.sport} · {s.league}</span>;
}

function ruleSummary(r) {
  const mk = r.markets.map((m) => ({ MW: 'Match Winner', OU: 'Over/Under', BTTS: 'BTTS' }[m])).join(', ');
  const side = r.side === 'any' ? 'any side' : r.side === 'home' ? 'home' : 'away';
  const fav = r.fav === 'any' ? '' : r.fav === 'fav' ? ', favourite' : ', underdog';
  const ou = r.markets.includes('OU') && r.ouSel !== 'any' ? ` (${r.ouSel} 2.5)` : '';
  const drift = r.driftMin > 0 ? `, drift ≥ ${r.driftMin}%` : '';
  return `${mk}${ou} · ${side}${fav}${drift} · odds ${r.oddsMin.toFixed(2)}–${r.oddsMax.toFixed(2)}`;
}

/* ---------- Dashboard ---------- */
function Dashboard({ strategies, picks, onOpen, onNew, pref, sortMode, setSortMode }) {
  const cards = strategies.map((s) => {
    const st = statsOf(picks[s.id], SCORES);
    const insight = insightOf(settledPicks(picks[s.id], SCORES));
    return { s, st, insight };
  });
  const sorted = [...cards].sort((a, b) => {
    if (sortMode === 'winrate') return (b.st.winrate ?? -1) - (a.st.winrate ?? -1);
    if (sortMode === 'streak') return b.st.streak - a.st.streak;
    return 0;
  });
  const totalPicks = cards.reduce((n, c) => n + c.st.won + c.st.lost + c.st.pending, 0);
  const totalPending = cards.reduce((n, c) => n + c.st.pending, 0);
  return (
    <div className="page">
      <div className="hero">
        <div>
          <div className="eyebrow">Public track records · EPL 2026/27</div>
          <h1>Your strategies, scored.</h1>
          <p className="muted">Picks are auto-logged before kickoff and graded after full time. Memory updates every card as results land.</p>
        </div>
        <div className="kpis">
          <div className="kpi"><span>Strategies</span><b>{strategies.length}</b></div>
          <div className="kpi"><span>Picks logged</span><b>{totalPicks}</b></div>
          <div className="kpi"><span>Pending</span><b className="accent">{totalPending}</b></div>
          <div className="kpi"><span>Memory</span><b className="mem">{pref.label}</b></div>
        </div>
      </div>
      <div className="toolbar">
        <div className="seg">
          {[['default', 'Newest'], ['winrate', 'Top winrate'], ['streak', 'Hot streak']].map(([k, l]) => (
            <button key={k} className={sortMode === k ? 'on' : ''} onClick={() => setSortMode(k)}>{l}</button>
          ))}
        </div>
        <button className="btn primary" onClick={onNew}>+ New strategy</button>
      </div>
      <div className="grid">
        {sorted.map(({ s, st, insight }) => {
          const hidden = pref.hiddenSports?.includes(s.id);
          return (
            <article key={s.id} className="card" onClick={() => onOpen(s.id)} style={{ '--c': s.color }}>
              <div className="card-top">
                <div>
                  {sportBadge(s)}
                  <h3>{s.name}</h3>
                  <div className="rules-line">{ruleSummary(s.rules)}</div>
                </div>
                <div className="wr">
                  <b>{st.winrate ?? '–'}{st.winrate !== null ? '%' : ''}</b>
                  <span>winrate</span>
                </div>
              </div>
              <div className="card-mid">
                <div className="rec">
                  <span className="w">{st.won}W</span>
                  <span className="l">{st.lost}L</span>
                  <span className="p">{st.pending}P</span>
                </div>
                <div className={`streak ${st.streakType === 'won' ? 'hot' : st.streakType === 'lost' ? 'cold' : ''}`}>
                  {st.streak ? `${st.streakType === 'won' ? '🔥' : '❄'} ${st.streak} ${st.streakType === 'won' ? 'win' : 'loss'} streak` : 'no streak yet'}
                </div>
              </div>
              <Spark data={st.series} color={s.color} />
              <div className={`memory ${insight.tone}`}>
                <span className="mtag">memory</span>
                <span>{insight.text}</span>
              </div>
              {hidden && <div className="pref-note">hidden by your preference: bigger prices</div>}
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Builder ---------- */
function Builder({ onSave, onCancel }) {
  const [name, setName] = useState('My new strategy');
  const [markets, setMarkets] = useState(['MW']);
  const [oddsMin, setOddsMin] = useState(1.5);
  const [oddsMax, setOddsMax] = useState(2.5);
  const [side, setSide] = useState('any');
  const [fav, setFav] = useState('any');
  const [driftMin, setDriftMin] = useState(0);
  const [ouSel, setOuSel] = useState('any');

  const rules = { markets, side, fav, ouSel, oddsMin, oddsMax, driftMin };
  const preview = useMemo(() => {
    const pool = candidatePool().filter((c) => isFinished(c.fid));
    const picked = pool.filter((c) => matches(rules, c, c.fixture));
    const seen = new Set();
    const uniq = picked.filter((c) => { if (seen.has(c.fid)) return false; seen.add(c.fid); return true; });
    const won = uniq.filter((c) => resultOf(c, SCORES[c.fid]) === 'won').length;
    return { n: uniq.length, won, wr: uniq.length ? Math.round((won / uniq.length) * 100) : null, sample: uniq.slice(0, 6) };
  }, [markets, oddsMin, oddsMax, side, fav, driftMin, ouSel]);

  const toggleMarket = (m) => setMarkets((cur) => (cur.includes(m) ? (cur.length > 1 ? cur.filter((x) => x !== m) : cur) : [...cur, m]));

  return (
    <div className="page">
      <div className="crumb"><button className="link" onClick={onCancel}>← Dashboard</button></div>
      <h1>Build a strategy</h1>
      <p className="muted">Three rule types only. The preview runs your rules against the last 30 days of EPL results.</p>
      <div className="builder">
        <div className="form">
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <div className="field">
            <span>1 · Market filter</span>
            <div className="chips">
              {[['MW', 'Match Winner'], ['OU', 'Over / Under 2.5'], ['BTTS', 'BTTS']].map(([k, l]) => (
                <button key={k} className={markets.includes(k) ? 'chip on' : 'chip'} onClick={() => toggleMarket(k)}>{l}</button>
              ))}
            </div>
            {markets.includes('OU') && (
              <div className="sub">
                <span className="muted small">O/U side:</span>
                <div className="seg small">
                  {['any', 'Over', 'Under'].map((o) => (
                    <button key={o} className={ouSel === o ? 'on' : ''} onClick={() => setOuSel(o)}>{o === 'any' ? 'Either' : o}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="field">
            <span>2 · Odds range <em className="muted">{oddsMin.toFixed(2)} – {oddsMax.toFixed(2)}</em></span>
            <div className="range2">
              <input type="range" min="1.2" max="6" step="0.05" value={oddsMin} onChange={(e) => setOddsMin(Math.min(+e.target.value, oddsMax - 0.05))} />
              <input type="range" min="1.2" max="6" step="0.05" value={oddsMax} onChange={(e) => setOddsMax(Math.max(+e.target.value, oddsMin + 0.05))} />
            </div>
            <div className="ticks"><span>1.20</span><span>3.00</span><span>6.00</span></div>
          </div>

          <div className="field">
            <span>3 · Condition</span>
            <div className="cond-grid">
              <div>
                <div className="muted small">Home / away</div>
                <div className="seg">
                  {[['any', 'Any'], ['home', 'Home'], ['away', 'Away']].map(([k, l]) => (
                    <button key={k} className={side === k ? 'on' : ''} onClick={() => setSide(k)}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="muted small">Favourite / underdog</div>
                <div className="seg">
                  {[['any', 'Any'], ['fav', 'Fav'], ['dog', 'Dog']].map(([k, l]) => (
                    <button key={k} className={fav === k ? 'on' : ''} onClick={() => setFav(k)}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="muted small">Odds drift ≥ {driftMin}% (price shortened since open)</div>
                <input type="range" min="0" max="15" step="1" value={driftMin} onChange={(e) => setDriftMin(+e.target.value)} />
              </div>
            </div>
          </div>

          <div className="form-foot">
            <button className="btn ghost" onClick={onCancel}>Cancel</button>
            <button className="btn primary" onClick={() => onSave({ name, sport: 'Football', league: 'EPL', rules })}>Save strategy</button>
          </div>
        </div>

        <aside className="preview">
          <div className="eyebrow">Live preview · last 30 days</div>
          <div className="prev-stats">
            <div><b>{preview.n}</b><span>matching picks</span></div>
            <div><b>{preview.wr !== null ? `${preview.wr}%` : '–'}</b><span>winrate</span></div>
            <div><b>{preview.won}W-{preview.n - preview.won}L</b><span>record</span></div>
          </div>
          <div className="sample">
            {preview.sample.length === 0 && <div className="muted">No fixture matches these rules. Widen the odds range.</div>}
            {preview.sample.map((c) => {
              const r = resultOf(c, SCORES[c.fid]);
              return (
                <div className="sample-row" key={c.fid + c.selection}>
                  <div>
                    <div className="ev">{c.fixture.home} v {c.fixture.away}</div>
                    <div className="muted small">{c.selection} @ {c.odds.toFixed(2)} · {fmtKick(c.fixture.kickoff)}</div>
                  </div>
                  <ResultPill r={r} />
                </div>
              );
            })}
          </div>
          <p className="muted small">Winrate is calculated from final scores in the mock dataset. Live strategies log picks before kickoff only.</p>
        </aside>
      </div>
    </div>
  );
}

/* ---------- Detail ---------- */
function WinrateChart({ series, color }) {
  const W = 620, H = 200, P = 28;
  const n = series.length;
  if (n < 2) return <div className="muted">Need at least 2 settled picks for a chart.</div>;
  const x = (i) => P + (i / (n - 1)) * (W - P * 2);
  const y = (v) => H - P - (v / 100) * (H - P * 2);
  const d = series.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${d} L${x(n - 1)},${H - P} L${x(0)},${H - P} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart">
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={P} x2={W - P} y1={y(g)} y2={y(g)} className="grid-line" />
          <text x={4} y={y(g) + 4} className="axis">{g}%</text>
        </g>
      ))}
      <line x1={P} x2={W - P} y1={y(50)} y2={y(50)} className="midline" />
      <path d={area} fill={color} opacity="0.12" />
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      {series.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3.2" fill={color} />)}
      <text x={P} y={H - 6} className="axis">first settled pick</text>
      <text x={W - P} y={H - 6} textAnchor="end" className="axis">latest</text>
    </svg>
  );
}

function Detail({ strategy, picks, onBack, onBook }) {
  const sp = settledPicks(picks, SCORES).sort((a, b) => new Date(a.fixture.kickoff) - new Date(b.fixture.kickoff));
  const st = statsOf(picks, SCORES);
  const log = memoryLog(picks, SCORES);
  const ins = insightOf(sp);
  return (
    <div className="page">
      <div className="crumb"><button className="link" onClick={onBack}>← Dashboard</button></div>
      <div className="detail-head">
        <div>
          {sportBadge(strategy)}
          <h1>{strategy.name}</h1>
          <div className="muted">{ruleSummary(strategy.rules)}</div>
        </div>
        <div className="head-actions">
          <div className="wr big"><b style={{ color: strategy.color }}>{st.winrate ?? '–'}{st.winrate !== null ? '%' : ''}</b><span>winrate · {st.won}W {st.lost}L {st.pending}P</span></div>
          <button className="btn primary" onClick={onBook}>Export to booking</button>
        </div>
      </div>

      <div className="detail-grid">
        <section className="panel">
          <div className="panel-h"><h3>Winrate over settled picks</h3><span className="muted small">running average</span></div>
          <WinrateChart series={st.series} color={strategy.color} />
        </section>

        <section className="panel memory-panel">
          <div className="panel-h"><h3>Credibility memory</h3><span className="mtag">walrus</span></div>
          <div className={`mem-now ${ins.tone}`}>{ins.text}</div>
          <div className="mem-score">
            <div><b>{st.credibility}</b><span>credibility score</span></div>
            <div><b>{st.settled}</b><span>settled picks</span></div>
            <div><b>{st.streak}{st.streakType === 'won' ? 'W' : st.streakType === 'lost' ? 'L' : ''}</b><span>streak</span></div>
          </div>
          <div className="mem-log">
            {log.length === 0 && <div className="muted small">Memory writes start after the first result.</div>}
            {log.slice(-5).reverse().map((l, i) => (
              <div className="mem-row" key={i}>
                <div className="small muted">{fmtKick(l.at)} · {l.result}</div>
                <div className="small">{l.after}</div>
                <div className={`small ${l.changed ? 'changed' : ''}`}>{l.changed ? '↻ ' : ''}{l.text}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-h"><h3>Logged picks</h3><span className="muted small">{picks.length} picks · auto-logged before kickoff</span></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Event</th><th>Market</th><th>Selection</th><th>Odds (logged)</th><th>Kickoff</th><th>Score</th><th>Result</th></tr>
            </thead>
            <tbody>
              {[...sp].reverse().map((p) => (
                <tr key={p.fid + p.market + p.selection}>
                  <td>{p.fixture.home} v {p.fixture.away}</td>
                  <td>{p.marketLabel}</td>
                  <td>{p.selection}</td>
                  <td className="num">{p.odds.toFixed(2)}</td>
                  <td>{fmtKick(p.fixture.kickoff)}</td>
                  <td className="num">{p.score ? `${p.score[0]}–${p.score[1]}` : '–'}</td>
                  <td><ResultPill r={p.result} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ---------- Booking modal ---------- */
function codeFor(seed) {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let out = '';
  for (let i = 0; i < 5; i++) { out += alphabet[Math.abs(h) % alphabet.length]; h = Math.imul(h ^ (i + 7), 16777619) >>> 0; }
  return `SPRT-${out}`;
}

function BookingModal({ strategy, picks, onClose }) {
  const [platform, setPlatform] = useState('SportyBet');
  const [picked, setPicked] = useState(() => picks.filter((p) => !isFinished(p.fid)).map((p) => p.fid + p.selection));
  const [code, setCode] = useState(null);
  const upcoming = picks.filter((p) => !isFinished(p.fid));
  const selected = upcoming.filter((p) => picked.includes(p.fid + p.selection));
  const total = selected.reduce((acc, p) => acc * p.odds, 1);
  const deep = platform === 'SportyBet' ? 'https://www.sportybet.com/ng/sport/football' : 'https://sports.bet9ja.com/';
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="panel-h"><h3>Export bet slip</h3><button className="link" onClick={onClose}>✕</button></div>
        <p className="muted small">StratTrack never touches your account. It maps the picks to markets on the platform and produces a booking code you load yourself.</p>
        <div className="field">
          <span>Platform</span>
          <div className="seg">
            {['SportyBet', 'Bet9ja'].map((p) => (
              <button key={p} className={platform === p ? 'on' : ''} onClick={() => { setPlatform(p); setCode(null); }}>{p}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Picks to include ({selected.length} of {upcoming.length} upcoming)</span>
          <div className="pick-list">
            {upcoming.length === 0 && <div className="muted small">No upcoming picks to export. Pending picks appear here before kickoff.</div>}
            {upcoming.map((p) => {
              const key = p.fid + p.selection;
              const on = picked.includes(key);
              return (
                <label key={key} className="pick-row">
                  <input type="checkbox" checked={on} onChange={() => setPicked((cur) => (on ? cur.filter((k) => k !== key) : [...cur, key]))} />
                  <span className="grow">{p.fixture.home} v {p.fixture.away} · {p.selection}</span>
                  <span className="num">{p.odds.toFixed(2)}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="slip-sum">
          <span className="muted small">Combined odds</span>
          <b className="num">{selected.length ? total.toFixed(2) : '–'}</b>
        </div>
        {!code ? (
          <button className="btn primary wide" disabled={!selected.length} onClick={() => setCode(codeFor(strategy.id + platform + selected.map((p) => p.fid + p.selection).join('|')))}>
            Generate {platform} booking code
          </button>
        ) : (
          <div className="code-box">
            <div className="muted small">Booking code · {platform} · mock</div>
            <div className="code">{code}</div>
            <div className="code-actions">
              <a className="btn primary" href={deep} target="_blank" rel="noreferrer">Open {platform} deep link</a>
              <button className="btn ghost" onClick={() => navigator.clipboard?.writeText(code)}>Copy code</button>
            </div>
            <div className="muted small">Paste {code} into {platform}'s booking code field. This prototype does not call either platform.</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- App shell ---------- */
export default function App() {
  const [view, setView] = useState({ name: 'dashboard' });
  const [strategies, setStrategies] = useState(STRATEGIES);
  const [picks, setPicks] = useState(PICKS_SEED);
  const [sortMode, setSortMode] = useState('default');
  const [showBook, setShowBook] = useState(false);
  const [toast, setToast] = useState(null);

  // Per-user preference memory: the user shows a bias for odds under 2, which the feed uses to show a "hidden" note on bigger-price strategies.
  const pref = { label: 'learning', hiddenSports: [] };

  const current = strategies.find((s) => s.id === view.id);

  const saveStrategy = (draft) => {
    const id = `s${strategies.length + 1}`;
    const s = { id, name: draft.name, sport: draft.sport, league: draft.league, rules: draft.rules, created: '2026-10-23', color: '#22c55e' };
    setStrategies((cur) => [...cur, s]);
    const pool = candidatePool().filter((c) => matches(draft.rules, c, c.fixture));
    const seen = new Set();
    const uniq = pool.filter((c) => { if (seen.has(c.fid)) return false; seen.add(c.fid); return true; }).sort((a, b) => new Date(a.fixture.kickoff) - new Date(b.fixture.kickoff));
    setPicks((cur) => ({ ...cur, [id]: uniq }));
    setToast(`Saved "${draft.name}". ${uniq.length} picks backfilled from the last 30 days.`);
    setView({ name: 'detail', id });
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" onClick={() => setView({ name: 'dashboard' })}>
          <span className="logo">◆</span>
          <b>StratTrack</b>
          <span className="tag">prototype</span>
        </div>
        <nav>
          <button className={view.name === 'dashboard' ? 'on' : ''} onClick={() => setView({ name: 'dashboard' })}>Feed</button>
          <button className={view.name === 'builder' ? 'on' : ''} onClick={() => setView({ name: 'builder' })}>Builder</button>
        </nav>
        <div className="me"><span className="dot" />Wallet · 0x7a…3f2b</div>
      </header>

      <main>
        {view.name === 'dashboard' && (
          <Dashboard
            strategies={strategies}
            picks={picks}
            pref={pref}
            sortMode={sortMode}
            setSortMode={setSortMode}
            onOpen={(id) => setView({ name: 'detail', id })}
            onNew={() => setView({ name: 'builder' })}
          />
        )}
        {view.name === 'builder' && <Builder onSave={saveStrategy} onCancel={() => setView({ name: 'dashboard' })} />}
        {view.name === 'detail' && current && (
          <Detail
            strategy={current}
            picks={picks[current.id]}
            onBack={() => setView({ name: 'dashboard' })}
            onBook={() => setShowBook(true)}
          />
        )}
        {showBook && current && <BookingModal strategy={current} picks={picks[current.id]} onClose={() => setShowBook(false)} />}
        {toast && <div className="toast" onAnimationEnd={() => setToast(null)}>{toast}</div>}
      </main>
    </div>
  );
}
