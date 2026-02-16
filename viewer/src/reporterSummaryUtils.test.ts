import { describe, expect, test } from "vitest";
import { aggregateReporters, sortRows } from "./reporterSummaryUtils";
import type { ReporterRow, SortState } from "./reporterSummaryUtils";
import type { ExclusionsMap, QuestData } from "./types";

function makeQuestData(
  questId: string,
  questName: string,
  reports: Array<{
    id: string;
    reporter: string;
    reporterName: string;
    runcount: number;
  }>,
): QuestData {
  return {
    quest: { questId, name: questName, level: "90", ap: 40 },
    lastUpdated: "2026-01-01T00:00:00Z",
    reports: reports.map((r) => ({
      ...r,
      timestamp: "2026-01-01T00:00:00Z",
      note: "",
      items: {},
      warnings: [],
    })),
  };
}

describe("aggregateReporters", () => {
  test("空のデータでは空配列を返す", () => {
    expect(aggregateReporters([], {})).toEqual([]);
  });

  test("単一クエスト・単一報告者を集計する", () => {
    const data = [
      makeQuestData("q1", "Quest 1", [
        { id: "r1", reporter: "user1", reporterName: "User 1", runcount: 100 },
      ]),
    ];
    const rows = aggregateReporters(data, {});
    expect(rows).toHaveLength(1);
    expect(rows[0].reporter).toBe("User 1");
    expect(rows[0].xId).toBe("user1");
    expect(rows[0].reportCount).toBe(1);
    expect(rows[0].totalRuns).toBe(100);
  });

  test("同一報告者の複数報告を合算する", () => {
    const data = [
      makeQuestData("q1", "Quest 1", [
        { id: "r1", reporter: "user1", reporterName: "User 1", runcount: 100 },
        { id: "r2", reporter: "user1", reporterName: "User 1", runcount: 200 },
      ]),
    ];
    const rows = aggregateReporters(data, {});
    expect(rows).toHaveLength(1);
    expect(rows[0].reportCount).toBe(2);
    expect(rows[0].totalRuns).toBe(300);
  });

  test("複数クエストを横断して集計する", () => {
    const data = [
      makeQuestData("q1", "Quest 1", [
        { id: "r1", reporter: "user1", reporterName: "User 1", runcount: 100 },
      ]),
      makeQuestData("q2", "Quest 2", [
        { id: "r2", reporter: "user1", reporterName: "User 1", runcount: 50 },
      ]),
    ];
    const rows = aggregateReporters(data, {});
    expect(rows).toHaveLength(1);
    expect(rows[0].reportCount).toBe(2);
    expect(rows[0].totalRuns).toBe(150);
    expect(rows[0].details).toHaveLength(2);
  });

  test("除外対象の報告を除く", () => {
    const data = [
      makeQuestData("q1", "Quest 1", [
        { id: "r1", reporter: "user1", reporterName: "User 1", runcount: 100 },
        { id: "r2", reporter: "user2", reporterName: "User 2", runcount: 200 },
      ]),
    ];
    const exclusions: ExclusionsMap = {
      q1: [{ reportId: "r2", reason: "外れ値" }],
    };
    const rows = aggregateReporters(data, exclusions);
    expect(rows).toHaveLength(1);
    expect(rows[0].reporter).toBe("User 1");
  });

  test("reporterName が空なら reporter をキーにする", () => {
    const data = [
      makeQuestData("q1", "Quest 1", [
        { id: "r1", reporter: "user1", reporterName: "", runcount: 100 },
      ]),
    ];
    const rows = aggregateReporters(data, {});
    expect(rows[0].reporter).toBe("user1");
  });

  test("reporter も空なら匿名をキーにする", () => {
    const data = [
      makeQuestData("q1", "Quest 1", [{ id: "r1", reporter: "", reporterName: "", runcount: 100 }]),
    ];
    const rows = aggregateReporters(data, {});
    expect(rows[0].reporter).toBe("匿名");
  });

  test("details にクエスト名と周回数が記録される", () => {
    const data = [
      makeQuestData("q1", "初級", [
        { id: "r1", reporter: "user1", reporterName: "User 1", runcount: 50 },
      ]),
    ];
    const rows = aggregateReporters(data, {});
    expect(rows[0].details[0].questName).toBe("初級");
    expect(rows[0].details[0].runcount).toBe(50);
    expect(rows[0].details[0].reportId).toBe("r1");
  });
});

describe("sortRows", () => {
  const rows: ReporterRow[] = [
    { reporter: "A", xId: "a", reportCount: 3, totalRuns: 100, details: [] },
    { reporter: "B", xId: "b", reportCount: 1, totalRuns: 300, details: [] },
    { reporter: "C", xId: "c", reportCount: 2, totalRuns: 200, details: [] },
  ];

  test("totalRuns 昇順", () => {
    const sort: SortState = { key: "totalRuns", dir: "asc" };
    const result = sortRows(rows, sort);
    expect(result.map((r) => r.totalRuns)).toEqual([100, 200, 300]);
  });

  test("totalRuns 降順", () => {
    const sort: SortState = { key: "totalRuns", dir: "desc" };
    const result = sortRows(rows, sort);
    expect(result.map((r) => r.totalRuns)).toEqual([300, 200, 100]);
  });

  test("reportCount 昇順", () => {
    const sort: SortState = { key: "reportCount", dir: "asc" };
    const result = sortRows(rows, sort);
    expect(result.map((r) => r.reportCount)).toEqual([1, 2, 3]);
  });

  test("reportCount 降順", () => {
    const sort: SortState = { key: "reportCount", dir: "desc" };
    const result = sortRows(rows, sort);
    expect(result.map((r) => r.reportCount)).toEqual([3, 2, 1]);
  });

  test("元の配列を変更しない", () => {
    const sort: SortState = { key: "totalRuns", dir: "asc" };
    const original = rows.map((r) => r.reporter);
    sortRows(rows, sort);
    expect(rows.map((r) => r.reporter)).toEqual(original);
  });
});
