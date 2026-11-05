import { DYNASTY_NAMES, KINGDOM_NAMES, RULER_NAMES, pick } from "./names";
import type {
  Building,
  BuildingType,
  Buff,
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
    s.projects.filter((p) => p.cat === "defense" && p.actif).reduce((a, p) => a + p.niveau * 2, 0) +
    s.buffs.reduce((a, b) => a + (b.defense ?? 0), 0)
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
    events: [
      {
        id: 0,
        year: 1187,
        kind: "joy",
        text: `Fondation du royaume de ${kingdom} par ${ruler}, de la maison ${dynasty}.`,
      },
    ],
    decrets: [],
    demandeConseil: null,
    strategy: "equilibre",
    projects: [],
    totalInvesti: 0,
    investiParCat: {},
    orDebutAnnee: 20,
    mesures: [],
    buffs: [],
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

export function buildingAt(s: GameState, x: number, y: number): Building | undefined {
  return s.buildings.find((b) => b.x === x && b.y === y);
}

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

// ---------- Actifs durables (investissements) ----------

export const PROJECT_CATS: Record<
  string,
  { emoji: string; name: string; desc: string; keywords: string[]; yield: number }
> = {
  commerce: { emoji: "💰", name: "Commerce", desc: "actif durable : +2 or/mois par niveau", keywords: ["commerce", "marché", "or", "monnaie", "trésor", "auberge", "banque", "foire", "marchands"], yield: 2 },
  foi: { emoji: "⛪", name: "Culte", desc: "actif durable : +2 foi/mois par niveau", keywords: ["église", "foi", "culte", "chapelle", "prière", "pèlerinage", "reliques", "cathédrale"], yield: 2 },
  science: { emoji: "📖", name: "Savoir", desc: "actif durable : +2 📖/mois par niveau", keywords: ["science", "savoir", "université", "bibliothèque", "scriptorium", "étude", "alchimie", "école"], yield: 2 },
  defense: { emoji: "🛡️", name: "Défense", desc: "actif durable : +2 défense par niveau", keywords: ["défense", "defense", "rempart", "tour", "milice", "armée", "garde", "armes", "château fort"], yield: 0 },
  agriculture: { emoji: "🌾", name: "Agriculture", desc: "actif durable : +3 nourriture/mois par niveau", keywords: ["agriculture", "ferme", "champ", "nourriture", "moisson", "bétail", "terre"], yield: 3 },
  sante: { emoji: "⚕️", name: "Santé", desc: "actif durable : peste deux fois moins meurtrière", keywords: ["santé", "medecine", "médecine", "peste", "hôpital", "médecin", "soin", "apothicaire"], yield: 0 },
};

export function niveauOf(montant: number): number {
  return montant >= 150 ? 3 : montant >= 50 ? 2 : 1;
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
  const niveau = niveauOf(m);
  s.resources.or -= m;
  s.totalInvesti += m;
  s.investiParCat[cat] = (s.investiParCat[cat] ?? 0) + m;
  s.projects.push({
    id: s.nextEventId++,
    year: s.year,
    cat,
    nom: c.name,
    emoji: c.emoji,
    montant: m,
    niveau,
    actif: false,
    moisRestants: 6 + niveau * 4,
    yield: c.yield * niveau,
    upkeep: niveau,
  });
  return {
    id: s.nextEventId++,
    year: s.year,
    kind: "joy",
    text: `💰 Investissement de ${m} deniers dans « ${c.name} » (niveau ${niveau}) : chantier de ${6 + niveau * 4} mois, puis ${c.yield > 0 ? `+${c.yield * niveau}/mois permanent` : "effet permanent"}, entretien ${niveau} or/mois.`,
  };
}

export const ADVISOR_THRESHOLD = 50;

export function advisorStrategy(
  cat: string
): { text: string; kind: EventKind; effets: Record<string, number>; building?: BuildingType } | null {
  switch (cat) {
    case "commerce":
      return { text: "Les conseillers lancent une grande foire et attirent des commerçants : un marché est érigé gratuitement, mais les petits artisans locaux dénoncent la concurrence (-3 moral).", kind: "joy", effets: { moral: -3 }, building: "marché" };
    case "foi":
      return { text: "Les conseillers érigent une chapelle et appellent un pèlerinage (+15 foi), mais les libertins du bourg râlent contre tant de bigoterie (-2 moral).", kind: "joy", effets: { foi: 15, moral: -2 }, building: "église" };
    case "defense":
      return { text: "Les conseillers lèvent une milice et érigent une tour de guet, mais prélèvent une taxe de guerre (-10 or, -2 moral).", kind: "joy", effets: { or: -10, moral: -2 }, building: "tour" };
    case "agriculture":
      return { text: "Les conseillers défrichent et sèment de nouveaux champs : une ferme est créée et +10 bois sont coupés, mais la forêt sacrée est profanée (-3 foi).", kind: "joy", effets: { bois: 10, foi: -3 }, building: "ferme" };
    case "science":
      return { text: "Les conseillers attirent des maîtres étrangers et fondent un scriptorium (+10 📖), mais réclament leur dû (-10 or).", kind: "joy", effets: { science: 10, or: -10 }, building: "scriptorium" };
    case "sante":
      return { text: "Grâce à vos subsides, un médecin s'installe au château : la peste sera désormais atténuée, mais ses honoraires coûtent 8 or.", kind: "joy", effets: { or: -8 } };
    default:
      return null;
  }
}

// ---------- Décisions réelles du petit seigneur ----------

export const DECISIONS: Record<
  string,
  { emoji: string; name: string; desc: string; keywords: string[]; toggle?: boolean }
> = {
  moulin: { emoji: "⚙️", name: "Moulin banal", desc: "+or/mois selon la population, −2 moral (bascule)", keywords: ["moulin banal", "banalité", "banalite", "moudre"], toggle: true },
  octroi: { emoji: "📯", name: "Charte de marché (octroi)", desc: "15 or → un marché permanent (+revenus), −2 moral", keywords: ["octroi", "charte de marché", "charte de marche", "autoriser un marché", "foire autorisée"] },
  taille: { emoji: "🧾", name: "Levée de la taille", desc: "+or selon la population, −6 moral (risque de révolte si moral bas)", keywords: ["taille", "impôt", "imposer", "taxe", "cens"] },
  corvee: { emoji: "⛏️", name: "Corvée", desc: "chantiers ×2 pendant 12 mois, −4 moral", keywords: ["corvée", "corvee", "travail forcé", "travail force"] },
  gite: { emoji: "🍷", name: "Gîte du suzerain", desc: "−15 or, +8 foi, +2 moral (héberger le seigneur supérieur)", keywords: ["gîte", "gite", "suzerain", "héberger", "heberger", "recevoir le seigneur", "hospitalité"] },
  ost: { emoji: "🐎", name: "Ost militaire (40 jours)", desc: "−10 or, +4 défense pendant 12 mois, +3 moral", keywords: ["ost", "service militaire", "40 jours", "armée du suzerain", "chevauchée"] },
  grenier: { emoji: "🫙", name: "Grenier seigneurial", desc: "−25 nourriture stockés, famine deux fois moins meurtrière (bascule)", keywords: ["grenier", "réserve de grain", "reserve de grain", "stock de blé", "stock de ble"], toggle: true },
  justice: { emoji: "⚖️", name: "Justice basse (amendes)", desc: "+1 or/mois, −1 moral/mois (bascule)", keywords: ["justice", "amendes", "tribunal", "prévôt", "prevot"], toggle: true },
  mariage: { emoji: "💍", name: "Mariage dynastique", desc: "dot (+25 or) ou alliance (+5 défense 24 mois), +3 moral", keywords: ["mariage", "marier", "alliance", "dot", "fiancailles"] },
  chasse: { emoji: "🦌", name: "Réserve de chasse", desc: "+1 bois/mois, −1 moral/mois (bascule)", keywords: ["chasse", "forêt", "foret", "réserve de chasse", "gibier"], toggle: true },
};

export function matchDecision(text: string): string | null {
  const t = text.toLowerCase();
  for (const [id, d] of Object.entries(DECISIONS)) {
    if (d.keywords.some((k) => t.includes(k))) return id;
  }
  return null;
}

function mkEvent(s: GameState, kind: EventKind, text: string): GameEvent {
  return { id: s.nextEventId++, year: s.year, kind, text };
}

export function applyDecision(s: GameState, id: string): GameEvent | null {
  const d = DECISIONS[id];
  if (!d) return null;
  const r = s.resources;
  if (d.toggle) {
    const active = s.mesures.includes(id);
    if (active) {
      s.mesures = s.mesures.filter((m) => m !== id);
      return mkEvent(s, "info", `${d.emoji} On abolit : ${d.name}. Le peuple se réjouit.`);
    }
    s.mesures.push(id);
    if (id === "moulin") {
      s.moral = Math.max(0, s.moral - 2);
      return mkEvent(s, "joy", `${d.emoji} Moulin banal instauré : les paysans paieront la banalité (+or/mois selon la population), mais ils grognent (-2 moral).`);
    }
    if (id === "grenier") {
      r.nourriture = Math.max(0, r.nourriture - 25);
      return mkEvent(s, "joy", `${d.emoji} Grenier seigneurial rempli : -25 nourriture stockés, la famine sera deux fois moins meurtrière.`);
    }
    if (id === "justice") {
      return mkEvent(s, "joy", `${d.emoji} Justice basse exercée : +1 or/mois d'amendes, mais -1 moral/mois.`);
    }
    if (id === "chasse") {
      return mkEvent(s, "joy", `${d.emoji} Réserve de chasse décrétée : +1 bois/mois, -1 moral/mois (les paysans perdent l'affouage).`);
    }
  }
  switch (id) {
    case "taille": {
      const gain = Math.max(1, Math.ceil(s.population / 4));
      r.or = Math.min(999, r.or + gain);
      s.moral = Math.max(0, s.moral - 6);
      if (s.moral < 30) {
        s.population = Math.max(0, s.population - 3);
        r.or = Math.max(0, r.or - 10);
        return mkEvent(s, "danger", `${d.emoji} Taille levée (+${gain} or) mais le peuple se révolte : -3 âmes, -10 or de dégâts.`);
      }
      return mkEvent(s, "joy", `${d.emoji} Taille levée sur les paysans : +${gain} or, mais le moral baisse (-6).`);
    }
    case "corvee": {
      s.moral = Math.max(0, s.moral - 4);
      s.buffs.push({ id: s.nextEventId++, nom: "Corvée", moisRestants: 12, chantierX2: true });
      return mkEvent(s, "joy", `${d.emoji} Corvée décrétée : les chantiers avancent deux fois plus vite pendant 12 mois (-4 moral).`);
    }
    case "gite": {
      r.or = Math.max(0, r.or - 15);
      r.foi = Math.min(100, r.foi + 8);
      s.moral = Math.min(100, s.moral + 2);
      return mkEvent(s, "joy", `${d.emoji} Le suzerain et sa suite sont reçus au château (-15 or) : +8 foi, +2 moral, l'alliance se renforce.`);
    }
    case "ost": {
      r.or = Math.max(0, r.or - 10);
      s.moral = Math.min(100, s.moral + 3);
      s.buffs.push({ id: s.nextEventId++, nom: "Ost militaire", moisRestants: 12, defense: 4 });
      return mkEvent(s, "joy", `${d.emoji} 40 jours de service rendus au suzerain (-10 or) : +4 défense pendant 12 mois, +3 moral.`);
    }
    case "octroi": {
      if (r.or < 15) return mkEvent(s, "danger", `${d.emoji} Charte de marché refusée : il faut 15 or de frais d'octroi.`);
      r.or -= 15;
      s.moral = Math.max(0, s.moral - 2);
      const tiles = freeTiles(s);
      if (tiles.length > 0) {
        const t = tiles[Math.floor(Math.random() * tiles.length)];
        s.buildings.push({ type: "marché", x: t.x, y: t.y, progress: 1, done: true });
      }
      return mkEvent(s, "joy", `${d.emoji} Charte de marché accordée (-15 or) : un marché permanent est érigé, les tonlieux rapporteront de l'or (-2 moral).`);
    }
    case "mariage": {
      s.moral = Math.min(100, s.moral + 3);
      if (Math.random() < 0.5) {
        r.or = Math.min(999, r.or + 25);
        return mkEvent(s, "joy", `${d.emoji} Mariage dynastique : la dot de 25 or entre dans la caisse, +3 moral.`);
      }
      s.buffs.push({ id: s.nextEventId++, nom: "Alliance matrimoniale", moisRestants: 24, defense: 5 });
      return mkEvent(s, "joy", `${d.emoji} Mariage dynastique : une alliance est scellée (+5 défense pendant 24 mois), +3 moral.`);
    }
  }
  return null;
}

// ---------- Simulation ----------

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
  return mkEvent(s, "info", `Les villageois élèvent : ${cat.name.toLowerCase()}.`);
}

const VILLAGE_DECISIONS: ((s: GameState) => GameEvent | null)[] = [
  (s) => {
    if (s.resources.bois < 5) return null;
    s.resources.bois -= 5;
    s.moral = Math.min(100, s.moral + 3);
    return mkEvent(s, "info", "Les villageois décident seuls de réparer le pont du gué (-5 bois, +3 moral).");
  },
  (s) => {
    s.resources.or = Math.min(999, s.resources.or + 8);
    s.moral = Math.min(100, s.moral + 2);
    return mkEvent(s, "joy", "Les villageois instaurent un marché hebdomadaire (+8 or, +2 moral).");
  },
  (s) => {
    s.resources.foi = Math.min(100, s.resources.foi + 6);
    s.moral = Math.min(100, s.moral + 2);
    return mkEvent(s, "info", "Une veillée aux chandelles est organisée au village (+6 foi, +2 moral).");
  },
  (s) => {
    s.resources.or = Math.min(999, s.resources.or + 5);
    s.moral = Math.max(0, s.moral - 4);
    return mkEvent(s, "danger", "Les villageois refusent une levée et cachent leurs réserves (+5 or, -4 moral).");
  },
  (s) => {
    s.moral = Math.min(100, s.moral + 2);
    return mkEvent(s, "info", "Le conseil des anciens tranche lui-même un conflit de voisinage (+2 moral).");
  },
];

function randomEvent(s: GameState): GameEvent | null {
  const roll = Math.random();
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
    return mkEvent(s, "joy", text);
  }
  if (roll < 0.02) {
    let mult = s.techs.includes("medecine") ? 0.5 : 1;
    if (s.projects.some((p) => p.cat === "sante" && p.actif)) mult *= 0.5;
    const loss = Math.max(1, Math.round(Math.min(s.population, 5 + Math.floor(Math.random() * 10)) * mult));
    s.population -= loss;
    s.moral = Math.max(0, s.moral - 10);
    return mkEvent(s, "danger", `La peste fauche ${loss} âmes dans les chaumières${mult < 1 ? " (médecine et soins en ont limité les ravages)" : ""}.`);
  }
  if (roll < 0.032) {
    const atk = 10 + Math.floor(Math.random() * 20);
    const def = defense(s);
    const loss = Math.max(0, Math.round((atk - def * 4) * (s.strategy === "défense" ? 0.75 : 1)));
    s.resources.or = Math.max(0, s.resources.or - loss);
    return mkEvent(s, "danger", `Des routiers pillent les convois : ${loss} deniers perdus${def > 0 ? ", les tours ont atténué le désastre" : ""}.`);
  }
  if (roll < 0.042) {
    const gain = 20 + Math.floor(Math.random() * 25);
    s.resources.nourriture = Math.min(500, s.resources.nourriture + gain);
    return mkEvent(s, "joy", `Récolte abondante : +${gain} de nourriture.`);
  }
  if (roll < 0.052) {
    s.resources.foi = Math.min(100, s.resources.foi + 12);
    return mkEvent(s, "joy", `Un pèlerinage traverse le royaume : la foi grandit.`);
  }
  if (roll < 0.06) {
    const gain = 10 + Math.floor(Math.random() * 20) + Math.floor(s.population / 10);
    s.resources.or = Math.min(999, s.resources.or + gain);
    return mkEvent(s, "joy", `Les marchands prospèrent : +${gain} deniers.`);
  }
  if (roll < 0.066) {
    const idx = s.buildings.findIndex((b) => b.done && b.type !== "château");
    if (idx >= 0) {
      const b = s.buildings[idx];
      s.buildings.splice(idx, 1);
      return mkEvent(s, "danger", `Un incendie réduit en cendres : ${BUILDING_CATALOG[b.type].name}.`);
    }
    return null;
  }
  const winter = seasonOf(s.month) === "Hiver";
  if (roll < 0.072 && winter) {
    s.resources.nourriture = Math.max(0, s.resources.nourriture - 20);
    return mkEvent(s, "danger", `Une gelée tardive anéantit les bourgeons : -20 nourriture.`);
  }
  if (roll < 0.078) {
    const loss = Math.min(s.population, 2);
    s.population -= loss;
    return mkEvent(s, "danger", `Des loups rôdent la nuit dans les enclos : -${loss} âmes.`);
  }
  if (roll < 0.084) {
    s.moral = Math.min(100, s.moral + 5);
    return mkEvent(s, "joy", `Un jongleur divertit la place du marché : +5 moral.`);
  }
  if (roll < 0.09) {
    s.resources.foi = Math.max(0, s.resources.foi - 8);
    s.moral = Math.max(0, s.moral - 4);
    return mkEvent(s, "danger", `Une comète embrase le ciel nocturne : les prêtres annoncent des temps troublés (-8 foi).`);
  }
  return null;
}

export function step(s: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const y = s.year;
  const corvee = s.buffs.some((b) => b.chantierX2);

  for (const b of s.buildings) {
    if (!b.done) {
      const cat = BUILDING_CATALOG[b.type];
      b.progress = Math.min(1, b.progress + (corvee ? 2 : 1) / cat.buildMonths);
      if (b.progress >= 1) {
        b.done = true;
        events.push(mkEvent(s, "joy", `Construction achevée : ${cat.name}. Le royaume s'agrandit.`));
      }
    }
  }

  for (let i = s.projects.length - 1; i >= 0; i--) {
    const p = s.projects[i];
    if (!p.actif) {
      p.moisRestants -= 1;
      if (p.moisRestants <= 0) {
        p.actif = true;
        events.push(
          mkEvent(s, "joy", `✅ « ${p.nom} » (niveau ${p.niveau}) est opérationnel : ${p.yield > 0 ? `+${p.yield}/mois permanent` : "effet permanent"}, entretien ${p.upkeep} or/mois.`)
        );
      }
      continue;
    }
    const memeCat = s.projects.filter((q) => q.cat === p.cat && q.actif).length;
    const saturation = Math.max(0.4, 1 - 0.2 * (memeCat - 1));
    const volatilite = 0.8 + Math.random() * 0.4;
    const gain = Math.max(1, Math.round(p.yield * saturation * volatilite));
    if (p.cat === "commerce") s.resources.or = Math.min(999, s.resources.or + gain);
    else if (p.cat === "foi") s.resources.foi = Math.min(100, s.resources.foi + gain);
    else if (p.cat === "science") s.resources.science = Math.min(999, s.resources.science + gain);
    else if (p.cat === "agriculture") s.resources.nourriture = Math.min(500, s.resources.nourriture + gain);
    s.resources.or = Math.max(0, s.resources.or - p.upkeep);
    if (Math.random() < 0.005) {
      s.projects.splice(i, 1);
      events.push(mkEvent(s, "danger", `⚠️ L'actif « ${p.nom} » (niveau ${p.niveau}) est détruit : ${p.montant} 💰 investis perdus.`));
    }
  }

  const seasonIdx = Math.floor(s.month / 3);
  const foodFactor = SEASON_FOOD[seasonIdx];
  const farmBonus = s.techs.includes("assollement") ? 1.5 : 1;
  const production = Math.round((countDone(s, "ferme") * 6 + countDone(s, "moulin") * 5) * foodFactor * farmBonus);
  const consommation = Math.round(s.population * 0.5);
  s.resources.nourriture += production - consommation;

  const woodFactor = foodFactor >= 1 ? 1 : 0.7;
  s.resources.bois += Math.round(countDone(s, "cabane") * 3 * woodFactor);
  s.resources.pierre += countDone(s, "carrière") * 2;

  const strat = s.strategy;
  const marketBonus = (s.techs.includes("horlogerie") ? 1.5 : 1) * (strat === "prospérité" ? 1.5 : 1);
  const ateliers = countDone(s, "atelier");
  if (ateliers > 0 && s.resources.bois >= 2 && s.resources.pierre >= 1) {
    s.resources.bois -= 2;
    s.resources.pierre -= 1;
    s.resources.or = Math.min(999, s.resources.or + Math.round(4 * ateliers * (strat === "prospérité" ? 1.5 : 1)));
  }
  s.resources.or = Math.min(999, s.resources.or + Math.round(countDone(s, "marché") * (1 + Math.floor(s.population / 20)) * marketBonus));
  s.resources.foi = Math.min(100, s.resources.foi + countDone(s, "église") * (strat === "foi" ? 1 : 0.5));
  s.resources.or = Math.min(999, s.resources.or + countDone(s, "auberge") * (2 + Math.floor(s.moral / 30)));

  const scienceGain =
    (countDone(s, "scriptorium") * 1 + countDone(s, "bibliothèque") * 2 + countDone(s, "université") * 4 + (s.techs.includes("imprimerie") ? 2 : 0)) *
    (strat === "savoir" ? 1.5 : 1);
  s.resources.science = Math.min(999, s.resources.science + Math.round(scienceGain));

  if (s.mesures.includes("moulin")) s.resources.or = Math.min(999, s.resources.or + Math.max(1, Math.ceil(s.population / 10)));
  if (s.mesures.includes("justice")) {
    s.resources.or = Math.min(999, s.resources.or + 1);
    s.moral = Math.max(0, s.moral - 1);
  }
  if (s.mesures.includes("chasse")) {
    s.resources.bois = Math.min(999, s.resources.bois + 1);
    s.moral = Math.max(0, s.moral - 1);
  }

  for (let i = s.buffs.length - 1; i >= 0; i--) {
    s.buffs[i].moisRestants -= 1;
    if (s.buffs[i].moisRestants <= 0) {
      events.push(mkEvent(s, "info", `La mesure « ${s.buffs[i].nom} » prend fin.`));
      s.buffs.splice(i, 1);
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
    events.push(mkEvent(s, "info", `🙇 Le conseil des anciens propose au seigneur : ${texte}.`));
  }

  const cap = housingCap(s);
  if (s.resources.nourriture < 0) {
    let loss = Math.min(s.population, Math.ceil(-s.resources.nourriture / 3) + 1);
    if (s.mesures.includes("grenier")) loss = Math.max(1, Math.round(loss * 0.5));
    s.population -= loss;
    s.resources.nourriture = 0;
    s.moral = Math.max(0, s.moral - 8);
    events.push(mkEvent(s, "danger", `Famine : ${loss} âmes périssent de faim${s.mesures.includes("grenier") ? " (le grenier seigneurial a atténué le désastre)" : ""}. Le moral s'effondre.`));
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
    const deltaOr = Math.round(s.resources.or - s.orDebutAnnee);
    s.orDebutAnnee = Math.round(s.resources.or);
    events.push(
      mkEvent(s, "info", `Bilan de l'an ${s.year} : population ${s.population}, moral ${Math.round(s.moral)}, trésor ${Math.round(s.resources.or)} deniers (${deltaOr >= 0 ? "+" : ""}${deltaOr} sur l'année), savoir ${Math.round(s.resources.science)} 📖.`)
    );
  }

  s.resources.nourriture = Math.min(500, Math.max(0, s.resources.nourriture));
  s.resources.bois = Math.min(999, Math.max(0, s.resources.bois));
  s.resources.pierre = Math.min(999, Math.max(0, s.resources.pierre));

  return events;
}

// ---------- Estimations budget ----------

export function estimateIncome(s: GameState): number {
  const marketBonus = (s.techs.includes("horlogerie") ? 1.5 : 1) * (s.strategy === "prospérité" ? 1.5 : 1);
  const marches = s.buildings.filter((b) => b.done && b.type === "marché").length;
  const auberges = s.buildings.filter((b) => b.done && b.type === "auberge").length;
  const actifs = s.projects.filter((p) => p.actif && p.cat === "commerce").reduce((a, p) => a + p.yield, 0);
  const moulin = s.mesures.includes("moulin") ? Math.max(1, Math.ceil(s.population / 10)) : 0;
  const justice = s.mesures.includes("justice") ? 1 : 0;
  return Math.round(marches * (1 + Math.floor(s.population / 20)) * marketBonus) + auberges * (2 + Math.floor(s.moral / 30)) + actifs + moulin + justice;
}

export function estimateUpkeep(s: GameState): number {
  return s.projects.filter((p) => p.actif).reduce((a, p) => a + p.upkeep, 0);
}

export function estimateNet(s: GameState): number {
  return estimateIncome(s) - estimateUpkeep(s);
}
