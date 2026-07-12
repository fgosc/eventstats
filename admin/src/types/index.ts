export interface Quest {
  questId: string;
  name: string;
  level: string;
  ap: number;
  additionalSourceQuestIds?: string[];
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
  eventItems: string[];
}

export interface EventsResponse {
  events: EventData[];
}

export interface Exclusion {
  reportId: string;
  reason: string;
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

export interface HarvestQuest {
  id: string;
  name: string;
  is_freequest: boolean;
  chapter: string;
  place: string;
  since: string;
  latest: string;
  count: number;
}
