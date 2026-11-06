import { DYNASTY_NAMES, RULER_NAMES, pick } from "./names";
import type { Asset, GameState, LogEntry, LogKind, MacroId } from "./types";

export const GRID_W = 8;
export const GRID_H = 6;

export const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export const ASSET_CATALOG: Record<
  string,
  { emoji: string; name: string; baseCost: number; baseTicks: number; baseRevenue: number; baseUpkeep: number; foodYield: number; prestigeYield: number; defense: number; keywords: string[]; desc: string }
> = {
  château: { emoji: "🏰", name: "Château", baseCost: 0, baseTicks: 0, baseRevenue: 0, baseUpkeep: 2, foodYield: 0, prestigeYield: 2, defense: 2, keywords: [], desc: "Cœur du domaine" },
  ferme: { emoji: "🌾", name: "Ferme", baseCost: 20, baseTicks: 4, baseRevenue: 0, baseUpkeep: 1, foodYield: 30, prestigeYield: 0, defense: 0, keywords: ["ferme", "champ", "agricole", "blé", "ble", "nourriture"], desc: "+grain chaque mois" },
  grenier: { emoji: "🫙", name: "Grenier", baseCost: 25, baseTicks: 3, baseRevenue: 0, baseUpkeep: 1, foodYield: 60, prestigeYield: 0, defense: 0, keywords: ["grenier", "réserve", "reserve", "stock"], desc: "Grosse réserve de grain (anti-famine)" },
  moulin: { emoji: "🍞", name: "Moulin", baseCost: 30, baseTicks: 5, baseRevenue: 4, baseUpkeep: 1, foodYield: 10, prestigeYield: 0, defense: 0, keywords: ["moulin", "moudre", "farine"], desc: "Revenu + grain" },
  marché: { emoji: "⚖️", name: "Marché", baseCost: 25, baseTicks: 3, baseRevenue: 8, baseUpkeep: 1, foodYield: 0, prestigeYield: 1, defense: 0, keywords: ["marché", "marche", "foire", "octroi", "commerce"], desc: "+8 💰/mois" },
  port: { emoji: "⚓", name: "Quai marchand", baseCost: 100, baseTicks: 3, baseRevenue: 15, baseUpkeep: 3, foodYield: 0, prestigeYield: 2, defense: 0, keywords: ["port", "quai", "navigation", "fleuve", "marchandises"], desc: "Gros revenus (+15 💰/mois)" },
  auberge: { emoji: "🍺", name: "Auberge", baseCost: 35, baseTicks: 4, baseRevenue: 10, baseUpkeep: 2, foodYield: 5, prestigeYield: 1, defense: 0, keywords: ["auberge", "taverne", "voyageurs", "hébergement"], desc: "+10 💰/mois, prestige" },
  maison: { emoji: "🏠", name: "Maison", baseCost: 10, baseTicks: 2, baseRevenue: 1, baseUpkeep: 0, foodYield: 0, prestigeYield: 0, defense: 0, keywords: ["maison", "habitation", "logement", "paysans"], desc: "Loge 8 âmes, +1 💰/mois" },
  tour: { emoji: "🗼", name: "Tour de guet", baseCost: 45, baseTicks: 6, baseRevenue: 0, baseUpkeep: 2, foodYield: 0, prestigeYield: 1, defense: 3, keywords: ["tour", "défense", "defense", "guet", "rempart", "milice"], desc: "+3 défense" },
  église: { emoji: "⛪", name: "Église", baseCost: 40, baseTicks: 6, baseRevenue: 0, baseUpkeep: 2, foodYield: 0, prestigeYield: 6, defense: 0, keywords: ["église", "église", "chapelle", "culte", "foi", "prêtre", "pretre"], desc: "+6 prestige, apaise (unrest −1/mois)" },
  scriptorium: { emoji: "📜", name: "Scriptorium", baseCost: 50, baseTicks: 6, baseRevenue: 2, baseUpkeep: 2, foodYield: 0, prestigeYield: 3, defense: 0, keywords: ["scriptorium", "savoir", "étude", "etude", "livres", "science", "école", "ecole"], desc: "Savoir : +prestige, +2 💰/mois" },
};

export const MACRO_LABELS: Record<MacroId, { emoji: string; name: string; desc: string }> = {
  prosperity: { emoji: "💰", name: "Prospérité", desc: "+10 % de revenus par niveau" },
  faith: { emoji: "⛪", name: "Foi", desc: "calme le peuple (unrest −0,2/niveau)" },
  defense: { emoji: "🛡️", name: "Défense", desc: "+1 défense par niveau, pertes de guerre réduites" },
  knowledge: { emoji: "📖", name: "Savoir", desc: "+prestige passif par niveau" },
  expansion: { emoji: "🌾", name: "Expansion", desc: "population croît plus vite" },
  balance: { emoji: "⚖️", name: "Équilibre", desc: "aucun bonus, aucun malus" },
};

export const COUNCIL_PROPOSALS = [
  "taxer davantage les marchés pour remplir les caisses",
  "organiser de grandes prières publiques pour apaiser le ciel",
  "lever une milice permanente pour protéger les routes",
  "fonder une école pour instruire les enfants du bourg",
  "autoriser les défrichements pour agrandir les terres labourables",
  "interdire les jeux de hasard dans les auberges",
  "subventionner les fermes pour nourrir plus de bouches",
  "réparer les remparts du château",
];

export function createGame(): GameState {
  const ruler = pick(RULER_NAMES);
  const dynasty = pick(DYNASTY_NAMES);
  const kingdom = pick(["Valombreuse", "Montcru", "Rocheval", "Aubépine", "Bellecombe", "Mortemer"]);
  return {
    meta: { turn: 0, year: 1187, month: "Janvier", dynastyName: dynasty, rulerTitle: `${ruler}, seigneur de ${kingdom}` },
    metrics: { treasury: 60, monthlyIncome: 0, monthlyUpkeep: 2, population: 40, foodReserve: 3, unrest: 20, prestige: 30 },
    macro: { prosperity: 0, faith: 0, defense: 0, knowledge: 0, expansion: 0, balance: 1 },
    assets: [
      { id: "chateau_0", name: "Château", emoji: "🏰", cat: "château", level: 1, status: "active", remainingTicks: 0, monthlyRevenue: 0, monthlyUpkeep: 2, foodYield: 0, prestigeYield: 2, defense: 2, x: 4, y: 3 },
    ],
    pendingLetters: [],
    chronicle: [],
    running: true,
    speed: 1,
    autoDev: true,
    nextId: 1,
    foodStock: 90,
  };
}

function mk(s: GameState, kind: LogKind, text: string): LogEntry {
  return { id: s.nextId++, year: s.meta.year, kind, text };
}

export function assetAt(s: GameState, x: number, y: number): Asset | undefined {
  return s.assets.find((a) => a.x === x && a.y === y);
}

export function freeTiles(s: GameState): { x: number; y: number }[] {
  const tiles: { x: number; y: number }[] = [];
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++)
      if (!assetAt(s, x, y)) tiles.push({ x, y });
  return tiles;
}

export function totalDefense(s: GameState): number {
  return (
    s.assets.filter((a) => a.status === "active").reduce((a, x) => a + x.defense, 0) +
    s.macro.defense
  );
}

export function housingCap(s: GameState): number {
  return 10 + s.assets.filter((a) => a.status === "active" && a.cat === "maison").length * 8;
}

export function levelOf(montant: number): 1 | 2 | 3 {
  return montant >= 150 ? 3 : montant >= 50 ? 2 : 1;
}

function randomEvent(s: GameState): LogEntry | null {
  const roll = Math.random();
  const m = s.metrics;
  if (roll < 0.008) {
    const newRuler = pick(RULER_NAMES);
    let dynasty = s.meta.dynastyName;
    let text = `${s.meta.rulerTitle} rend l'âme. ${newRuler} monte sur le trône.`;
    if (Math.random() < 0.3) {
      dynasty = pick(DYNASTY_NAMES);
      text += ` La maison ${dynasty} s'empare du pouvoir : l'histoire bascule.`;
    }
    s.meta.rulerTitle = `${newRuler}, seigneur`;
    s.meta.dynastyName = dynasty;
    return mk(s, "joy", text);
  }
  if (roll < 0.02) {
    const loss = Math.max(1, Math.min(m.population, 4 + Math.floor(Math.random() * 8)));
    m.population -= loss;
    m.unrest = Math.min(100, m.unrest + 10);
    return mk(s, "danger", `La peste fauche ${loss} âmes. L'inquiétude grandit (+10).`);
  }
  if (roll < 0.032) {
    const atk = 10 + Math.floor(Math.random() * 20);
    const def = totalDefense(s);
    const loss = Math.max(0, atk - def * 3);
    m.treasury = Math.max(0, m.treasury - loss);
    return mk(s, "danger", `Des routiers pillent les convois : -${loss} 💰${def > 0 ? ", la défense a atténué le désastre" : ""}.`);
  }
  if (roll < 0.042) {
    s.foodStock += 50;
    return mk(s, "joy", `Récolte abondante : +50 de grain en réserve.`);
  }
  if (roll < 0.052) {
    m.prestige = Math.min(100, m.prestige + 8);
    m.unrest = Math.max(0, m.unrest - 4);
    return mk(s, "joy", `Un pèlerinage traverse le domaine : +8 prestige, le peuple est apaisé.`);
  }
  if (roll < 0.06) {
    const gain = 8 + Math.floor(Math.random() * 15);
    m.treasury += gain;
    return mk(s, "joy", `Les marchands prospèrent : +${gain} 💰.`);
  }
  if (roll < 0.066) {
    const idx = s.assets.findIndex((a) => a.status === "active" && a.cat !== "château");
    if (idx >= 0) {
      const a = s.assets[idx];
      a.status = "damaged";
      return mk(s, "danger", `Un incendie endommage : ${a.emoji} ${a.name} (à réparer).`);
    }
    return null;
  }
  if (roll < 0.072 && s.meta.month === "Janvier" || (roll < 0.072 && s.meta.month === "Décembre")) {
    s.foodStock = Math.max(0, s.foodStock - 30);
    return mk(s, "danger", `Une gelée anéantit les bourgeons : -30 de grain.`);
  }
  if (roll < 0.078) {
    const loss = Math.min(m.population, 2);
    m.population -= loss;
    return mk(s, "danger", `Des loups rôdent la nuit : -${loss} âmes.`);
  }
  if (roll < 0.084) {
    m.unrest = Math.max(0, m.unrest - 5);
    return mk(s, "joy", `Un jongleur divertit la place : l'inquiétude baisse (-5).`);
  }
  if (roll < 0.09) {
    m.unrest = Math.min(100, m.unrest + 5);
    m.prestige = Math.max(0, m.prestige - 4);
    return mk(s, "danger", `Une comète embrase le ciel : les prêtres annoncent des temps troublés.`);
  }
  return null;
}

function autoDevelop(s: GameState): LogEntry | null {
  if (!s.autoDev || Math.random() > 0.25) return null;
  const needFood = s.metrics.foodReserve < 2;
  const nearCap = s.metrics.population >= housingCap(s) - 4;
  const keys = needFood ? ["ferme", "grenier", "ferme"] : nearCap ? ["maison", "maison"] : ["ferme", "maison", "marché", "moulin", "tour", "auberge"];
  const cat = pick(keys);
  const c = ASSET_CATALOG[cat];
  if (s.metrics.treasury < c.baseCost) return null;
  const tiles = freeTiles(s);
  if (tiles.length === 0) return null;
  const t = pick(tiles);
  s.metrics.treasury -= c.baseCost;
  s.assets.push({
    id: `asset_${s.nextId++}`,
    name: c.name,
    emoji: c.emoji,
    cat,
    level: 1,
    status: "building",
    remainingTicks: c.baseTicks,
    monthlyRevenue: c.baseRevenue,
    monthlyUpkeep: c.baseUpkeep,
    foodYield: c.foodYield,
    prestigeYield: c.prestigeYield,
    defense: c.defense,
    x: t.x,
    y: t.y,
  });
  return mk(s, "info", `Les villageois élèvent : ${c.emoji} ${c.name.toLowerCase()} (-${c.baseCost} 💰).`);
}

export function step(s: GameState): LogEntry[] {
  const events: LogEntry[] = [];
  const m = s.metrics;
  s.meta.turn += 1;

  let income = 0;
  let upkeep = 0;
  let foodYield = 0;
  let prestigeYield = 0;
  for (const a of s.assets) {
    if (a.status === "building") {
      a.remainingTicks -= 1;
      if (a.remainingTicks <= 0) {
        a.status = "active";
        events.push(mk(s, "joy", `✅ ${a.emoji} « ${a.name} » (N${a.level}) est opérationnel : +${a.monthlyRevenue} 💰/mois, entretien ${a.monthlyUpkeep} 💰/mois.`));
      }
      continue;
    }
    if (a.status === "active") {
      income += a.monthlyRevenue;
      upkeep += a.monthlyUpkeep;
      foodYield += a.foodYield * a.level;
      prestigeYield += a.prestigeYield * a.level;
    }
  }
  if (s.macro.prosperity > 0) income += Math.round(income * 0.1 * s.macro.prosperity);
  m.treasury = Math.max(0, Math.round(m.treasury + income - upkeep));
  m.monthlyIncome = income;
  m.monthlyUpkeep = upkeep;

  const consumption = Math.max(1, Math.round(m.population * 0.5));
  s.foodStock += foodYield - consumption;
  if (s.foodStock < 0) {
    const loss = Math.min(m.population, Math.ceil(-s.foodStock / 20) + 1);
    m.population -= loss;
    s.foodStock = 0;
    m.unrest = Math.min(100, m.unrest + 10);
    events.push(mk(s, "danger", `Famine : ${loss} âmes périssent de faim. Révolte gronde (+10 inquiétude).`));
  }
  m.foodReserve = Math.floor(s.foodStock / consumption);

  const cap = housingCap(s);
  const growthBonus = 1 + 0.2 * s.macro.expansion;
  if (m.foodReserve >= 2 && m.population < cap) {
    m.population += Math.min(Math.round(2 * growthBonus), cap - m.population);
  }

  m.prestige = Math.max(0, Math.min(100, m.prestige + prestigeYield + 0.2 * s.macro.knowledge));
  m.unrest = Math.max(0, Math.min(100, m.unrest - 1 - 0.2 * s.macro.faith + (s.assets.some((a) => a.status === "active" && a.cat === "église") ? 1 : 0)));

  if (m.unrest > 80 && Math.random() < 0.3) {
    m.population = Math.max(0, m.population - 5);
    m.treasury = Math.max(0, m.treasury - 20);
    m.unrest = 50;
    events.push(mk(s, "danger", `Révolte paysanne ! -5 âmes, -20 💰 de dégâts. Le seigneur doit calmer le peuple.`));
  }

  const auto = autoDevelop(s);
  if (auto) events.push(auto);

  if (s.pendingLetters.length < 2 && Math.random() < 0.08) {
    const sujet = pick(COUNCIL_PROPOSALS);
    const letter = { id: `lettre_${s.nextId++}`, year: s.meta.year, sujet };
    s.pendingLetters.push(letter);
    events.push(mk(s, "info", `🙇 Le conseil des anciens propose : ${sujet} (courrier ✉️).`));
  }

  if (Math.random() < 0.09) {
    const ev = randomEvent(s);
    if (ev) events.push(ev);
  }

  const monthIdx = (MONTHS.indexOf(s.meta.month) + 1) % 12;
  s.meta.month = MONTHS[monthIdx];
  if (monthIdx === 0) {
    s.meta.year += 1;
    events.push(mk(s, "info", `Bilan de l'an ${s.meta.year} : trésorerie ${m.treasury} 💰 (${income - upkeep >= 0 ? "+" : ""}${income - upkeep}/mois), population ${m.population}, réserve de grain ${m.foodReserve} mois, inquiétude ${Math.round(m.unrest)} %, prestige ${Math.round(m.prestige)}.`));
  }

  return events;
}
