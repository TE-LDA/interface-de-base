import { useEffect, useRef, useState } from "react";
import { sendLetter, sendOrder } from "./api";
import { narrate } from "./game/chronicle";
import {
  ASSET_CATALOG,
  COUNCIL_PROPOSALS,
  createGame,
  freeTiles,
  housingCap,
  levelOf,
  step,
  totalDefense,
} from "./game/sim";
import type { GameState, ImpactReport, Letter, LogEntry, MacroId } from "./game/types";

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

const BUDGET_POSTES: { key: "grain" | "defense" | "social" | "prestige"; emoji: string; label: string; hint: string }[] = [
  { key: "grain", emoji: "🌾", label: "Réserve de grain", hint: "+3 grain par 💰 (anti-famine)" },
  { key: "defense", emoji: "🛡️", label: "Défense / milice", hint: "+1 défense le mois (par 10 💰)" },
  { key: "social", emoji: "😊", label: "Fêtes et social", hint: "−0,4 inquiétude par 💰" },
  { key: "prestige", emoji: "🏅", label: "Mécénat / prestige", hint: "+0,3 prestige par 💰" },
];

const MACRO_IDS = Object.keys({ prosperity: 0, faith: 0, defense: 0, knowledge: 0, expansion: 0, balance: 0 }) as MacroId[];

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
  const [state, setState] = useState<GameState>(() => {
    const saved = load();
    if (saved) {
      saved.buffs = saved.buffs ?? [];
      saved.chronicle.forEach((e) => narrated.current.add(e.id));
    }
    return saved ?? createGame();
  });
  const [order, setOrder] = useState("");
  const [sending, setSending] = useState(false);
  const [showAssets, setShowAssets] = useState(false);
  const [letterOpen, setLetterOpen] = useState<Letter | null>(null);
  const [letterBody, setLetterBody] = useState<{ titre: string; corps: string } | null>(null);
  const [report, setReport] = useState<ImpactReport | null>(null);
  const [alloc, setAlloc] = useState({ grain: 0, defense: 0, social: 0, prestige: 0, invest: 0 });
  const [investCat, setInvestCat] = useState("port");
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
          buffs: [...prev.buffs],
        };
        for (const e of step(next)) {
          next.chronicle.push(e);
          if (narrated.current.has(e.id)) continue;
          narrated.current.add(e.id);
          if (e.kind !== "info") {
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
        buffs: [...s.buffs],
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
        const lvl = levelOf(cost || q.level * 50);
        next.assets.push({
          id: q.id || `asset_${next.nextId++}`,
          name: q.name || c.name,
          emoji: q.emoji || c.emoji,
          cat,
          level: lvl,
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

  function stepAlloc(key: keyof typeof alloc, d: number) {
    setAlloc((a) => ({ ...a, [key]: Math.max(0, a[key] + d) }));
  }

  function validateBudget() {
    const total = alloc.grain + alloc.defense + alloc.social + alloc.prestige + alloc.invest;
    if (total <= 0 || total > state.metrics.treasury) return;
    const a = { ...alloc };
    const cat = investCat;
    setAlloc({ grain: 0, defense: 0, social: 0, prestige: 0, invest: 0 });
    setState((s) => {
      const next: GameState = {
        ...s,
        meta: { ...s.meta },
        metrics: { ...s.metrics },
        assets: s.assets.map((x) => ({ ...x })),
        pendingLetters: [...s.pendingLetters],
        chronicle: [...s.chronicle],
        buffs: [...s.buffs],
      };
      next.metrics.treasury = Math.max(0, Math.round(next.metrics.treasury - total));
      next.foodStock += a.grain * 3;
      next.metrics.unrest = Math.max(0, Math.round(next.metrics.unrest - a.social * 0.4));
      next.metrics.prestige = Math.min(100, Math.round(next.metrics.prestige + a.prestige * 0.3));
      if (a.defense > 0) {
        next.buffs.push({ nom: "Milice levée", moisRestants: 1, defense: Math.max(1, Math.round(a.defense / 10)) });
      }
      if (a.invest > 0) {
        const c = ASSET_CATALOG[cat];
        const lvl = levelOf(a.invest);
        const tiles = freeTiles(next);
        const t = tiles.length > 0 ? tiles[Math.floor(Math.random() * tiles.length)] : { x: 0, y: 0 };
        next.assets.push({
          id: `asset_${next.nextId++}`,
          name: c.name,
          emoji: c.emoji,
          cat,
          level: lvl,
          status: "building",
          remainingTicks: c.baseTicks * lvl,
          monthlyRevenue: c.baseRevenue * lvl,
          monthlyUpkeep: c.baseUpkeep * lvl,
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
          text: `🏗️ Budget voté : ${a.invest} 💰 investis dans ${c.emoji} ${c.name} (niveau ${lvl}), chantier de ${c.baseTicks * lvl} mois.`,
        });
      }
      next.chronicle.push({
        id: next.nextId++,
        year: next.meta.year,
        kind: "info",
        text: `🧾 Budget du mois voté : 🌾${a.grain} 🛡️${a.defense} 😊${a.social} 🏅${a.prestige} 🏗️${a.invest} 💰 — reste ${Math.round(next.metrics.treasury)} 💰 en caisse.`,
      });
      return next;
    });
    void sendOrderText(
      `Voici le budget voté pour ce mois : grain ${a.grain} 💰, défense ${a.defense} 💰, social ${a.social} 💰, prestige ${a.prestige} 💰, investissement ${a.invest} 💰 dans ${ASSET_CATALOG[cat].name}. Donne ton avis de Bailli en une phrase et un petit ajustement chiffré si besoin.`
    );
  }

  function newGame() {
    narrated.current.clear();
    const g = createGame();
    setState(g);
    void narrate(g, {
      id: 0,
      year: g.meta.year,
      kind: "joy",
      text: `Le domaine de ${g.meta.rulerTitle} commence son histoire (maison ${g.meta.dynastyName}).`,
    }).then((text) =>
      setState((s) => ({ ...s, chronicle: [{ id: s.nextId++, year: s.meta.year, kind: "joy", text }] }))
    );
  }

  const m = state.metrics;
  const net = m.monthlyIncome - m.monthlyUpkeep;
  const unread = state.pendingLetters.length;
  const totalAlloc = alloc.grain + alloc.defense + alloc.social + alloc.prestige + alloc.invest;
  const reste = Math.round(m.treasury) - totalAlloc;

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
          <button type="button" onClick={() => setShowAssets(true)} title="Liste des actifs du domaine">
            📋 Actifs ({state.assets.length})
          </button>
        </div>
      </header>

      <div className="layout">
        <main className="page">
          <div className="chronique chronicle" ref={chronicleRef}>
            <h2>📜 Chronique du domaine</h2>
            {state.chronicle.length === 0 && (
              <p className="empty">
                Le domaine de {state.meta.rulerTitle} s'éveille. Le monde avance tout seul ;
                arbitrez le budget et répondez au courrier pour agir.
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
            <h2>💰 Budget du mois</h2>
            <div className="budget-or">
              {Math.round(m.treasury)} <small>💰 en caisse</small>
            </div>
            <div className="budget-income">
              revenus {m.monthlyIncome} · charges {m.monthlyUpkeep} → net {net >= 0 ? "+" : ""}
              {net} 💰/mois · réserve 🌾 {m.foodReserve} mois · inquiétude 😠 {Math.round(m.unrest)} %
            </div>
            {BUDGET_POSTES.map((p) => (
              <div className="macro-row" key={p.key}>
                <span title={p.hint}>
                  {p.emoji} {p.label}
                </span>
                <span className="macro-ctrl">
                  <button type="button" onClick={() => stepAlloc(p.key, -5)} disabled={alloc[p.key] <= 0}>−</button>
                  <b>{alloc[p.key]} 💰</b>
                  <button type="button" onClick={() => stepAlloc(p.key, 5)}>+</button>
                </span>
              </div>
            ))}
            <div className="macro-row">
              <span>🏗️ Investissement</span>
              <span className="macro-ctrl">
                <select value={investCat} onChange={(e) => setInvestCat(e.target.value)}>
                  {Object.entries(ASSET_CATALOG)
                    .filter(([k]) => k !== "château")
                    .map(([k, c]) => (
                      <option key={k} value={k}>
                        {c.emoji} {c.name} (~{c.baseCost} 💰)
                      </option>
                    ))}
                </select>
                <button type="button" onClick={() => stepAlloc("invest", -10)} disabled={alloc.invest <= 0}>−</button>
                <b>{alloc.invest} 💰</b>
                <button type="button" onClick={() => stepAlloc("invest", 10)}>+</button>
              </span>
            </div>
            <div className="budget-total">
              Alloué : {totalAlloc} 💰 · reste : {reste} 💰
            </div>
            <button
              type="button"
              className="send"
              onClick={validateBudget}
              disabled={totalAlloc <= 0 || reste < 0}
            >
              ✅ Valider le budget du mois
            </button>
          </div>

          <div className="card strategy-card">
            <h2>🎯 Orientations macro</h2>
            {MACRO_IDS.map((id) => (
              <div className="macro-row" key={id}>
                <span>{state.macro[id]}/5</span>
                <span className="macro-ctrl">
                  <button type="button" onClick={() => setMacro(id, -1)} disabled={state.macro[id] <= 0}>−</button>
                  <button type="button" onClick={() => setMacro(id, 1)} disabled={state.macro[id] >= 5}>+</button>
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
              Vitesse : ×{state.speed}
            </button>
            <button type="button" onClick={() => setState((s) => ({ ...s, autoDev: !s.autoDev }))} aria-pressed={state.autoDev}>
              🏘️ Village autonome : {state.autoDev ? "oui" : "non"}
            </button>
            <button type="button" onClick={newGame}>✨ Nouvelle chronique</button>
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

      {showAssets && (
        <div className="overlay" onClick={() => setShowAssets(false)}>
          <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-head">
              <h2>📋 Actifs du domaine ({state.assets.length})</h2>
              <button type="button" onClick={() => setShowAssets(false)}>✕ Fermer</button>
            </div>
            <div className="asset-list">
              {state.assets.map((a) => (
                <div className={`asset-row${a.status === "damaged" ? " damaged" : ""}`} key={a.id}>
                  <span className="asset-emoji">{a.emoji}</span>
                  <span className="asset-name">
                    {a.name} <b>N{a.level}</b>
                    <small>
                      {a.status === "building"
                        ? `chantier : ${a.remainingTicks} mois restants`
                        : a.status === "damaged"
                          ? "endommagé — à réparer"
                          : `+${a.monthlyRevenue} 💰/mois · entretien ${a.monthlyUpkeep} 💰/mois${a.foodYield ? ` · +${a.foodYield * a.level}🌾` : ""}${a.prestigeYield ? ` · +${a.prestigeYield * a.level}🏅` : ""}${a.defense ? ` · +${a.defense}🛡️` : ""}`}
                    </small>
                  </span>
                  <span className={`asset-status ${a.status}`}>{a.status === "building" ? "🔨 chantier" : a.status === "damaged" ? "🔥 endommagé" : "✅ actif"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
