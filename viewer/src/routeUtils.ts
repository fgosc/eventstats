import type { EventData, Quest } from "./types";

export function getLatestEvent(events: EventData[]): EventData | undefined {
  return [...events].sort(
    (a, b) => new Date(b.period.start).getTime() - new Date(a.period.start).getTime(),
  )[0];
}

export function parseLevel(level: string): number {
  const base = Number.parseInt(level, 10);
  return level.endsWith("+") ? base + 0.5 : base;
}

export function getHighestQuest(quests: Quest[]): Quest | undefined {
  if (quests.length === 0) return undefined;
  const sorted = [...quests].sort((a, b) => parseLevel(a.level) - parseLevel(b.level));
  return sorted[sorted.length - 1];
}
