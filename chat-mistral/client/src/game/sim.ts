import { DYNASTY_NAMES, KINGDOM_NAMES, RULER_NAMES, pick } from "./names";
import type {
  Building,
  BuildingType,
  EventKind,
  GameEvent,
  GameState,
  PetitionType,
  Resources,
  Season,
} from "./types";

export const GRID_W = 8;
export const GRID_H = 6;

export const BUILDING_CATALOG: Record<
  BuildingType,
  { emoji: string; name: string; cost: Partial<Resources>; buildMonths: number; desc: string }
> = {
  château: { emoji: "🏰", name: "Château", cost: {}, buildMonths: 0, desc: "Cœur du royaume" },
  ferme: { emoji: "🌾", name: "Ferme", cost: { bois: 20, pierre: 10 }, buildMonths: 6, desc: "Nourrit le royaume" },
  moulin: { emoji: "🍞", name: "Moulin", cost: { bois: 30, pierre: 25 }, buildMonths: 8, desc: "Mouture, surtout en été" },
  maison: { emoji: "🏠", name: "Maison", cost: { bois: 15, pierre: 10 }, buildMonths: 4, desc: "Loge 6 âmes" },
  église: { emoji: "⛪", name: "Église", cost: { pierre: 40, or: 10 }, buildMonths: 10, desc: "Ferveur et calme" },
  atelier: { emoji: "🔨", name: "Atelier", cost: { bois: 20, pierre: 20 }, buildMonths: 6, desc: "Bois et pierre en or" },
  marché: { emoji: "⚖️", name: "Marché", cost: { bois: 25, or: 15 }, buildMonths: 6, desc: "Prospère avec le peuple" },
  tour: { emoji: "🗼", name: "Tour de guet", cost: { pierre: 35 }, buildMonths: 8, desc: "Protège des pillards" },
  cabane: { emoji: "🪓", name: "Cabane de bûcherons", cost: { pierre: 10, or: 5 }, buildMonths: 4, desc: "+3 bois par mois" },
  carrière: { emoji: "⛏️", name: "Carrière", cost: { bois: 15, or: 10 }, buildMonths: 8, desc: "+2 pierre par mois" },
};

const SEASONS: Season[] = ["Printemps", "Été", "Automne", "Hiver"];
const SEASON_FOOD = [1.2, 1.6, 1.0, 0.4];

export function seasonOf(month: number): Season {
  return SEASONS[Math.floor(month / 3)];
}

function countDone(s: GameState, type: BuildingType): number {
  return s.buildings.filter((b) => b.done && b.type === type).length;
}

export function housingCap(s: GameState): number {
  return 10 + countDone(s, "maison") * 6;
}

export function defense(s: GameState): number {
  return (countDone(s, "château") > 0 ? 2 : 0) + countDone(s, "tour");
}

export function createGame(): GameState {
  const ruler = pick(RULER_NAMES);
  const kingdom = pick(KINGDOM_NAMES);
  const dynasty = pick(DYNASTY_NAMES);
  return {
    kingdom,
    dynasty,
    ruler,
    year: 1187,
    month: 0,
    resources: { nourriture: 60, bois: 40, pierre: 30, or: 20, foi: 50 },
    population: 24,
    moral: 70,
    buildings: [{ type: "château", x: 4, y: 3, progress: 1, done: true }],
    pendingPetition: null,
    events: [
      {
        id: 0,
        year: 1187,
        kind: "joy",
        text: `Fondation du royaume de ${kingdom} par ${ruler}, de la maison ${dynasty}.`,
      },
    ],
    nextEventId: 1,
    running: true,
    speed: 1,
    autoDev: true,
  };
}

function randomEvent(s: GameState): GameEvent | null {
  const roll = Math.random();
  const mk = (kind: EventKind, text: string): GameEvent => ({
    id: s.nextEventId++,
    year: s.year,
    kind,
    text,
  });
  if (roll < 0.008) {
    const newRuler = pick(RULER_NAMES);
    let dynasty = s.dynasty;
    let text = `Le seigneur ${s.ruler} rend l'âme. ${newRuler} monte sur le trône.`;
    if (Math.random() < 0.3) {
      dynasty = pick(DYNASTY_NAMES);
      text += ` La maison ${dynasty} s'empare du pouvoir : l'histoire bascule.`;
    }
    s.ruler = newRuler;
    s.dynasty = dynasty;
    return mk("joy", text);
  }
  if (roll < 0.02) {
    const loss = Math.min(s.population, 5 + Math.floor(Math.random() * 10));
    s.population -= loss;
    s.moral = Math.max(0, s.moral - 10);
    return mk("danger", `La peste fauche ${loss} âmes dans les chaumières.`);
  }
  if (roll < 0.032) {
    const atk = 10 + Math.floor(Math.random() * 20);
    const def = defense(s);
    const loss = Math.max(0, atk - def * 4);
    s.resources.or = Math.max(0, s.resources.or - loss);
    return mk(
      "danger",
      `Des routiers pillent les convois : ${loss} deniers perdus${def > 0 ? ", les tours ont atténué le désastre" : ""}.`
    );
  }
  if (roll < 0.042) {
    const gain = 20 + Math.floor(Math.random() * 25);
    s.resources.nourriture = Math.min(500, s.resources.nourriture + gain);
    return mk("joy", `Récolte abondante : +${gain} de nourriture.`);
  }
  if (roll < 0.052) {
    s.resources.foi = Math.min(100, s.resources.foi + 12);
    return mk("joy", `Un pèlerinage traverse le royaume : la foi grandit.`);
  }
  if (roll < 0.06) {
    const gain = 10 + Math.floor(Math.random() * 20) + Math.floor(s.population / 10);
    s.resources.or = Math.min(999, s.resources.or + gain);
    return mk("joy", `Les marchands prospèrent : +${gain} deniers.`);
  }
  if (roll < 0.066) {
    const idx = s.buildings.findIndex((b) => b.done && b.type !== "château");
    if (idx >= 0) {
      const b = s.buildings[idx];
      s.buildings.splice(idx, 1);
      return mk("danger", `Un incendie réduit en cendres : ${BUILDING_CATALOG[b.type].name}.`);
    }
    return null;
  }
  return null;
}

function freeTiles(s: GameState): { x: number; y: number }[] {
  const tiles: { x: number; y: number }[] = [];
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (!buildingAt(s, x, y)) tiles.push({ x, y });
    }
  }
  return tiles;
}

function autoDevelop(s: GameState): GameEvent | null {
  if (!s.autoDev || Math.random() > 0.3) return null;
  const needFood = s.resources.nourriture < s.population;
  const nearCap = s.population >= housingCap(s) - 2;
  const candidates: BuildingType[] = needFood
    ? ["ferme", "moulin", "ferme"]
    : nearCap
      ? ["maison", "maison"]
      : ["ferme", "maison", "cabane", "carrière", "marché", "tour", "atelier", "église", "moulin"];
  const type = pick(candidates);
  const cat = BUILDING_CATALOG[type];
  const r = s.resources;
  if (r.bois < (cat.cost.bois ?? 0) || r.pierre < (cat.cost.pierre ?? 0) || r.or < (cat.cost.or ?? 0)) {
    return null;
  }
  const tiles = freeTiles(s);
  if (tiles.length === 0) return null;
  const t = pick(tiles);
  r.bois -= cat.cost.bois ?? 0;
  r.pierre -= cat.cost.pierre ?? 0;
  r.or -= cat.cost.or ?? 0;
  s.buildings.push({ type, x: t.x, y: t.y, progress: 0, done: false });
  return {
    id: s.nextEventId++,
    year: s.year,
    kind: "info",
    text: `Les villageois élèvent : ${cat.name.toLowerCase()}.`,
  };
}

export const PETITION_TEXT: Record<PetitionType, string> = {
  forest: "Les villageois demandent l'autorisation de défricher la forêt de chênes pour agrandir les champs.",
  chapel: "Les anciens réclament la permission d'ériger une chapelle au bout du village (10 deniers).",
  feast: "Le conseil des anciens sollicite un banquet pour célébrer la saison (15 de nourriture).",
  tithe: "Le curé réclame la dîme du moulin au nom de l'Église (8 deniers).",
};

const PETITION_OUTCOMES: Record<
  PetitionType,
  { accept: (s: GameState) => string; refuse: (s: GameState) => string }
> = {
  forest: {
    accept: (s) => {
      s.resources.bois = Math.min(999, s.resources.bois + 12);
      s.moral = Math.min(100, s.moral + 4);
      return "La forêt est défrichée : +12 bois. Le peuple acclame son seigneur.";
    },
    refuse: (s) => {
      s.moral = Math.max(0, s.moral - 5);
      return "Le seigneur interdit le défrichement ; un murmure parcourt le village.";
    },
  },
  chapel: {
    accept: (s) => {
      s.resources.or = Math.max(0, s.resources.or - 10);
      s.resources.foi = Math.min(100, s.resources.foi + 15);
      s.moral = Math.min(100, s.moral + 3);
      return "La chapelle est érigée et bénie : la foi grandit (+15).";
    },
    refuse: (s) => {
      s.resources.foi = Math.max(0, s.resources.foi - 8);
      s.moral = Math.max(0, s.moral - 3);
      return "Le seigneur refuse la chapelle ; les anciens baissent la tête.";
    },
  },
  feast: {
    accept: (s) => {
      s.resources.nourriture = Math.max(0, s.resources.nourriture - 15);
      s.moral = Math.min(100, s.moral + 10);
      return "Le banquet est donné : le moral du peuple grimpe (+10).";
    },
    refuse: (s) => {
      s.moral = Math.max(0, s.moral - 6);
      return "Pas de banquet cette année. Les villageois se couchent de mauvaise humeur.";
    },
  },
  tithe: {
    accept: (s) => {
      s.resources.or = Math.max(0, s.resources.or - 8);
      s.resources.foi = Math.min(100, s.resources.foi + 10);
      return "La dîme est versée : l'Église prie pour le seigneur (+10 foi).";
    },
    refuse: (s) => {
      s.resources.foi = Math.max(0, s.resources.foi - 10);
      s.moral = Math.max(0, s.moral - 4);
      return "Le seigneur refuse la dîme ; le curé fulmine du haut de sa chaire.";
    },
  },
};

export function makePetition(s: GameState): GameEvent | null {
  if (s.pendingPetition || Math.random() > 0.12) return null;
  const type = pick(["forest", "chapel", "feast", "tithe"] as PetitionType[]);
  const ev: GameEvent = {
    id: s.nextEventId++,
    year: s.year,
    kind: "petition",
    text: PETITION_TEXT[type],
    petition: type,
  };
  s.pendingPetition = ev;
  return ev;
}

export function resolvePetition(s: GameState, accept: boolean): GameEvent | null {
  const p = s.pendingPetition;
  if (!p || !p.petition) return null;
  s.pendingPetition = null;
  const outcome = accept
    ? PETITION_OUTCOMES[p.petition].accept(s)
    : PETITION_OUTCOMES[p.petition].refuse(s);
  return {
    id: s.nextEventId++,
    year: s.year,
    kind: accept ? "joy" : "danger",
    text: outcome,
  };
}

export function step(s: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const y = s.year;

  for (const b of s.buildings) {
    if (!b.done) {
      const cat = BUILDING_CATALOG[b.type];
      b.progress = Math.min(1, b.progress + 1 / cat.buildMonths);
      if (b.progress >= 1) {
        b.done = true;
        events.push({
          id: s.nextEventId++,
          year: y,
          kind: "joy",
          text: `Construction achevée : ${cat.name}. Le royaume s'agrandit.`,
        });
      }
    }
  }

  const foodFactor = SEASON_FOOD[Math.floor(s.month / 3)];
  const production = Math.round((countDone(s, "ferme") * 6 + countDone(s, "moulin") * 5) * foodFactor);
  const consumption = Math.round(s.population * 0.5);
  s.resources.nourriture += production - consumption;

  const woodFactor = foodFactor >= 1 ? 1 : 0.7;
  s.resources.bois += Math.round(countDone(s, "cabane") * 3 * woodFactor);
  s.resources.pierre += countDone(s, "carrière") * 2;

  const auto = autoDevelop(s);
  if (auto) events.push(auto);

  const petition = makePetition(s);
  if (petition) events.push(petition);

  const ateliers = countDone(s, "atelier");
  if (ateliers > 0 && s.resources.bois >= 2 && s.resources.pierre >= 1) {
    s.resources.bois -= 2;
    s.resources.pierre -= 1;
    s.resources.or = Math.min(999, s.resources.or + 4 * ateliers);
  }
  s.resources.or = Math.min(999, s.resources.or + countDone(s, "marché") * (1 + Math.floor(s.population / 20)));
  s.resources.foi = Math.min(100, s.resources.foi + countDone(s, "église") * 0.5);

  const cap = housingCap(s);
  if (s.resources.nourriture < 0) {
    const loss = Math.min(s.population, Math.ceil(-s.resources.nourriture / 3) + 1);
    s.population -= loss;
    s.resources.nourriture = 0;
    s.moral = Math.max(0, s.moral - 8);
    events.push({
      id: s.nextEventId++,
      year: y,
      kind: "danger",
      text: `Famine : ${loss} âmes périssent de faim. Le moral s'effondre.`,
    });
  } else if (s.population < cap && s.resources.nourriture >= s.population) {
    s.population += Math.min(2, cap - s.population);
    s.moral = Math.min(100, s.moral + 1);
  }
  s.moral = Math.max(0, s.moral - 0.2);

  if (Math.random() < 0.06) {
    const ev = randomEvent(s);
    if (ev) events.push(ev);
  }

  s.month += 1;
  if (s.month >= 12) {
    s.month = 0;
    s.year += 1;
    events.push({
      id: s.nextEventId++,
      year: s.year,
      kind: "info",
      text: `Bilan de l'an ${s.year} : population ${s.population}, moral ${Math.round(s.moral)}, trésor ${s.resources.or} deniers.`,
    });
  }

  s.resources.nourriture = Math.min(500, Math.max(0, s.resources.nourriture));
  s.resources.bois = Math.min(999, Math.max(0, s.resources.bois));
  s.resources.pierre = Math.min(999, Math.max(0, s.resources.pierre));

  return events;
}

export function buildingAt(s: GameState, x: number, y: number): Building | undefined {
  return s.buildings.find((b) => b.x === x && b.y === y);
}
