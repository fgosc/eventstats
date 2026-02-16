import { describe, expect, test } from "vitest";
import { aggregate, calcOutlierStats, isOutlier } from "./aggregate";
import type { Exclusion, ItemOutlierStats, Report } from "./types";

function makeReport(id: string, runcount: number, items: Record<string, number | null>): Report {
  return {
    id,
    reporter: "user1",
    reporterName: "User 1",
    runcount,
    timestamp: "2026-01-01T00:00:00Z",
    note: "",
    items,
    warnings: [],
  };
}

describe("aggregate", () => {
  test("空の報告リストでは空配列を返す", () => {
    expect(aggregate([], [])).toEqual([]);
  });

  test("単一報告のドロップ率を正しく計算する", () => {
    const reports = [makeReport("r1", 100, { 鉄杭: 80, 骨: 30 })];
    const stats = aggregate(reports, []);

    const iron = stats.find((s) => s.itemName === "鉄杭")!;
    expect(iron.totalDrops).toBe(80);
    expect(iron.totalRuns).toBe(100);
    expect(iron.dropRate).toBeCloseTo(0.8);

    const bone = stats.find((s) => s.itemName === "骨")!;
    expect(bone.totalDrops).toBe(30);
    expect(bone.totalRuns).toBe(100);
    expect(bone.dropRate).toBeCloseTo(0.3);
  });

  test("複数報告を合算する", () => {
    const reports = [makeReport("r1", 100, { 鉄杭: 80 }), makeReport("r2", 200, { 鉄杭: 150 })];
    const stats = aggregate(reports, []);
    const iron = stats.find((s) => s.itemName === "鉄杭")!;
    expect(iron.totalDrops).toBe(230);
    expect(iron.totalRuns).toBe(300);
    expect(iron.dropRate).toBeCloseTo(230 / 300);
  });

  test("除外対象の報告を除く", () => {
    const reports = [makeReport("r1", 100, { 鉄杭: 80 }), makeReport("r2", 100, { 鉄杭: 90 })];
    const exclusions: Exclusion[] = [{ reportId: "r2", reason: "外れ値" }];
    const stats = aggregate(reports, exclusions);
    const iron = stats.find((s) => s.itemName === "鉄杭")!;
    expect(iron.totalDrops).toBe(80);
    expect(iron.totalRuns).toBe(100);
  });

  test("null のアイテムはスキップする", () => {
    const reports = [
      makeReport("r1", 100, { 鉄杭: 80, 骨: null }),
      makeReport("r2", 100, { 鉄杭: 70, 骨: 40 }),
    ];
    const stats = aggregate(reports, []);
    const bone = stats.find((s) => s.itemName === "骨")!;
    expect(bone.totalDrops).toBe(40);
    expect(bone.totalRuns).toBe(100);
  });

  test("Wilson 信頼区間が妥当な範囲を返す", () => {
    const reports = [makeReport("r1", 1000, { 鉄杭: 500 })];
    const stats = aggregate(reports, []);
    const iron = stats.find((s) => s.itemName === "鉄杭")!;
    expect(iron.ciLower).toBeGreaterThan(0.46);
    expect(iron.ciLower).toBeLessThan(0.5);
    expect(iron.ciUpper).toBeGreaterThan(0.5);
    expect(iron.ciUpper).toBeLessThan(0.54);
  });

  test("ドロップ0件では CI lower/upper が0に近い", () => {
    const reports = [makeReport("r1", 100, { レア: 0 })];
    const stats = aggregate(reports, []);
    const rare = stats.find((s) => s.itemName === "レア")!;
    expect(rare.dropRate).toBe(0);
    expect(rare.ciLower).toBe(0);
    expect(rare.ciUpper).toBeLessThan(0.05);
  });
});

describe("calcOutlierStats", () => {
  test("平均と標準偏差を正しく算出する", () => {
    const reports = [
      makeReport("r1", 100, { 鉄杭: 80 }),
      makeReport("r2", 100, { 鉄杭: 60 }),
      makeReport("r3", 100, { 鉄杭: 70 }),
    ];
    const result = calcOutlierStats(reports, []);
    const iron = result.find((s) => s.itemName === "鉄杭")!;
    expect(iron.mean).toBeCloseTo(0.7);
    expect(iron.sampleCount).toBe(3);
    // stddev of [0.8, 0.6, 0.7] = sqrt(((0.1)^2 + (0.1)^2 + 0) / 3)
    expect(iron.stdDev).toBeCloseTo(Math.sqrt(2 / 300));
  });

  test("除外を反映する", () => {
    const reports = [makeReport("r1", 100, { 鉄杭: 80 }), makeReport("r2", 100, { 鉄杭: 60 })];
    const exclusions: Exclusion[] = [{ reportId: "r1", reason: "除外" }];
    const result = calcOutlierStats(reports, exclusions);
    const iron = result.find((s) => s.itemName === "鉄杭")!;
    expect(iron.sampleCount).toBe(1);
    expect(iron.mean).toBeCloseTo(0.6);
  });

  test("サンプル0件ではゼロ値を返す", () => {
    const reports = [makeReport("r1", 100, { 鉄杭: null })];
    const result = calcOutlierStats(reports, []);
    const iron = result.find((s) => s.itemName === "鉄杭")!;
    expect(iron.sampleCount).toBe(0);
    expect(iron.mean).toBe(0);
    expect(iron.stdDev).toBe(0);
  });
});

describe("isOutlier", () => {
  const baseStats: ItemOutlierStats = {
    itemName: "鉄杭",
    mean: 0.7,
    stdDev: 0.1,
    sampleCount: 10,
  };

  test("null 値は null を返す", () => {
    expect(isOutlier(null, 100, baseStats, 0.7)).toBeNull();
  });

  test("周回数が少ない場合は null を返す", () => {
    expect(isOutlier(15, 19, baseStats, 0.7)).toBeNull();
  });

  test("サンプル数が少ない場合は null を返す", () => {
    const lowSample = { ...baseStats, sampleCount: 4 };
    expect(isOutlier(100, 100, lowSample, 0.7)).toBeNull();
  });

  test("標準偏差がほぼ0の場合は null を返す", () => {
    const zeroStd = { ...baseStats, stdDev: 0 };
    expect(isOutlier(100, 100, zeroStd, 0.7)).toBeNull();
  });

  test("通常アイテムでドロップ率が低い場合は null を返す", () => {
    expect(isOutlier(100, 100, baseStats, 0.1)).toBeNull();
  });

  test("イベントアイテムはドロップ率が低くても判定する", () => {
    const eventStats: ItemOutlierStats = {
      itemName: "ぐん肥(x3)",
      mean: 0.5,
      stdDev: 0.1,
      sampleCount: 10,
    };
    // perRun = 100/100 = 1.0, zScore = (1.0 - 0.5) / 0.1 = 5.0
    const result = isOutlier(100, 100, eventStats, 0.05);
    expect(result).toBeCloseTo(5.0);
  });

  test("ポイントはドロップ率が低くても判定する", () => {
    const pointStats: ItemOutlierStats = {
      itemName: "ポイント(+600)",
      mean: 0.5,
      stdDev: 0.1,
      sampleCount: 10,
    };
    const result = isOutlier(100, 100, pointStats, 0.05);
    expect(result).toBeCloseTo(5.0);
  });

  test("QPはドロップ率が低くても判定する", () => {
    const qpStats: ItemOutlierStats = {
      itemName: "QP(+150000)",
      mean: 0.5,
      stdDev: 0.1,
      sampleCount: 10,
    };
    const result = isOutlier(100, 100, qpStats, 0.05);
    expect(result).toBeCloseTo(5.0);
  });

  test("閾値以下の zScore は null を返す", () => {
    // perRun = 75/100 = 0.75, zScore = (0.75 - 0.7) / 0.1 = 0.5
    expect(isOutlier(75, 100, baseStats, 0.7)).toBeNull();
  });

  test("閾値超過の zScore を返す（正）", () => {
    // perRun = 110/100 = 1.1, zScore = (1.1 - 0.7) / 0.1 = 4.0
    const result = isOutlier(110, 100, baseStats, 0.7);
    expect(result).toBeCloseTo(4.0);
  });

  test("閾値超過の zScore を返す（負）", () => {
    // perRun = 30/100 = 0.3, zScore = (0.3 - 0.7) / 0.1 = -4.0
    const result = isOutlier(30, 100, baseStats, 0.7);
    expect(result).toBeCloseTo(-4.0);
  });
});
