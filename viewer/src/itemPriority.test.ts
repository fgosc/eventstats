import { describe, expect, test } from "vitest";
import { compareByDropPriority, isKnownItem, sortItemNames } from "./itemPriority";

describe("isKnownItem", () => {
  test("item_list_priority.json に掲載されているアイテムは true を返す", () => {
    expect(isKnownItem("心臓")).toBe(true);
    expect(isKnownItem("灰")).toBe(true);
    expect(isKnownItem("鉄杭")).toBe(true);
    expect(isKnownItem("骨")).toBe(true);
    expect(isKnownItem("礼装")).toBe(true);
  });

  test("リストにないアイテムは false を返す", () => {
    expect(isKnownItem("未知のアイテム")).toBe(false);
    expect(isKnownItem("")).toBe(false);
  });

  test("イベントアイテム形式のキーはリストに含まれないので false を返す", () => {
    // item_list_priority.json には "(xN)" 形式のキーは存在しない
    expect(isKnownItem("ぐん肥(x3)")).toBe(false);
  });
});

describe("compareByDropPriority", () => {
  test("dropPriority 降順でソートされる", () => {
    // 心臓: dp=8500, 灰: dp=8108, 鉄杭: dp=8104, 骨: dp=8101
    expect(compareByDropPriority("心臓", "灰")).toBeLessThan(0);
    expect(compareByDropPriority("灰", "心臓")).toBeGreaterThan(0);
    expect(compareByDropPriority("灰", "鉄杭")).toBeLessThan(0);
    expect(compareByDropPriority("鉄杭", "骨")).toBeLessThan(0);
  });

  test("dropPriority が同じ場合は id 降順でソートされる", () => {
    // 金林檎: id=100, dp=9014 / EX2足跡: id=2109, dp=9014
    // id 降順なので EX2足跡 (2109) が前
    expect(compareByDropPriority("EX2足跡", "金林檎")).toBeLessThan(0);
    expect(compareByDropPriority("金林檎", "EX2足跡")).toBeGreaterThan(0);
  });

  test("同一アイテムは 0 を返す", () => {
    expect(compareByDropPriority("心臓", "心臓")).toBe(0);
  });

  test("未知アイテムはリスト内アイテムの後ろに配置される", () => {
    expect(compareByDropPriority("未知", "心臓")).toBeGreaterThan(0);
    expect(compareByDropPriority("心臓", "未知")).toBeLessThan(0);
  });

  test("未知アイテム同士は順序を問わない（0 を返す）", () => {
    expect(compareByDropPriority("未知A", "未知B")).toBe(0);
  });
});

describe("sortItemNames", () => {
  test("dropPriority 降順にソートされる", () => {
    const items = ["鉄杭", "心臓", "骨", "灰"];
    const sorted = sortItemNames(items);
    // 心臓(8500) > 灰(8108) > 鉄杭(8104) > 骨(8101)
    expect(sorted).toEqual(["心臓", "灰", "鉄杭", "骨"]);
  });

  test("リスト内アイテムが未知アイテムより前に並ぶ", () => {
    const items = ["未知のアイテム", "心臓", "別の未知"];
    const sorted = sortItemNames(items);
    expect(sorted[0]).toBe("心臓");
    // 未知アイテムは末尾（順序不定）
    expect(sorted.slice(1)).toContain("未知のアイテム");
    expect(sorted.slice(1)).toContain("別の未知");
  });

  test("元の配列を変更しない", () => {
    const items = ["骨", "心臓", "灰"];
    const original = [...items];
    sortItemNames(items);
    expect(items).toEqual(original);
  });

  test("空配列では空を返す", () => {
    expect(sortItemNames([])).toEqual([]);
  });
});
