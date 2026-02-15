import { describe, test, expect } from "vitest";
import {
  classifyStats,
  extractBaseName,
  extractModifier,
  sortByBaseAndModifier,
  calcEventItemExpected,
} from "./summaryUtils";
import type { ItemStats } from "./types";

function makeStats(itemName: string, totalDrops = 100, totalRuns = 100): ItemStats {
  return {
    itemName,
    totalDrops,
    totalRuns,
    dropRate: totalRuns > 0 ? totalDrops / totalRuns : 0,
    ciLower: 0,
    ciUpper: 0,
  };
}

describe("classifyStats", () => {
  test("通常アイテムを normal に分類する", () => {
    const { normal, eventItems, points, qp } = classifyStats([makeStats("鉄杭")]);
    expect(normal).toHaveLength(1);
    expect(eventItems).toHaveLength(0);
    expect(points).toHaveLength(0);
    expect(qp).toHaveLength(0);
  });

  test("イベントアイテムを eventItems に分類する", () => {
    const { normal, eventItems } = classifyStats([makeStats("ぐん肥(x3)")]);
    expect(normal).toHaveLength(0);
    expect(eventItems).toHaveLength(1);
  });

  test("ポイントを points に分類する", () => {
    const { points } = classifyStats([makeStats("ポイント(+600)")]);
    expect(points).toHaveLength(1);
  });

  test("QP を qp に分類する", () => {
    const { qp } = classifyStats([makeStats("QP(+150000)")]);
    expect(qp).toHaveLength(1);
  });

  test("混合入力を正しく分類する", () => {
    const stats = [
      makeStats("鉄杭"),
      makeStats("骨"),
      makeStats("ぐん肥(x1)"),
      makeStats("ぐん肥(x3)"),
      makeStats("ポイント(+600)"),
      makeStats("QP(+150000)"),
    ];
    const { normal, eventItems, points, qp } = classifyStats(stats);
    expect(normal).toHaveLength(2);
    expect(eventItems).toHaveLength(2);
    expect(points).toHaveLength(1);
    expect(qp).toHaveLength(1);
  });
});

describe("extractBaseName", () => {
  test("イベントアイテムからベース名を抽出する", () => {
    expect(extractBaseName("ぐん肥(x3)")).toBe("ぐん肥");
    expect(extractBaseName("極光(x1)")).toBe("極光");
  });

  test("ポイントのベース名", () => {
    expect(extractBaseName("ポイント(+600)")).toBe("ポイント");
  });

  test("QPのベース名", () => {
    expect(extractBaseName("QP(+150000)")).toBe("QP");
  });

  test("通常アイテムはそのまま返す", () => {
    expect(extractBaseName("鉄杭")).toBe("鉄杭");
  });
});

describe("extractModifier", () => {
  test("イベントアイテムの倍率を返す", () => {
    expect(extractModifier("ぐん肥(x3)")).toBe(3);
    expect(extractModifier("極光(x1)")).toBe(1);
  });

  test("ポイントのボーナス値を返す", () => {
    expect(extractModifier("ポイント(+600)")).toBe(600);
  });

  test("QPのボーナス値を返す", () => {
    expect(extractModifier("QP(+150000)")).toBe(150000);
  });

  test("通常アイテムは0を返す", () => {
    expect(extractModifier("鉄杭")).toBe(0);
  });
});

describe("sortByBaseAndModifier", () => {
  test("同一ベース名を modifier 昇順でソートする", () => {
    const items = [
      makeStats("ぐん肥(x3)"),
      makeStats("ぐん肥(x1)"),
      makeStats("ぐん肥(x2)"),
    ];
    const sorted = sortByBaseAndModifier(items);
    expect(sorted.map((s) => s.itemName)).toEqual([
      "ぐん肥(x1)",
      "ぐん肥(x2)",
      "ぐん肥(x3)",
    ]);
  });

  test("異なるベース名をベース名順でソートする", () => {
    const items = [
      makeStats("極光(x1)"),
      makeStats("ぐん肥(x1)"),
    ];
    const sorted = sortByBaseAndModifier(items);
    expect(sorted[0].itemName).toBe("ぐん肥(x1)");
    expect(sorted[1].itemName).toBe("極光(x1)");
  });

  test("元の配列を変更しない", () => {
    const items = [makeStats("ぐん肥(x3)"), makeStats("ぐん肥(x1)")];
    const original = [...items];
    sortByBaseAndModifier(items);
    expect(items.map((s) => s.itemName)).toEqual(original.map((s) => s.itemName));
  });
});

describe("calcEventItemExpected", () => {
  test("単一アイテムの期待値を計算する", () => {
    const items = [
      makeStats("ぐん肥(x1)", 200, 100),
      makeStats("ぐん肥(x3)", 100, 100),
    ];
    const result = calcEventItemExpected(items);
    expect(result).toHaveLength(1);
    expect(result[0].baseName).toBe("ぐん肥");
    // slots = 2.0 + 1.0 = 3.0
    expect(result[0].slots).toBeCloseTo(3.0);
    // base = 2.0 * 1 + 1.0 * 3 = 5.0
    expect(result[0].base).toBeCloseTo(5.0);
  });

  test("複数アイテムを別々にグループ化する", () => {
    const items = [
      makeStats("ぐん肥(x1)", 100, 100),
      makeStats("極光(x2)", 50, 100),
    ];
    const result = calcEventItemExpected(items);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.baseName)).toEqual(["ぐん肥", "極光"]);
  });

  test("totalRuns=0 のアイテムをスキップする", () => {
    const items = [makeStats("ぐん肥(x1)", 0, 0)];
    const result = calcEventItemExpected(items);
    expect(result).toHaveLength(0);
  });

  test("空配列では空を返す", () => {
    expect(calcEventItemExpected([])).toEqual([]);
  });
});
