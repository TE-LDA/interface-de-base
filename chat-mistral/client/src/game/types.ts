export type Season = "Printemps" | "Été" | "Automne" | "Hiver";

export type BuildingType =
  | "château"
  | "ferme"
  | "moulin"
  | "maison"
  | "église"
  | "atelier"
  | "marché"
  | "tour"
  | "cabane"
  | "carrière"
  | "scriptorium"
  | "bibliothèque"
  | "université";

export type TechId = "assollement" | "horlogerie" | "medecine" | "remparts" | "imprimerie";

export interface Building {
  type: BuildingType;
  x: number;
  y: number;
  progress: number;
  done: boolean;
}

export interface Resources {
  nourriture: number;
  bois: number;
  pierre: number;
  or: number;
  foi: number;
  science: number;
}

export type EventKind = "info" | "danger" | "joy";

export interface GameEvent {
  id: number;
  year: number;
  kind: EventKind;
  text: string;
}

export interface OrderDevis {
  bois?: number;
  pierre?: number;
  or?: number;
}

export interface OrderAction {
  type: "build" | "ressources" | "rien";
  batiment?: string;
  devis?: OrderDevis;
  effets?: Record<string, number>;
}

export interface OrderResponse {
  reponse: string;
  action?: OrderAction;
}

export interface GameState {
  kingdom: string;
  dynasty: string;
  ruler: string;
  year: number;
  month: number;
  resources: Resources;
  population: number;
  moral: number;
  buildings: Building[];
  events: GameEvent[];
  techs: TechId[];
  nextEventId: number;
  running: boolean;
  speed: number;
  autoDev: boolean;
}

export interface ChronicleEntry {
  year: number;
  text: string;
}
