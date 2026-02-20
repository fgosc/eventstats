import type { EventData, Quest } from "./types";

/**
 * イベントリストから開催開始日時が最新のイベントを返す。
 * リストが空の場合は undefined を返す。
 */
export function getLatestEvent(events: EventData[]): EventData | undefined {
  return [...events].sort(
    (a, b) => new Date(b.period.start).getTime() - new Date(a.period.start).getTime(),
  )[0];
}

/**
 * クエストレベルの文字列を比較可能な数値に変換する。
 * "+" サフィックスは 0.5 を加算することで上位扱いにする。
 * 例: "90" → 90、"90+" → 90.5
 */
export function parseLevel(level: string): number {
  const base = Number.parseInt(level, 10);
  return level.endsWith("+") ? base + 0.5 : base;
}

/**
 * クエストリストからレベルが最も高いクエストを返す。
 * レベル比較には parseLevel() を使用する。
 * リストが空の場合は undefined を返す。
 */
export function getHighestQuest(quests: Quest[]): Quest | undefined {
  if (quests.length === 0) return undefined;
  const sorted = [...quests].sort((a, b) => parseLevel(a.level) - parseLevel(b.level));
  return sorted[sorted.length - 1];
}
