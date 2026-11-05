export type Season = "Printemps" | "Été" | "Automne" | "Hiver";

export type BuildingType =
  | "château"
  | "ferme"
  | "moulin"
  | "maison"
  | "église"
  | "atelier"
  | "marché"
  | "tour";

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
}

export type EventKind = "info" | "danger" | "joy";

export interface GameEvent {
  id: number;
  year: number;
  kind: EventKind;
  text: string;
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
  nextEventId: number;
  running: boolean;
  speed: number;
}

export interface ChronicleEntry {
  year: number;
  text: string;
}
