import { describe, expect, it } from "vitest";
import { getHighestQuest, getLatestEvent } from "./routeUtils";
import type { EventData, Quest } from "./types";

function makeEvent(eventId: string, start: string): EventData {
  return {
    eventId,
    name: eventId,
    period: { start, end: "2099-12-31T23:59:59+09:00" },
    quests: [],
  };
}

function makeQuest(questId: string, level: string): Quest {
  return { questId, name: questId, level, ap: 40 };
}

describe("getLatestEvent", () => {
  it("空配列で undefined を返す", () => {
    expect(getLatestEvent([])).toBeUndefined();
  });

  it("単一イベントをそのまま返す", () => {
    const ev = makeEvent("a", "2026-01-01T00:00:00+09:00");
    expect(getLatestEvent([ev])).toBe(ev);
  });

  it("開始日が最も新しいイベントを返す", () => {
    const old = makeEvent("old", "2025-01-01T00:00:00+09:00");
    const mid = makeEvent("mid", "2025-06-01T00:00:00+09:00");
    const latest = makeEvent("latest", "2026-02-01T00:00:00+09:00");
    expect(getLatestEvent([mid, latest, old])).toBe(latest);
  });

  it("元の配列を変更しない", () => {
    const events = [
      makeEvent("b", "2026-02-01T00:00:00+09:00"),
      makeEvent("a", "2025-01-01T00:00:00+09:00"),
    ];
    const copy = [...events];
    getLatestEvent(events);
    expect(events).toEqual(copy);
  });
});

describe("getHighestQuest", () => {
  it("空配列で undefined を返す", () => {
    expect(getHighestQuest([])).toBeUndefined();
  });

  it("単一クエストをそのまま返す", () => {
    const q = makeQuest("q1", "90");
    expect(getHighestQuest([q])).toBe(q);
  });

  it("レベルが最も高いクエストを返す", () => {
    const low = makeQuest("low", "40");
    const mid = makeQuest("mid", "80");
    const high = makeQuest("high", "90");
    expect(getHighestQuest([mid, low, high])).toBe(high);
  });

  it("90+ は 90 より高いレベルとして扱う", () => {
    const q90 = makeQuest("q90", "90");
    const q90plus = makeQuest("q90+", "90+");
    expect(getHighestQuest([q90, q90plus])).toBe(q90plus);
  });

  it("元の配列を変更しない", () => {
    const quests = [makeQuest("b", "90"), makeQuest("a", "40")];
    const copy = [...quests];
    getHighestQuest(quests);
    expect(quests).toEqual(copy);
  });
});
