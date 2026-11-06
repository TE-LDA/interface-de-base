export interface Meta {
  turn: number;
  year: number;
  month: string;
  dynastyName: string;
  rulerTitle: string;
}

export interface Metrics {
  treasury: number;
  monthlyIncome: number;
  monthlyUpkeep: number;
  population: number;
  foodReserve: number;
  unrest: number;
  prestige: number;
}

export type MacroId =
  | "prosperity"
  | "faith"
  | "defense"
  | "knowledge"
  | "expansion"
  | "balance";

export interface MacroOrientations {
  prosperity: number;
  faith: number;
  defense: number;
  knowledge: number;
  expansion: number;
  balance: number;
}

export type AssetStatus = "building" | "active" | "damaged";

export interface Asset {
  id: string;
  name: string;
  emoji: string;
  cat: string;
  level: 1 | 2 | 3;
  status: AssetStatus;
  remainingTicks: number;
  monthlyRevenue: number;
  monthlyUpkeep: number;
  foodYield: number;
  prestigeYield: number;
  defense: number;
  x: number;
  y: number;
}

export interface Letter {
  id: string;
  year: number;
  sujet: string;
  titre?: string;
  corps?: string;
}

export type LogKind = "info" | "danger" | "joy" | "reply";

export interface LogEntry {
  id: number;
  year: number;
  kind: LogKind;
  text: string;
}

export interface GameState {
  meta: Meta;
  metrics: Metrics;
  macro: MacroOrientations;
  assets: Asset[];
  pendingLetters: Letter[];
  chronicle: LogEntry[];
  running: boolean;
  speed: number;
  autoDev: boolean;
  nextId: number;
  foodStock: number;
}

export interface ImpactRow {
  metric: string;
  impact: number | string;
  delta: string;
}

export interface ImpactReport {
  baseline: Record<string, number>;
  enacted: Record<string, number>;
  tradeoff_summary: ImpactRow[];
}

export interface OrderContract {
  narrative_response: string;
  state_updates: {
    treasury_change: number;
    unrest_change: number;
    prestige_change: number;
    new_asset_queue?: {
      id: string;
      name: string;
      level: 1 | 2 | 3;
      construction_ticks: number;
      monthly_revenue: number;
      monthly_upkeep: number;
      cat?: string;
      emoji?: string;
    };
  };
  comparative_simulation?: ImpactReport;
}
