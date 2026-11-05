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
  | "carrière";

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

export type EventKind = "info" | "danger" | "joy" | "petition";

export type PetitionType = "forest" | "chapel" | "feast" | "tithe";

export interface GameEvent {
  id: number;
  year: number;
  kind: EventKind;
  text: string;
  petition?: PetitionType;
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
  pendingPetition: GameEvent | null;
  nextEventId: number;
  running: boolean;
  speed: number;
  autoDev: boolean;
}

export interface ChronicleEntry {
  year: number;
  text: string;
}
