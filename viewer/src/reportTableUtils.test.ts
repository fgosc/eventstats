import { describe, expect, test } from "vitest";
import type { SortState } from "./reportTableUtils";
import { getReporterName, sortReports } from "./reportTableUtils";
import type { Report } from "./types";

function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    id: "r1",
    reporter: "user1",
    reporterName: "User 1",
    runcount: 100,
    timestamp: "2026-01-01T00:00:00Z",
    note: "",
    items: {},
    warnings: [],
    ...overrides,
  };
}

describe("getReporterName", () => {
  test("reporterName があればそれを返す", () => {
    expect(getReporterName(makeReport({ reporterName: "表示名", reporter: "id" }))).toBe("表示名");
  });

  test("reporterName が空なら reporter を返す", () => {
    expect(getReporterName(makeReport({ reporterName: "", reporter: "user_id" }))).toBe("user_id");
  });

  test("両方空なら匿名を返す", () => {
    expect(getReporterName(makeReport({ reporterName: "", reporter: "" }))).toBe("匿名");
  });
});

describe("sortReports", () => {
  const reports = [
    makeReport({
      id: "r1",
      reporterName: "Charlie",
      runcount: 50,
      timestamp: "2026-01-03T00:00:00Z",
    }),
    makeReport({
      id: "r2",
      reporterName: "Alice",
      runcount: 200,
      timestamp: "2026-01-01T00:00:00Z",
    }),
    makeReport({ id: "r3", reporterName: "Bob", runcount: 100, timestamp: "2026-01-02T00:00:00Z" }),
  ];

  test("null の場合はそのまま返す", () => {
    const result = sortReports(reports, null);
    expect(result).toBe(reports);
  });

  test("reporter 昇順", () => {
    const sort: SortState = { key: "reporter", dir: "asc" };
    const result = sortReports(reports, sort);
    expect(result.map((r) => r.reporterName)).toEqual(["Alice", "Bob", "Charlie"]);
  });

  test("reporter 降順", () => {
    const sort: SortState = { key: "reporter", dir: "desc" };
    const result = sortReports(reports, sort);
    expect(result.map((r) => r.reporterName)).toEqual(["Charlie", "Bob", "Alice"]);
  });

  test("runcount 昇順", () => {
    const sort: SortState = { key: "runcount", dir: "asc" };
    const result = sortReports(reports, sort);
    expect(result.map((r) => r.runcount)).toEqual([50, 100, 200]);
  });

  test("runcount 降順", () => {
    const sort: SortState = { key: "runcount", dir: "desc" };
    const result = sortReports(reports, sort);
    expect(result.map((r) => r.runcount)).toEqual([200, 100, 50]);
  });

  test("timestamp 昇順", () => {
    const sort: SortState = { key: "timestamp", dir: "asc" };
    const result = sortReports(reports, sort);
    expect(result.map((r) => r.id)).toEqual(["r2", "r3", "r1"]);
  });

  test("timestamp 降順", () => {
    const sort: SortState = { key: "timestamp", dir: "desc" };
    const result = sortReports(reports, sort);
    expect(result.map((r) => r.id)).toEqual(["r1", "r3", "r2"]);
  });

  test("元の配列を変更しない", () => {
    const sort: SortState = { key: "runcount", dir: "asc" };
    const original = [...reports];
    sortReports(reports, sort);
    expect(reports.map((r) => r.id)).toEqual(original.map((r) => r.id));
  });
});
