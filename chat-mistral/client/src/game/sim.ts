import { DYNASTY_NAMES, KINGDOM_NAMES, RULER_NAMES, pick } from "./names";
import type {
  Building,
  BuildingType,
  EventKind,
  GameEvent,
  GameState,
  Resources,
  Season,
  StrategyId,
  TechId,
} from "./types";

export const GRID_W = 8;
export const GRID_H = 6;

export const BUILDING_CATALOG: Record<
  BuildingType,
  { emoji: string; name: string; cost: Partial<Resources>; buildMonths: number; desc: string }
> = {
  château: { emoji: "🏰", name: "Château", cost: {}, buildMonths: 0, desc: "Cœur du royaume" },
  ferme: { emoji: "🌾", name: "Ferme", cost: { bois: 10, pierre: 5 }, buildMonths: 6, desc: "Nourrit le royaume" },
  moulin: { emoji: "🍞", name: "Moulin", cost: { bois: 15, pierre: 12 }, buildMonths: 8, desc: "Mouture, surtout en été" },
  maison: { emoji: "🏠", name: "Maison", cost: { bois: 8, pierre: 5 }, buildMonths: 4, desc: "Loge 6 âmes" },
  église: { emoji: "⛪", name: "Église", cost: { pierre: 20, or: 5 }, buildMonths: 10, desc: "Ferveur et calme" },
  atelier: { emoji: "🔨", name: "Atelier", cost: { bois: 10, pierre: 10 }, buildMonths: 6, desc: "Bois et pierre en or" },
  marché: { emoji: "⚖️", name: "Marché", cost: { bois: 12, or: 8 }, buildMonths: 6, desc: "Prospère avec le peuple" },
  tour: { emoji: "🗼", name: "Tour de guet", cost: { pierre: 18 }, buildMonths: 8, desc: "Protège des pillards" },
  cabane: { emoji: "🪓", name: "Cabane de bûcherons", cost: { pierre: 5, or: 2 }, buildMonths: 4, desc: "+3 bois par mois" },
  carrière: { emoji: "⛏️", name: "Carrière", cost: { bois: 8, or: 5 }, buildMonths: 8, desc: "+2 pierre par mois" },
  scriptorium: { emoji: "📜", name: "Scriptorium", cost: { bois: 10, pierre: 12, or: 5 }, buildMonths: 8, desc: "+1 📖 par mois" },
  bibliothèque: { emoji: "📚", name: "Bibliothèque", cost: { bois: 15, pierre: 18, or: 12 }, buildMonths: 12, desc: "+2 📖 par mois" },
  université: { emoji: "🎓", name: "Université", cost: { bois: 15, pierre: 25, or: 20 }, buildMonths: 16, desc: "+4 📖 par mois" },
  auberge: { emoji: "🍺", name: "Auberge", cost: { bois: 15, pierre: 15, or: 10 }, buildMonths: 8, desc: "Or selon le moral et la foi" },
};

export function unitCost(
  type: BuildingType,
  owned: number
): { bois: number; pierre: number; or: number } {
  const cat = BUILDING_CATALOG[type];
  const factor = Math.max(0.5, Math.pow(0.9, owned));
  return {
    bois: Math.ceil((cat.cost.bois ?? 0) * factor),
    pierre: Math.ceil((cat.cost.pierre ?? 0) * factor),
    or: Math.ceil((cat.cost.or ?? 0) * factor),
  };
}

export function quote(
  type: BuildingType,
  owned: number,
  q: number
): { bois: number; pierre: number; or: number } {
  let bois = 0;
  let pierre = 0;
  let or = 0;
  for (let i = 0; i < q; i++) {
    const c = unitCost(type, owned + i);
    bois += c.bois;
    pierre += c.pierre;
    or += c.or;
  }
  return { bois, pierre, or };
}

export const TECHS: Record<TechId, { emoji: string; name: string; cost: number; desc: string }> = {
  assollement: { emoji: "🌾", name: "Assollement triennal", cost: 20, desc: "Les fermes produisent +50% de nourriture" },
  horlogerie: { emoji: "⏳", name: "Horlogerie", cost: 25, desc: "Les marchés rapportent +50% d'or" },
  medecine: { emoji: "⚕️", name: "Médecine des quatre humeurs", cost: 30, desc: "La peste fait moitié moins de victimes" },
  remparts: { emoji: "🧱", name: "Remparts de pierre", cost: 40, desc: "Défense +4 contre les pillards" },
  imprimerie: { emoji: "🖨️", name: "Imprimerie", cost: 60, desc: "+2 📖 par mois : le savoir se répand (uchronie !)" },
};

export const STRATEGIES: { id: StrategyId; emoji: string; name: string; desc: string }[] = [
  { id: "equilibre", emoji: "⚖️", name: "Équilibre", desc: "Aucune orientation particulière" },
  { id: "prospérité", emoji: "💰", name: "Prospérité", desc: "Marchés et ateliers produisent ×1,5" },
  { id: "foi", emoji: "⛪", name: "Foi", desc: "L'Église fait gagner ×2 de foi" },
  { id: "défense", emoji: "🛡️", name: "Défense", desc: "Défense +2, pertes de guerre −25 %" },
  { id: "savoir", emoji: "📖", name: "Savoir", desc: "La science progresse ×1,5" },
  { id: "expansion", emoji: "🌾", name: "Expansion", desc: "La population croît plus vite" },
];

export const PROJECT_CATS: Record<
  string,
  { emoji: string; name: string; desc: string; keywords: string[] }
> = {
  commerce: { emoji: "💰", name: "Commerce", desc: "+or/mois (5 % de l'investissement)", keywords: ["commerce", "marché", "or", "monnaie", "trésor", "auberge", "banque"] },
  foi: { emoji: "⛪", name: "Culte", desc: "+foi/mois", keywords: ["église", "foi", "culte", "chapelle", "prière", "pèlerinage", "reliques"] },
  science: { emoji: "📖", name: "Savoir", desc: "+science/mois", keywords: ["science", "savoir", "université", "bibliothèque", "scriptorium", "étude", "alchimie"] },
  defense: { emoji: "🛡️", name: "Défense", desc: "+2 défense tant que le projet dure", keywords: ["défense", "defense", "rempart", "tour", "milice", "armée", "garde", "armes"] },
  agriculture: { emoji: "🌾", name: "Agriculture", desc: "+nourriture/mois", keywords: ["agriculture", "ferme", "champ", "nourriture", "moisson", "bétail", "terre"] },
  sante: { emoji: "⚕️", name: "Santé", desc: "la peste est deux fois moins meurtrière tant que le projet dure", keywords: ["santé", "medecine", "médecine", "peste", "hôpital", "médecin", "soin"] },
};

export const PROJECT_DURATION_MOIS = 24;

export function projectGain(montant: number): number {
  return Math.max(1, Math.round(montant * 0.05));
}

export function matchProjectCat(text: string): string {
  const t = text.toLowerCase();
  for (const [cat, c] of Object.entries(PROJECT_CATS)) {
    if (c.keywords.some((k) => t.includes(k))) return cat;
  }
  return "commerce";
}

export function invest(s: GameState, cat: string, montant: number): GameEvent | null {
  const m = Math.max(1, Math.min(Math.floor(montant), Math.floor(s.resources.or)));
  if (m < 1 || s.resources.or < 1) return null;
  const c = PROJECT_CATS[cat] ?? PROJECT_CATS.commerce;
  s.resources.or -= m;
  s.totalInvesti += m;
  s.projects.push({
    id: s.nextEventId++,
    year: s.year,
    cat,
    nom: c.name,
    emoji: c.emoji,
    montant: m,
    moisRestants: PROJECT_DURATION_MOIS,
  });
  return {
    id: s.nextEventId++,
    year: s.year,
    kind: "joy",
    text: `💰 Investissement de ${m} deniers dans « ${c.name} » — rendement ~${projectGain(m)}/mois pendant ${PROJECT_DURATION_MOIS} mois.`,
  };
}

export const COUNCIL_PROPOSALS = [
  "taxer davantage les marchés pour remplir les caisses du royaume",
  "organiser de grandes prières publiques pour apaiser le ciel",
  "lever une milice permanente pour protéger les routes",
  "fonder une école pour instruire les enfants du bourg",
  "autoriser les défrichements pour agrandir les terres labourables",
  "interdire les jeux de hasard dans les auberges",
  "subventionner les fermes pour nourrir plus de bouches",
  "réparer les remparts du château",
];

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
  return (
    (countDone(s, "château") > 0 ? 2 : 0) +
    countDone(s, "tour") +
    (s.techs?.includes("remparts") ? 4 : 0) +
    (s.strategy === "défense" ? 2 : 0) +
    s.projects.filter((p) => p.cat === "defense").length * 2
  );
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
    resources: { nourriture: 60, bois: 40, pierre: 30, or: 20, foi: 50, science: 30 },
    population: 24,
    moral: 70,
    buildings: [{ type: "château", x: 4, y: 3, progress: 1, done: true }],
    decrets: [],
    demandeConseil: null,
    strategy: "equilibre",
    projects: [],
    totalInvesti: 0,
    events: [
      {
        id: 0,
        year: 1187,
        kind: "joy",
        text: `Fondation du royaume de ${kingdom} par ${ruler}, de la maison ${dynasty}.`,
      },
    ],
    techs: [],
    nextEventId: 1,
    running: true,
    speed: 1,
    autoDev: true,
  };
}

export function research(s: GameState, id: TechId): GameEvent | null {
  if (s.techs.includes(id)) return null;
  const t = TECHS[id];
  if (s.resources.science < t.cost) return null;
  s.resources.science -= t.cost;
  s.techs.push(id);
  return {
    id: s.nextEventId++,
    year: s.year,
    kind: "joy",
    text: `Découverte : ${t.name}. ${t.desc}.`,
  };
}

export function freeTiles(s: GameState): { x: number; y: number }[] {
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
      : ["ferme", "maison", "cabane", "carrière", "marché", "tour", "atelier", "église", "moulin", "scriptorium"];
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

const VILLAGE_DECISIONS: ((s: GameState) => GameEvent | null)[] = [
  (s) => {
    if (s.resources.bois < 5) return null;
    s.resources.bois -= 5;
    s.moral = Math.min(100, s.moral + 3);
    return { id: s.nextEventId++, year: s.year, kind: "info", text: "Les villageois décident seuls de réparer le pont du gué (-5 bois, +3 moral)." };
  },
  (s) => {
    s.resources.or = Math.min(999, s.resources.or + 8);
    s.moral = Math.min(100, s.moral + 2);
    return { id: s.nextEventId++, year: s.year, kind: "joy", text: "Les villageois instaurent un marché hebdomadaire (+8 or, +2 moral)." };
  },
  (s) => {
    s.resources.foi = Math.min(100, s.resources.foi + 6);
    s.moral = Math.min(100, s.moral + 2);
    return { id: s.nextEventId++, year: s.year, kind: "info", text: "Une veillée aux chandelles est organisée au village (+6 foi, +2 moral)." };
  },
  (s) => {
    s.resources.or = Math.min(999, s.resources.or + 5);
    s.moral = Math.max(0, s.moral - 4);
    return { id: s.nextEventId++, year: s.year, kind: "danger", text: "Les villageois refusent une levée et cachent leurs réserves (+5 or, -4 moral)." };
  },
  (s) => {
    s.moral = Math.min(100, s.moral + 2);
    return { id: s.nextEventId++, year: s.year, kind: "info", text: "Le conseil des anciens tranche lui-même un conflit de voisinage (+2 moral)." };
  },
];

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
    let mult = s.techs.includes("medecine") ? 0.5 : 1;
    if (s.projects.some((p) => p.cat === "sante")) mult *= 0.5;
    const loss = Math.max(1, Math.round(Math.min(s.population, 5 + Math.floor(Math.random() * 10)) * mult));
    s.population -= loss;
    s.moral = Math.max(0, s.moral - 10);
    return mk("danger", `La peste fauche ${loss} âmes dans les chaumières${mult < 1 ? " (la médecine en a limité les ravages)" : ""}.`);
  }
  if (roll < 0.032) {
    const atk = 10 + Math.floor(Math.random() * 20);
    const def = defense(s);
    const loss = Math.max(0, Math.round((atk - def * 4) * (s.strategy === "défense" ? 0.75 : 1)));
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
  const winter = seasonOf(s.month) === "Hiver";
  if (roll < 0.072 && winter) {
    s.resources.nourriture = Math.max(0, s.resources.nourriture - 20);
    return mk("danger", `Une gelée tardive anéantit les bourgeons : -20 nourriture.`);
  }
  if (roll < 0.078) {
    const loss = Math.min(s.population, 2);
    s.population -= loss;
    return mk("danger", `Des loups rôdent la nuit dans les enclos : -${loss} âmes.`);
  }
  if (roll < 0.084) {
    s.moral = Math.min(100, s.moral + 5);
    return mk("joy", `Un jongleur divertit la place du marché : +5 moral.`);
  }
  if (roll < 0.09) {
    s.resources.foi = Math.max(0, s.resources.foi - 8);
    s.moral = Math.max(0, s.moral - 4);
    return mk("danger", `Une comète embrase le ciel nocturne : les prêtres annoncent des temps troublés (-8 foi).`);
  }
  return null;
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

  const seasonIdx = Math.floor(s.month / 3);
  const foodFactor = SEASON_FOOD[seasonIdx];
  const farmBonus = s.techs.includes("assollement") ? 1.5 : 1;
  const production = Math.round((countDone(s, "ferme") * 6 + countDone(s, "moulin") * 5) * foodFactor * farmBonus);
  const consumption = Math.round(s.population * 0.5);
  s.resources.nourriture += production - consumption;

  const woodFactor = foodFactor >= 1 ? 1 : 0.7;
  s.resources.bois += Math.round(countDone(s, "cabane") * 3 * woodFactor);
  s.resources.pierre += countDone(s, "carrière") * 2;

  const strat = s.strategy;
  const marketBonus =
    (s.techs.includes("horlogerie") ? 1.5 : 1) * (strat === "prospérité" ? 1.5 : 1);
  const ateliers = countDone(s, "atelier");
  if (ateliers > 0 && s.resources.bois >= 2 && s.resources.pierre >= 1) {
    s.resources.bois -= 2;
    s.resources.pierre -= 1;
    s.resources.or = Math.min(
      999,
      s.resources.or + Math.round(4 * ateliers * (strat === "prospérité" ? 1.5 : 1))
    );
  }
  s.resources.or = Math.min(
    999,
    s.resources.or + Math.round(countDone(s, "marché") * (1 + Math.floor(s.population / 20)) * marketBonus)
  );
  s.resources.foi = Math.min(
    100,
    s.resources.foi + countDone(s, "église") * (strat === "foi" ? 1 : 0.5)
  );
  s.resources.or = Math.min(
    999,
    s.resources.or + countDone(s, "auberge") * (2 + Math.floor(s.moral / 30))
  );

  const scienceGain =
    (countDone(s, "scriptorium") * 1 +
      countDone(s, "bibliothèque") * 2 +
      countDone(s, "université") * 4 +
      (s.techs.includes("imprimerie") ? 2 : 0)) *
    (strat === "savoir" ? 1.5 : 1);
  s.resources.science = Math.min(999, s.resources.science + Math.round(scienceGain));

  for (let i = s.projects.length - 1; i >= 0; i--) {
    const p = s.projects[i];
    const gain = projectGain(p.montant);
    if (p.cat === "commerce") s.resources.or = Math.min(999, s.resources.or + gain);
    else if (p.cat === "foi") s.resources.foi = Math.min(100, s.resources.foi + gain);
    else if (p.cat === "science") s.resources.science = Math.min(999, s.resources.science + gain);
    else if (p.cat === "agriculture") s.resources.nourriture = Math.min(500, s.resources.nourriture + gain);
    p.moisRestants -= 1;
    if (p.moisRestants <= 0) {
      s.projects.splice(i, 1);
      events.push({
        id: s.nextEventId++,
        year: y,
        kind: "info",
        text: `🏗️ Projet « ${p.nom} » terminé (${p.montant} 💰 investis, an ${p.year}).`,
      });
    }
  }

  const auto = autoDevelop(s);
  if (auto) events.push(auto);

  if (Math.random() < 0.08) {
    const decision = pick(VILLAGE_DECISIONS)(s);
    if (decision) events.push(decision);
  }

  if (!s.demandeConseil && Math.random() < 0.08) {
    const texte = pick(COUNCIL_PROPOSALS);
    s.demandeConseil = { id: s.nextEventId++, year: y, texte };
    events.push({
      id: s.nextEventId++,
      year: y,
      kind: "info",
      text: `🙇 Le conseil des anciens propose au seigneur : ${texte}.`,
    });
  }

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
    s.population += Math.min(strat === "expansion" ? 3 : 2, cap - s.population);
    s.moral = Math.min(100, s.moral + 1);
  }
  s.moral = Math.max(0, s.moral - 0.2);

  if (Math.random() < 0.09) {
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
      text: `Bilan de l'an ${s.year} : population ${s.population}, moral ${Math.round(s.moral)}, trésor ${s.resources.or} deniers, savoir ${Math.round(s.resources.science)} 📖.`,
    });
  }

  s.resources.nourriture = Math.min(500, Math.max(0, s.resources.nourriture));
  s.resources.bois = Math.min(999, Math.max(0, s.resources.bois));
  s.resources.pierre = Math.min(999, Math.max(0, s.resources.pierre));

  return events;
}

export function estimateIncome(s: GameState): number {
  const marketBonus =
    (s.techs.includes("horlogerie") ? 1.5 : 1) * (s.strategy === "prospérité" ? 1.5 : 1);
  const marches = s.buildings.filter((b) => b.done && b.type === "marché").length;
  const auberges = s.buildings.filter((b) => b.done && b.type === "auberge").length;
  const projets = s.projects
    .filter((p) => p.cat === "commerce")
    .reduce((acc, p) => acc + projectGain(p.montant), 0);
  return (
    Math.round(marches * (1 + Math.floor(s.population / 20)) * marketBonus) +
    auberges * (2 + Math.floor(s.moral / 30)) +
    projets
  );
}

export function buildingAt(s: GameState, x: number, y: number): Building | undefined {
  return s.buildings.find((b) => b.x === x && b.y === y);
}
