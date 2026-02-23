import itemListPriority from "./data/item_list_priority.json";

interface PriorityEntry {
  id: number;
  rarity: number;
  shortname: string;
  dropPriority: number;
}

const entries = itemListPriority as PriorityEntry[];

const priorityMap = new Map<string, { id: number; dropPriority: number }>(
  entries.map((e) => [e.shortname, { id: e.id, dropPriority: e.dropPriority }]),
);

/** item_list_priority.json に掲載されているアイテム名のセット */
export const knownItemNames: Set<string> = new Set(entries.map((e) => e.shortname));

/** アイテム名が item_list_priority.json に掲載されているか判定する */
export function isKnownItem(itemName: string): boolean {
  return knownItemNames.has(itemName);
}

/**
 * dropPriority 降順 → id 降順のコンパレータ。
 * リストにないアイテムはリスト内アイテムの後ろに配置する。
 */
export function compareByDropPriority(a: string, b: string): number {
  const pa = priorityMap.get(a);
  const pb = priorityMap.get(b);

  if (!pa && !pb) return 0;
  if (!pb) return -1;
  if (!pa) return 1;

  if (pb.dropPriority !== pa.dropPriority) {
    return pb.dropPriority - pa.dropPriority;
  }
  return pb.id - pa.id;
}

/**
 * アイテム名配列を dropPriority 降順でソートして返す。
 * リスト内アイテム → リスト外アイテム（順不同）の順になる。
 */
export function sortItemNames(itemNames: string[]): string[] {
  return [...itemNames].sort(compareByDropPriority);
}
