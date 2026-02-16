import type { EventData, Quest } from "./types";

export function getLatestEvent(events: EventData[]): EventData | undefined {
  return [...events].sort(
    (a, b) =>
      new Date(b.period.start).getTime() - new Date(a.period.start).getTime(),
  )[0];
}

export function getHighestQuest(quests: Quest[]): Quest | undefined {
  if (quests.length === 0) return undefined;
  const sorted = [...quests].sort(
    (a, b) => Number(a.level) - Number(b.level),
  );
  return sorted[sorted.length - 1];
}
