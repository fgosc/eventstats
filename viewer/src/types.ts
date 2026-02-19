export interface Quest {
  questId: string;
  name: string;
  level: string;
  ap: number;
}

export interface EventPeriod {
  start: string;
  end: string;
}

export interface EventData {
  eventId: string;
  name: string;
  period: EventPeriod;
  quests: Quest[];
  eventItems?: string[];
}

export interface EventsResponse {
  events: EventData[];
}

export interface Report {
  id: string;
  reporter: string;
  reporterName: string;
  runcount: number;
  timestamp: string;
  note: string;
  items: Record<string, number | null>;
  warnings: string[];
}

export interface QuestData {
  quest: Quest;
  lastUpdated: string;
  reports: Report[];
}

export interface Exclusion {
  reportId: string;
  reason: string;
}

export type ExclusionsMap = Record<string, Exclusion[]>;

export type SortDir = "asc" | "desc";

export interface ItemStats {
  itemName: string;
  totalDrops: number;
  totalRuns: number;
  dropRate: number;
  ciLower: number;
  ciUpper: number;
}

export interface ItemOutlierStats {
  itemName: string;
  mean: number;
  stdDev: number;
  sampleCount: number;
}
