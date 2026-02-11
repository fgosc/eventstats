import type { EventsResponse, ExclusionsMap, QuestData } from "./types";

const DATA_URL = import.meta.env.VITE_DATA_URL as string;

export async function fetchEvents(): Promise<EventsResponse> {
  const res = await fetch(`${DATA_URL}/events.json`);
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
  return res.json();
}

export async function fetchExclusions(): Promise<ExclusionsMap> {
  const res = await fetch(`${DATA_URL}/exclusions.json`);
  if (!res.ok) return {};
  return res.json();
}

export async function fetchQuestData(
  eventId: string,
  questId: string,
): Promise<QuestData> {
  const res = await fetch(`${DATA_URL}/${eventId}/${questId}.json`);
  if (!res.ok) throw new Error(`Failed to fetch quest data: ${res.status}`);
  return res.json();
}
