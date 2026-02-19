import type { EventsResponse, ExclusionsMap, QuestData } from "./types";

const DATA_URL = import.meta.env.VITE_DATA_URL as string;

export async function fetchEvents(signal?: AbortSignal): Promise<EventsResponse> {
  const res = await fetch(`${DATA_URL}/events.json`, { signal });
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
  return res.json();
}

export async function fetchExclusions(signal?: AbortSignal): Promise<ExclusionsMap> {
  const res = await fetch(`${DATA_URL}/exclusions.json`, { signal });
  if (!res.ok) return {};
  return res.json();
}

export async function fetchQuestData(
  eventId: string,
  questId: string,
  signal?: AbortSignal,
): Promise<QuestData | null> {
  const res = await fetch(`${DATA_URL}/${eventId}/${questId}.json`, { signal });
  // S3 + CloudFront では未作成のオブジェクトに対して 403 が返るため、
  // 404 と同様に「データ未登録」として扱い、エラーではなく null を返す
  if (res.status === 403 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch quest data: ${res.status}`);
  return res.json();
}
