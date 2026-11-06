import { useEffect, useRef, useState } from "react";
import { sendLetter, sendOrder } from "./api";
import { narrate } from "./game/chronicle";
import {
  ASSET_CATALOG,
  COUNCIL_PROPOSALS,
  GRID_H,
  GRID_W,
  MACRO_LABELS,
  MONTHS,
  assetAt,
  createGame,
  freeTiles,
  housingCap,
  levelOf,
  step,
  totalDefense,
} from "./game/sim";
import type {
  Asset,
  GameState,
  ImpactReport,
  Letter,
  LogEntry,
  MacroId,
} from "./game/types";

const SAVE_KEY = "domaine-seigneurial-save";
const TICK_MS = 450;
const SPEEDS = [1, 2, 4];

const SUGGESTIONS = [
  "Construis un quai marchand pour 100 💰",
  "Négocie à la baisse : fais le port pour 80 💰 avec le bois du domaine",
  "Surinvestis 200 💰 dans une église pour monter vite en prestige",
  "Lève la taille sur les paysans",
  "Impose une corvée pour accélérer les chantiers",
];

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}

function stateSummary(s: GameState) {
  return {
    meta: s.meta,
    metrics: s.metrics,
    budget: Math.floor(s.metrics.treasury),
    macro: s.macro,
    actifs: s.assets.map((a) => `${a.emoji} ${a.name} N${a.level} (${a.status})`),
    lettres_en_attente: s.pendingLetters.map((l) => l.sujet),
    catalogue_actifs: Object.entries(ASSET_CATALOG)
      .filter(([k]) => k !== "château")
      .map(([k, c]) => `${k} = ${c.name} : coût ~${c.baseCost} 💰, ${c.desc}`),
    propositions_conseil: COUNCIL_PROPOSALS,
  };
}

export default function App() {
  const narrated = useRef(new Set<number>());
  const [state, setState] = useState<GameState>(() => load() ?? createGame());
  const [order, setOrder] = useState("");
  const [sending, setSending] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [letterOpen, setLetterOpen] = useState<Letter | null>(null);
  const [letterBody, setLetterBody] = useState<{ titre: string; corps: string } | null>(null);
  const [report, setReport] = useState<ImpactReport | null>(null);
  const chronicleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state.running) return;
    const id = setInterval(() => {
      setState((prev) => {
        const next: GameState = {
          ...prev,
          meta: { ...prev.meta },
          metrics: { ...prev.metrics },
          macro: { ...prev.macro },
          assets: prev.assets.map((a) => ({ ...a })),
          pendingLetters: [...prev.pendingLetters],
          chronicle: [...prev.chronicle],
        };
        for (const e of step(next)) {
          next.chronicle.push(e);
          if (narrated.current.has(e.id)) continue;
          narrated.current.add(e.id);
          if (e.kind === "info") {
            // déjà dans la chronique
          } else {
            void narrate(next, e).then((text) => {
              setState((s) => ({
                ...s,
                chronicle: s.chronicle.map((c) => (c.id === e.id ? { ...c, text } : c)),
              }));
            });
          }
        }
        return next;
      });
    }, TICK_MS / state.speed);
    return () => clearInterval(id);
  }, [state.running, state.speed]);

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  useEffect(() => {
    const el = chronicleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.chronicle.length]);

  function pushLog(kind: LogEntry["kind"], text: string) {
    setState((s) => ({
      ...s,
      chronicle: [...s.chronicle, { id: s.nextId++, year: s.meta.year, kind, text }],
    }));
  }

  async function sendOrderText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await sendOrder(trimmed, stateSummary(state));
      pushLog("reply", `🖋️ ${res.narrative_response}`);
      applyContract(res);
      if (res.comparative_simulation) setReport(res.comparative_simulation);
    } catch (err) {
      pushLog("info", `⚠ Le Bailli n'a pas répondu : ${err instanceof Error ? err.message : "erreur"}`);
    } finally {
      setSending(false);
    }
  }

  function applyContract(res: Awaited<ReturnType<typeof sendOrder>>) {
    setState((s) => {
      const next: GameState = {
        ...s,
        meta: { ...s.meta },
        metrics: { ...s.metrics },
        assets: s.assets.map((a) => ({ ...a })),
        pendingLetters: [...s.pendingLetters],
        chronicle: [...s.chronicle],
      };
      const su = res.state_updates;
      next.metrics.treasury = Math.max(0, Math.round(next.metrics.treasury + su.treasury_change));
      next.metrics.unrest = Math.max(0, Math.min(100, Math.round(next.metrics.unrest + su.unrest_change)));
      next.metrics.prestige = Math.max(0, Math.min(100, Math.round(next.metrics.prestige + su.prestige_change)));
      if (su.new_asset_queue) {
        const q = su.new_asset_queue;
        const tiles = freeTiles(next);
        const cat = ASSET_CATALOG[q.cat ?? "marché"] ? (q.cat ?? "marché") : "marché";
        const c = ASSET_CATALOG[cat];
        const t = tiles.length > 0 ? tiles[Math.floor(Math.random() * tiles.length)] : { x: 0, y: 0 };
        const cost = Math.abs(su.treasury_change);
        next.assets.push({
          id: q.id || `asset_${next.nextId++}`,
          name: q.name || c.name,
          emoji: q.emoji || c.emoji,
          cat,
          level: levelOf(cost || q.level * 50),
          status: "building",
          remainingTicks: q.construction_ticks,
          monthlyRevenue: q.monthly_revenue,
          monthlyUpkeep: q.monthly_upkeep,
          foodYield: c.foodYield,
          prestigeYield: c.prestigeYield,
          defense: c.defense,
          x: t.x,
          y: t.y,
        });
        next.chronicle.push({
          id: next.nextId++,
          year: next.meta.year,
          kind: "joy",
          text: `🏗️ Chantier lancé : ${c.emoji} ${q.name} (niveau ${q.level}) — ${q.construction_ticks} mois, puis +${q.monthly_revenue} 💰/mois, entretien ${q.monthly_upkeep} 💰/mois.`,
        });
      }
      if (letterOpen) {
        next.pendingLetters = next.pendingLetters.filter((l) => l.id !== letterOpen.id);
      }
      return next;
    });
  }

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    const t = order.trim();
    setOrder("");
    await sendOrderText(t);
  }

  function answerLetter(accept: boolean) {
    const l = letterOpen;
    if (!l) return;
    setLetterOpen(null);
    setLetterBody(null);
    void sendOrderText(
      accept ? `J'accorde la proposition du conseil : ${l.sujet}` : `Je refuse la proposition du conseil : ${l.sujet}`
    );
  }

  async function openLetter(l: Letter) {
    setLetterOpen(l);
    setLetterBody(null);
    try {
      const res = await sendLetter(l.sujet, stateSummary(state));
      setLetterBody(res);
    } catch {
      setLetterBody({ titre: "Lettre du conseil des anciens", corps: `Proposition : ${l.sujet}` });
    }
  }

  function setMacro(id: MacroId, delta: number) {
    setState((s) => ({
      ...s,
      macro: { ...s.macro, [id]: Math.max(0, Math.min(5, s.macro[id] + delta)) },
    }));
  }

  function newGame() {
    narrated.current.clear();
    const g = createGame();
    setState(g);
    pushLogInit(g);
  }

  function pushLogInit(g: GameState) {
    void narrate(g, { id: 0, year: g.meta.year, kind: "joy", text: `Le domaine de ${g.meta.rulerTitle} commence son histoire (maison ${g.meta.dynastyName}).` }).then((text) =>
      setState((s) => ({ ...s, chronicle: [{ id: s.nextId++, year: s.meta.year, kind: "joy", text }] }))
    );
  }

  const m = state.metrics;
  const net = m.monthlyIncome - m.monthlyUpkeep;
  const unread = state.pendingLetters.length;

  return (
    <div className="app">
      <header className="topbar">
        <h1>🏰 {state.meta.rulerTitle}</h1>
        <div className="subtitle">
          Maison {state.meta.dynastyName} — An {state.meta.year} — {state.meta.month} — Tour {state.meta.turn}
        </div>
        <div className="resources">
          <span className="chip">💰 {Math.round(m.treasury)}</span>
          <span className="chip">📈 {net >= 0 ? "+" : ""}{net}/mois</span>
          <span className="chip">👥 {m.population}/{housingCap(state)}</span>
          <span className="chip">🌾 {m.foodReserve} mois</span>
          <span className="chip">😠 {Math.round(m.unrest)} %</span>
          <span className="chip">🏅 {Math.round(m.prestige)}</span>
          <span className="chip">🛡️ {totalDefense(state)}</span>
        </div>
        <div className="controls">
          <button type="button" onClick={() => setShowMap(true)} title="Carte des actifs, lois">🗺️ Domaine</button>
        </div>
      </header>

      <div className="layout">
        <main className="page">
          <div className="chronicle" ref={chronicleRef}>
            <h2>📜 Chronique du domaine</h2>
            {state.chronicle.length === 0 && (
              <p className="empty">
                Le domaine de {state.meta.rulerTitle} s'éveille. Le monde avance tout seul ;
                écrivez vos ordres à droite pour agir.
              </p>
            )}
            {state.chronicle.map((c) => (
              <p key={c.id} className={c.kind === "reply" ? "reply" : undefined}>
                <strong>An {c.year}</strong> — {c.text}
              </p>
            ))}
          </div>
        </main>

        <aside className="panel">
          <form className="card orders" onSubmit={submitOrder}>
            <h2>🖋️ Ordres du seigneur</h2>
            {unread > 0 && (
              <button type="button" className="courrier-btn" onClick={() => void openLetter(state.pendingLetters[0])}>
                ✉️ Courrier du conseil <span className="badge">{unread}</span>
                <small>« {state.pendingLetters[0].sujet} » — cliquez pour lire et arbitrer (OUI / NON)</small>
              </button>
            )}
            <input
              type="text"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              placeholder="Écrivez votre ordre… (Entrée ⏎ pour envoyer)"
              disabled={sending}
              autoFocus
            />
            <button type="submit" className="send" disabled={sending || !order.trim()}>
              {sending ? "Le Bailli réfléchit…" : "Envoyer l'ordre ➤"}
            </button>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="suggestion" onClick={() => setOrder(s)}>
                  {s}
                </button>
              ))}
            </div>
          </form>

          <div className="card budget-card">
            <h2>💰 Trésorerie</h2>
            <div className="budget-or">
              {Math.round(m.treasury)} <small>💰</small>
            </div>
            <div className="budget-income">
              + {m.monthlyIncome} 💰/mois de revenus · − {m.monthlyUpkeep} d'entretien → net {net >= 0 ? "+" : ""}
              {net} 💰/mois
            </div>
          </div>

          <div className="card strategy-card">
            <h2>🎯 Orientations macro</h2>
            <p className="strategy-hint">Vous fixez l'orientation (niveaux 0-5) ; la tactique et le micro sont au Bailli, aux hommes et aux villageois.</p>
            {(Object.keys(MACRO_LABELS) as MacroId[]).map((id) => (
              <div className="macro-row" key={id}>
                <span title={MACRO_LABELS[id].desc}>
                  {MACRO_LABELS[id].emoji} {MACRO_LABELS[id].name}
                </span>
                <span className="macro-ctrl">
                  <button type="button" onClick={() => setMacro(id, -1)} disabled={state.macro[id] <= 0}>
                    −
                  </button>
                  <b>{state.macro[id]}</b>
                  <button type="button" onClick={() => setMacro(id, 1)} disabled={state.macro[id] >= 5}>
                    +
                  </button>
                </span>
              </div>
            ))}
          </div>

          <div className="card controls-card">
            <h2>⚙️ Le domaine</h2>
            <button type="button" onClick={() => setState((s) => ({ ...s, running: !s.running }))}>
              {state.running ? "⏸ Mettre en pause" : "▶ Reprendre"}
            </button>
            <button type="button" onClick={() => setState((s) => ({ ...s, speed: SPEEDS[(SPEEDS.indexOf(s.speed) + 1) % SPEEDS.length] }))}>
              Vitesse de simulation : ×{state.speed}
            </button>
            <button type="button" onClick={() => setState((s) => ({ ...s, autoDev: !s.autoDev }))} aria-pressed={state.autoDev}>
              🏘️ Village autonome : {state.autoDev ? "oui" : "non"}
            </button>
            <button type="button" onClick={newGame}>
              ✨ Nouvelle chronique (recommencer)
            </button>
          </div>
        </aside>
      </div>

      {letterOpen && (
        <div className="overlay" onClick={() => { setLetterOpen(null); setLetterBody(null); }}>
          <div className="letter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="letter-paper">
              <div className="letter-paper-head">
                ✉️ Conseil des anciens <span className="seal">🔴</span>
              </div>
              <h2>{letterBody?.titre ?? "Lettre du conseil"}</h2>
              <p className="letter-subject">Proposition : {letterOpen.sujet}</p>
              <p className="letter-body">{letterBody?.corps ?? "Rédaction en cours…"}</p>
            </div>
            <div className="letter-actions">
              <button type="button" className="oui" onClick={() => answerLetter(true)}>✅ OUI — j'accorde</button>
              <button type="button" className="non" onClick={() => answerLetter(false)}>❌ NON — je refuse</button>
            </div>
            <p className="letter-alt">…ou répondez en texte libre dans « Vos ordres ».</p>
          </div>
        </div>
      )}

      {report && (
        <div className="overlay" onClick={() => setReport(null)}>
          <div className="report-modal card" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-head">
              <h2>📊 Rapport d'impact comparatif</h2>
              <button type="button" onClick={() => setReport(null)}>✕ Fermer</button>
            </div>
            <table className="impact-table">
              <thead>
                <tr>
                  <th>Indicateur</th>
                  <th>Conseil (base)</th>
                  <th>Votre arbitrage</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(report.baseline).map((k) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td>{report.baseline[k]}</td>
                    <td>{report.enacted[k] ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>Variance / notes</h3>
            <ul className="tradeoffs">
              {report.tradeoff_summary.map((r, i) => (
                <li key={i}>
                  <strong>{r.metric}</strong> : impact {r.impact} — <em>{r.delta}</em>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {showMap && (
        <div className="overlay" onClick={() => setShowMap(false)}>
          <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-head">
              <h2>🗺️ Domaine — {state.assets.length} actif(s)</h2>
              <button type="button" onClick={() => setShowMap(false)}>✕ Fermer</button>
            </div>
            <div className="map">
              {Array.from({ length: GRID_H }, (_, y) =>
                Array.from({ length: GRID_W }, (_, x) => {
                  const a = assetAt(state, x, y);
                  return (
                    <div key={`${x}-${y}`} className={`tile${a ? " built" : ""}${a?.status === "damaged" ? " damaged" : ""}`} title={a ? `${a.emoji} ${a.name} N${a.level} — ${a.status === "building" ? `chantier ${a.remainingTicks} mois` : `+${a.monthlyRevenue} 💰/mois, −${a.monthlyUpkeep} entretien`}` : ""}>
                      {a ? (
                        <>
                          <span className="emoji">{a.emoji}</span>
                          {a.status === "building" && (
                            <span className="progress"><span style={{ width: `${Math.round(((1 - a.remainingTicks / Math.max(1, a.remainingTicks + 1)) ) * 100)}%` }} /></span>
                          )}
                        </>
                      ) : (
                        <span className="grass">🌿</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="projects">
              <h3>📊 Actifs en cours</h3>
              {state.assets.filter((a) => a.cat !== "château").map((a) => (
                <div className="tech" key={a.id}>
                  <span>
                    {a.emoji} {a.name} N{a.level} <small>{a.status === "building" ? `chantier : ${a.remainingTicks} mois` : a.status === "damaged" ? "endommagé — à réparer" : `+${a.monthlyRevenue} 💰/mois, entretien ${a.monthlyUpkeep}`}</small>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
