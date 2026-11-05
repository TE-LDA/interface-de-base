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
  | "université"
  | "auberge";

export type TechId = "assollement" | "horlogerie" | "medecine" | "remparts" | "imprimerie";

export type StrategyId =
  | "equilibre"
  | "prospérité"
  | "foi"
  | "défense"
  | "savoir"
  | "expansion";

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

export interface Decret {
  id: number;
  year: number;
  titre: string;
  texte: string;
}

export interface OrderAction {
  type: "build" | "ressources" | "decret" | "rien";
  batiment?: string;
  quantite?: number;
  devis?: OrderDevis;
  titre?: string;
  texte?: string;
  effets?: Record<string, number>;
}

export interface DemandeConseil {
  id: number;
  year: number;
  texte: string;
  titre?: string;
  corps?: string;
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
  decrets: Decret[];
  demandeConseil: DemandeConseil | null;
  strategy: StrategyId;
  techs: TechId[];
  nextEventId: number;
  running: boolean;
  speed: number;
  autoDev: boolean;
}

export interface ChronicleEntry {
  year: number;
  text: string;
  kind?: "reply" | "event";
}
