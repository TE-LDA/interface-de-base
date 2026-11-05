import { useEffect, useRef, useState } from "react";
import { narrate } from "./game/chronicle";
import {
  BUILDING_CATALOG,
  GRID_H,
  GRID_W,
  PETITION_TEXT,
  buildingAt,
  createGame,
  defense,
  housingCap,
  resolvePetition,
  seasonOf,
  step,
} from "./game/sim";
import type { BuildingType, ChronicleEntry, GameState } from "./game/types";

const SAVE_KEY = "uchronie-royaume-save";
const TICK_MS = 450;
const SPEEDS = [1, 2, 4];

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const narrated = useRef(new Set<number>());
  const [state, setState] = useState<GameState>(() => {
    const saved = load();
    if (saved) {
      if (typeof saved.autoDev !== "boolean") saved.autoDev = true;
      if (!saved.pendingPetition) saved.pendingPetition = null;
      saved.events.forEach((e) => narrated.current.add(e.id));
    }
    return saved ?? createGame();
  });
  const [chronicle, setChronicle] = useState<ChronicleEntry[]>([]);
  const [selected, setSelected] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!state.running) return;
    const id = setInterval(() => {
      setState((prev) => {
        const next: GameState = {
          ...prev,
          resources: { ...prev.resources },
          buildings: prev.buildings.map((b) => ({ ...b })),
          events: [...prev.events],
        };
        for (const e of step(next)) {
          next.events.push(e);
          if (narrated.current.has(e.id)) continue;
          narrated.current.add(e.id);
          if (e.kind === "info") {
            setChronicle((c) => [...c, { year: e.year, text: e.text }]);
          } else if (e.kind !== "petition") {
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

  function toggleRunning() {
    setState((s) => ({ ...s, running: !s.running }));
  }

  function cycleSpeed() {
    setState((s) => ({ ...s, speed: SPEEDS[(SPEEDS.indexOf(s.speed) + 1) % SPEEDS.length] }));
  }

  function toggleAutoDev() {
    setState((s) => ({ ...s, autoDev: !s.autoDev }));
  }

  function answerPetition(accept: boolean) {
    setState((s) => {
      if (!s.pendingPetition) return s;
      const next: GameState = {
        ...s,
        resources: { ...s.resources },
        buildings: s.buildings.map((b) => ({ ...b })),
        events: [...s.events],
        pendingPetition: { ...s.pendingPetition },
      };
      const outcome = resolvePetition(next, accept);
      if (outcome) {
        next.events.push(outcome);
        if (!narrated.current.has(outcome.id)) {
          narrated.current.add(outcome.id);
          void narrate(next, outcome).then((text) =>
            setChronicle((c) => [...c, { year: outcome.year, text }])
          );
        }
      }
      return next;
    });
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

  const selectedBuilding = selected ? buildingAt(state, selected.x, selected.y) : undefined;
  const r = state.resources;

  return (
    <div className="app">
      <header className="topbar">
        <h1>
          🏰 Royaume de {state.kingdom}
        </h1>
        <div className="subtitle">
          Maison {state.dynasty} — {state.ruler} — An {state.year} — {seasonOf(state.month)}
        </div>
        <div className="controls">
          <button type="button" onClick={toggleRunning}>
            {state.running ? "⏸ Pause" : "▶ Lecture"}
          </button>
          <button type="button" onClick={cycleSpeed}>
            Vitesse ×{state.speed}
          </button>
          <button type="button" onClick={toggleAutoDev} aria-pressed={state.autoDev}>
            🏘️ Village autonome : {state.autoDev ? "oui" : "non"}
          </button>
          <button type="button" onClick={newGame}>
            Nouvelle chronique
          </button>
        </div>
      </header>

      <div className="resources">
        <span className="chip">🍞 {Math.round(r.nourriture)}</span>
        <span className="chip">👥 {state.population}/{housingCap(state)}</span>
        <span className="chip">🪵 {Math.round(r.bois)}</span>
        <span className="chip">🪨 {Math.round(r.pierre)}</span>
        <span className="chip">💰 {Math.round(r.or)}</span>
        <span className="chip">⛪ {Math.round(r.foi)}</span>
        <span className="chip">😊 {Math.round(state.moral)}</span>
        <span className="chip">🛡️ {defense(state)}</span>
      </div>

      <main className="game">
        <section className="map">
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
        </section>

        <aside className="side">
          {state.pendingPetition?.petition && (
            <div className="petition">
              <h2>🙇 Demande des villageois</h2>
              <p>{PETITION_TEXT[state.pendingPetition.petition]}</p>
              <div className="petition-actions">
                <button type="button" className="accept" onClick={() => answerPetition(true)}>
                  Accorder
                </button>
                <button type="button" className="refuse" onClick={() => answerPetition(false)}>
                  Refuser
                </button>
              </div>
            </div>
          )}
          {selected && !selectedBuilding && (
            <div className="palette">
              <h2>Construire en ({selected.x + 1}, {selected.y + 1})</h2>
              {(
                Object.entries(BUILDING_CATALOG) as [BuildingType, (typeof BUILDING_CATALOG)[BuildingType]][]
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
          )}
          <div className="chronicle">
            <h2>📜 Chronique</h2>
            {chronicle.length === 0 && <p className="empty">Les siècles s'écoulent…</p>}
            {[...chronicle].reverse().map((c, i) => (
              <p key={i}>
                <strong>An {c.year}</strong> — {c.text}
              </p>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}
