export const KINGDOM_NAMES = [
  "Valombreuse",
  "Montcru",
  "Rocheval",
  "Aubépine",
  "Clairval",
  "Mortemer",
  "Bellecombe",
  "Fontenay",
  "Vieuxbourg",
  "Larquevent",
];

export const DYNASTY_NAMES = [
  "des Coudriers",
  "de Valombreuse",
  "de Rocheval",
  "des Hautes futaies",
  "de Montcru",
  "de la Pierre levée",
  "des Trois moulins",
  "de Clairefont",
];

export const RULER_NAMES = [
  "Ganelon",
  "Ysabeau",
  "Foulques",
  "Aliénor",
  "Raoul",
  "Berthe",
  "Guillaume",
  "Mahaut",
  "Eudes",
  "Perrine",
  "Thibault",
  "Sibylle",
];

export function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}
