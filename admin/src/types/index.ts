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
}

export interface EventsResponse {
  events: EventData[];
}

export interface Exclusion {
  reportId: string;
  reason: string;
}
