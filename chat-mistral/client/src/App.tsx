import { useEffect, useRef, useState } from "react";
import { sendOrder } from "./api";
import { narrate } from "./game/chronicle";
import {
  BUILDING_CATALOG,
  GRID_H,
  GRID_W,
  TECHS,
  buildingAt,
  createGame,
  defense,
  freeTiles,
  housingCap,
  research,
  seasonOf,
  step,
} from "./game/sim";
import type { BuildingType, ChronicleEntry, GameState, OrderAction, TechId } from "./game/types";

const SAVE_KEY = "uchronie-royaume-save";
const TICK_MS = 450;
const SPEEDS = [1, 2, 4];
const SUGGESTIONS = [
  "Construis une ferme",
  "Quels sont les devis pour une bibliothèque ?",
  "Améliore l'économie : que me proposez-vous ?",
  "Promulgue une charte des libertés pour le bourg",
  "Fonde un ordre militaire pour défendre les frontières",
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
    royaume: s.kingdom,
    maison: s.dynasty,
    seigneur: s.ruler,
    an: s.year,
    saison: seasonOf(s.month),
    ressources: s.resources,
    population: s.population,
    moral: Math.round(s.moral),
    defense: defense(s),
    batiments: s.buildings.map((b) =>
      BUILDING_CATALOG[b.type].name + (b.done ? "" : " (en chantier)")
    ),
    decouvertes: s.techs.map((t) => TECHS[t].name),
    lois_en_vigueur: s.decrets.map((d) => `${d.titre} (an ${d.year})`),
    village_autonome: s.autoDev,
    batiments_disponibles: (
      Object.entries(BUILDING_CATALOG) as [BuildingType, (typeof BUILDING_CATALOG)[BuildingType]][]
    )
      .filter(([t]) => t !== "château")
      .map(([t, c]) => `${t} (${c.name}, ${c.desc}) coût: ${JSON.stringify(c.cost)}`),
  };
}

export default function App() {
  const narrated = useRef(new Set<number>());
  const [state, setState] = useState<GameState>(() => {
    const saved = load();
    if (saved) {
      if (typeof saved.autoDev !== "boolean") saved.autoDev = true;
      saved.techs = saved.techs ?? [];
      saved.decrets = saved.decrets ?? [];
      saved.resources.science = saved.resources.science ?? 30;
      saved.events.forEach((e) => narrated.current.add(e.id));
    }
    return saved ?? createGame();
  });
  const [chronicle, setChronicle] = useState<ChronicleEntry[]>([]);
  const [selected, setSelected] = useState<{ x: number; y: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [order, setOrder] = useState("");
  const [sending, setSending] = useState(false);
  const chronicleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state.running) return;
    const id = setInterval(() => {
      setState((prev) => {
        const next: GameState = {
          ...prev,
          resources: { ...prev.resources },
          buildings: prev.buildings.map((b) => ({ ...b })),
          events: [...prev.events],
          techs: [...prev.techs],
        };
        for (const e of step(next)) {
          next.events.push(e);
          if (narrated.current.has(e.id)) continue;
          narrated.current.add(e.id);
          if (e.kind === "info") {
            setChronicle((c) => [...c, { year: e.year, text: e.text }]);
          } else {
            void narrate(next, e).then((text) =>
              setChronicle((c) => [...c, { year: e.year, text }])
            );
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
      // stockage indisponible : la partie reste en mémoire
    }
  }, [state]);

  useEffect(() => {
    const el = chronicleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chronicle.length]);

  function pushChronicle(year: number, text: string) {
    setChronicle((c) => [...c, { year, text }]);
  }

  function toggleRunning() {
    setState((s) => ({ ...s, running: !s.running }));
  }

  function cycleSpeed() {
    setState((s) => ({ ...s, speed: SPEEDS[(SPEEDS.indexOf(s.speed) + 1) % SPEEDS.length] }));
  }

  function toggleAutoDev() {
    setState((s) => ({ ...s, autoDev: !s.autoDev }));
  }

  function newGame() {
    narrated.current.clear();
    const g = createGame();
    setState(g);
    setChronicle([]);
    setSelected(null);
    const first = g.events[0];
    narrated.current.add(first.id);
    void narrate(g, first).then((text) => setChronicle([{ year: first.year, text }]));
  }

  function place(type: BuildingType) {
    if (!selected) return;
    const cat = BUILDING_CATALOG[type];
    const r = state.resources;
    if (
      r.bois < (cat.cost.bois ?? 0) ||
      r.pierre < (cat.cost.pierre ?? 0) ||
      r.or < (cat.cost.or ?? 0)
    ) {
      return;
    }
    setState((s) => ({
      ...s,
      resources: {
        ...s.resources,
        bois: s.resources.bois - (cat.cost.bois ?? 0),
        pierre: s.resources.pierre - (cat.cost.pierre ?? 0),
        or: s.resources.or - (cat.cost.or ?? 0),
      },
      buildings: [...s.buildings, { type, x: selected.x, y: selected.y, progress: 0, done: false }],
    }));
    setSelected(null);
  }

  function doResearch(id: TechId) {
    setState((s) => {
      const next: GameState = {
        ...s,
        resources: { ...s.resources },
        buildings: s.buildings.map((b) => ({ ...b })),
        events: [...s.events],
        techs: [...s.techs],
      };
      const ev = research(next, id);
      if (ev) {
        next.events.push(ev);
        if (!narrated.current.has(ev.id)) {
          narrated.current.add(ev.id);
          void narrate(next, ev).then((text) => pushChronicle(ev.year, text));
        }
      }
      return next;
    });
  }

  async function submitOrder(event: React.FormEvent) {
    event.preventDefault();
    const text = order.trim();
    if (!text || sending) return;
    setOrder("");
    setSending(true);
    try {
      const res = await sendOrder(text, stateSummary(state));
      if (res.reponse) pushChronicle(state.year, `🖋️ ${res.reponse}`);
      applyAction(res.action);
    } catch (err) {
      pushChronicle(
        state.year,
        `⚠ Le héraut n'a pas pu porter l'ordre : ${err instanceof Error ? err.message : "erreur inconnue"}`
      );
    } finally {
      setSending(false);
    }
  }

  function applyEffets(s: GameState, e: Record<string, number> | undefined) {
    if (!e) return;
    const r = s.resources;
    r.nourriture = Math.max(0, Math.min(500, r.nourriture + (e.nourriture ?? 0)));
    r.bois = Math.max(0, Math.min(999, r.bois + (e.bois ?? 0)));
    r.pierre = Math.max(0, Math.min(999, r.pierre + (e.pierre ?? 0)));
    r.or = Math.max(0, Math.min(999, r.or + (e.or ?? 0)));
    r.foi = Math.max(0, Math.min(100, r.foi + (e.foi ?? 0)));
    r.science = Math.max(0, Math.min(999, r.science + (e.science ?? 0)));
    s.moral = Math.max(0, Math.min(100, s.moral + (e.moral ?? 0)));
    s.population = Math.max(0, s.population + (e.pop ?? 0));
  }

  function applyAction(action: OrderAction | undefined) {
    if (!action) return;
    if (action.type === "build" && action.batiment) {
      const key = (Object.keys(BUILDING_CATALOG) as BuildingType[]).find(
        (t) =>
          t === action.batiment ||
          BUILDING_CATALOG[t].name.toLowerCase() === action.batiment!.toLowerCase()
      );
      if (!key) return;
      const cat = BUILDING_CATALOG[key];
      const r = state.resources;
      const cost = { bois: cat.cost.bois ?? 0, pierre: cat.cost.pierre ?? 0, or: cat.cost.or ?? 0 };
      const missing = {
        bois: Math.max(0, cost.bois - Math.floor(r.bois)),
        pierre: Math.max(0, cost.pierre - Math.floor(r.pierre)),
        or: Math.max(0, cost.or - Math.floor(r.or)),
      };
      const afford = missing.bois === 0 && missing.pierre === 0 && missing.or === 0;
      pushChronicle(
        state.year,
        `📐 Devis de l'architecte — ${cat.emoji} ${cat.name} : 🪵${cost.bois} 🪨${cost.pierre} 💰${cost.or} | vos ressources : 🪵${Math.floor(r.bois)} 🪨${Math.floor(r.pierre)} 💰${Math.floor(r.or)} → ${
          afford ? "✅ abordable, les travaux commencent" : `❌ insuffisant (il manque 🪵${missing.bois} 🪨${missing.pierre} 💰${missing.or})`
        }.`
      );
      if (!afford) return;
      setState((s) => {
        const tiles = freeTiles(s);
        if (tiles.length === 0) return s;
        const t = tiles[Math.floor(Math.random() * tiles.length)];
        const next: GameState = {
          ...s,
          resources: {
            ...s.resources,
            bois: s.resources.bois - cost.bois,
            pierre: s.resources.pierre - cost.pierre,
            or: s.resources.or - cost.or,
          },
          buildings: [...s.buildings, { type: key, x: t.x, y: t.y, progress: 0, done: false }],
          events: [...s.events],
        };
        const ev = {
          id: next.nextEventId++,
          year: next.year,
          kind: "joy" as const,
          text: `Par ordre du seigneur, on bâtit : ${cat.name}.`,
        };
        next.events.push(ev);
        if (!narrated.current.has(ev.id)) {
          narrated.current.add(ev.id);
          void narrate(next, ev).then((text) => pushChronicle(ev.year, text));
        }
        return next;
      });
    } else if (action.type === "decret") {
      setState((s) => {
        const next: GameState = {
          ...s,
          resources: { ...s.resources },
          decrets: [...s.decrets],
        };
        if (action.titre) {
          next.decrets.push({
            id: next.nextEventId++,
            year: next.year,
            titre: action.titre.slice(0, 120),
            texte: (action.texte ?? "").slice(0, 500),
          });
        }
        applyEffets(next, action.effets);
        return next;
      });
    } else if (action.type === "ressources") {
      setState((s) => {
        const next: GameState = { ...s, resources: { ...s.resources } };
        applyEffets(next, action.effets);
        return next;
      });
    }
  }

  const selectedBuilding = selected ? buildingAt(state, selected.x, selected.y) : undefined;
  const r = state.resources;

  return (
    <div className="app">
      <header className="topbar">
        <h1>🏰 {state.kingdom}</h1>
        <div className="subtitle">
          Maison {state.dynasty} — {state.ruler} — An {state.year} — {seasonOf(state.month)}
        </div>
        <div className="resources">
          <span className="chip">🍞 {Math.round(r.nourriture)}</span>
          <span className="chip">👥 {state.population}/{housingCap(state)}</span>
          <span className="chip">🪵 {Math.round(r.bois)}</span>
          <span className="chip">🪨 {Math.round(r.pierre)}</span>
          <span className="chip">💰 {Math.round(r.or)}</span>
          <span className="chip">⛪ {Math.round(r.foi)}</span>
          <span className="chip">📖 {Math.round(r.science)}</span>
          <span className="chip">😊 {Math.round(state.moral)}</span>
          <span className="chip">🛡️ {defense(state)}</span>
        </div>
        <div className="controls">
          <button type="button" onClick={toggleRunning}>
            {state.running ? "⏸ Pause" : "▶ Reprendre"}
          </button>
          <button type="button" onClick={cycleSpeed} title="Vitesse de simulation">
            Vitesse ×{state.speed}
          </button>
          <button type="button" onClick={toggleAutoDev} aria-pressed={state.autoDev} title="Le village se développe tout seul">
            🏘️ Auto : {state.autoDev ? "oui" : "non"}
          </button>
          <button type="button" onClick={() => setShowMap(true)} title="Carte du domaine, lois et sciences">
            🗺️ Domaine
          </button>
          <button type="button" onClick={newGame} title="Recommencer une nouvelle uchronie">
            ✨ Nouveau
          </button>
        </div>
      </header>

      <main className="page">
        <div className="chronicle" ref={chronicleRef}>
          <h2>📜 Chronique du royaume de {state.kingdom}</h2>
          {chronicle.length === 0 && <p className="empty">Les siècles s'écoulent…</p>}
          {chronicle.map((c, i) => (
            <p key={i}>
              <strong>An {c.year}</strong> — {c.text}
            </p>
          ))}
        </div>
      </main>

      <form className="orders" onSubmit={submitOrder}>
        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="suggestion" onClick={() => setOrder(s)}>
              {s}
            </button>
          ))}
        </div>
        <div className="order-row">
          <span className="quill">🖋️</span>
          <input
            type="text"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            placeholder="Donnez vos ordres, seigneur… (Entrée ⏎ pour envoyer)"
            disabled={sending}
            autoFocus
          />
          <button type="submit" disabled={sending || !order.trim()}>
            {sending ? "Le héraut part…" : "Envoyer ➤"}
          </button>
        </div>
      </form>

      {showMap && (
        <div className="overlay" onClick={() => setShowMap(false)}>
          <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-head">
              <h2>🗺️ Domaine de {state.kingdom}</h2>
              <button type="button" onClick={() => setShowMap(false)}>
                ✕ Fermer
              </button>
            </div>
            <div className="map">
              {Array.from({ length: GRID_H }, (_, y) =>
                Array.from({ length: GRID_W }, (_, x) => {
                  const b = buildingAt(state, x, y);
                  const isSelected = selected?.x === x && selected?.y === y;
                  return (
                    <button
                      key={`${x}-${y}`}
                      type="button"
                      className={`tile${b ? " built" : ""}${isSelected ? " selected" : ""}`}
                      onClick={() => setSelected(b ? null : { x, y })}
                    >
                      {b ? (
                        <>
                          <span className="emoji">{BUILDING_CATALOG[b.type].emoji}</span>
                          {!b.done && (
                            <span className="progress">
                              <span style={{ width: `${Math.round(b.progress * 100)}%` }} />
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="grass">🌿</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            {selected && !selectedBuilding && (
              <div className="palette">
                <h3>Construire en ({selected.x + 1}, {selected.y + 1})</h3>
                <div className="palette-grid">
                  {(
                    Object.entries(BUILDING_CATALOG) as [
                      BuildingType,
                      (typeof BUILDING_CATALOG)[BuildingType],
                    ][]
                  )
                    .filter(([t]) => t !== "château")
                    .map(([t, cat]) => {
                      const affordable =
                        r.bois >= (cat.cost.bois ?? 0) &&
                        r.pierre >= (cat.cost.pierre ?? 0) &&
                        r.or >= (cat.cost.or ?? 0);
                      return (
                        <button
                          key={t}
                          type="button"
                          className="build-btn"
                          disabled={!affordable}
                          title={cat.desc}
                          onClick={() => place(t)}
                        >
                          <span>{cat.emoji}</span> {cat.name}
                          <small>
                            {cat.cost.bois ? ` 🪵${cat.cost.bois}` : ""}
                            {cat.cost.pierre ? ` 🪨${cat.cost.pierre}` : ""}
                            {cat.cost.or ? ` 💰${cat.cost.or}` : ""}
                          </small>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
            {state.decrets.length > 0 && (
              <div className="decrets">
                <h3>📜 Lois et ordres du royaume</h3>
                {[...state.decrets].reverse().map((d) => (
                  <p key={d.id}>
                    <strong>
                      An {d.year} — {d.titre}
                    </strong>
                    {d.texte ? ` : ${d.texte}` : ""}
                  </p>
                ))}
              </div>
            )}
            <div className="research">
              <h3>🔬 Sciences — 📖 {Math.round(r.science)}</h3>
              {(Object.entries(TECHS) as [TechId, (typeof TECHS)[TechId]][])
                .map(([id, t]) => ({ id, t, owned: state.techs.includes(id) }))
                .map(({ id, t, owned }) => (
                  <div className="tech" key={id}>
                    <span>
                      {t.emoji} {t.name} <small>{t.desc}</small>
                    </span>
                    {owned ? (
                      <em>acquise</em>
                    ) : (
                      <button type="button" disabled={r.science < t.cost} onClick={() => doResearch(id)}>
                        Rechercher ({t.cost} 📖)
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
