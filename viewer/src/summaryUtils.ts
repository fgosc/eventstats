import { RE_EVENT_ITEM, RE_POINT, RE_QP } from "./constants";
import { isKnownItem } from "./itemPriority";
import type { ItemStats } from "./types";

/**
 * アイテム統計リストを種別ごとに分類する。
 * アイテム名のパターン（RE_EVENT_ITEM / RE_POINT / RE_QP）で判定し、
 * 該当しないものは通常素材（normal）に分類する。
 * @returns `{ normal, eventItems, points, qp }` の各配列
 */
export function classifyStats(stats: ItemStats[]) {
  const normal: ItemStats[] = [];
  const eventItems: ItemStats[] = [];
  const points: ItemStats[] = [];
  const qp: ItemStats[] = [];

  for (const s of stats) {
    if (RE_EVENT_ITEM.test(s.itemName)) {
      eventItems.push(s);
    } else if (RE_QP.test(s.itemName)) {
      qp.push(s);
    } else if (RE_POINT.test(s.itemName)) {
      points.push(s);
    } else if (isKnownItem(s.itemName)) {
      normal.push(s);
    }
    // 未知アイテムは全カテゴリから除外
  }

  return { normal, eventItems, points, qp };
}

/**
 * アイテム名から修飾子部分を除いたベース名を返す。
 * - "ミトン(x3)" → "ミトン"
 * - "ポイント(+600)" → "ポイント"
 * - "QP(+150000)" → "QP"
 * - 修飾子なし → そのまま返す
 */
export function extractBaseName(name: string): string {
  const mBox = RE_EVENT_ITEM.exec(name);
  if (mBox) return name.slice(0, mBox.index);
  if (RE_POINT.test(name)) return "ポイント";
  if (RE_QP.test(name)) return "QP";
  return name;
}

/**
 * アイテム名から修飾子の数値を取り出す。
 * - "ミトン(x3)" → 3（個数）
 * - "ポイント(+600)" → 600（加算量）
 * - "QP(+150000)" → 150000（加算量）
 * - 修飾子なし → 0
 */
export function extractModifier(name: string): number {
  const mBox = RE_EVENT_ITEM.exec(name);
  if (mBox) return Number.parseInt(mBox[1], 10);
  const mPoint = RE_POINT.exec(name);
  if (mPoint) return Number.parseInt(mPoint[1], 10);
  const mQp = RE_QP.exec(name);
  if (mQp) return Number.parseInt(mQp[1], 10);
  return 0;
}

/**
 * アイテムリストをベース名の昇順、同名の場合は修飾子の数値昇順で並び替える。
 * 例: "ミトン(x1)", "ミトン(x3)", "帽子(x2)" の順になる。
 */
export function sortByBaseAndModifier(items: ItemStats[]): ItemStats[] {
  return [...items].sort((a, b) => {
    const baseA = extractBaseName(a.itemName);
    const baseB = extractBaseName(b.itemName);
    if (baseA < baseB) return -1;
    if (baseA > baseB) return 1;
    return extractModifier(a.itemName) - extractModifier(b.itemName);
  });
}

export interface EventItemExpected {
  baseName: string;
  totalRuns: number;
  totalSlots: number;
  slots: number;
  base: number;
}

/**
 * イベントアイテムの統計リストから、baseName ごとに 1周あたり枠数・期待値を集計する。
 *
 * 同一 baseName を持つ複数キー（例: "ミトン(x1)" と "ミトン(x3)"）を合算する。
 * - `slots`: 1周あたりの平均枠数（baseName 全体）
 * - `base`: 1周あたりの期待獲得数（枠数 × 個数の合計）
 * - `totalSlots`: 全報告の合計ドロップ枠数
 * - `totalRuns`: 合算に用いた最大周回数（キーごとのずれを MAX で吸収）
 *
 * @param eventItems `classifyStats()` で分類されたイベントアイテムの統計リスト
 */
export function calcEventItemExpected(eventItems: ItemStats[]): EventItemExpected[] {
  const grouped = new Map<
    string,
    { slots: number; base: number; totalRuns: number; totalSlots: number }
  >();

  for (const s of eventItems) {
    if (s.totalRuns === 0) continue;
    const baseName = extractBaseName(s.itemName);
    const multiplier = extractModifier(s.itemName);
    const slotsPerRun = s.totalDrops / s.totalRuns;

    const entry = grouped.get(baseName) ?? { slots: 0, base: 0, totalRuns: 0, totalSlots: 0 };
    entry.slots += slotsPerRun;
    entry.base += slotsPerRun * multiplier;
    entry.totalSlots += s.totalDrops;
    // 同一 baseName のキー（例: "ミトン(x1)" と "ミトン(x3)"）は本来 totalRuns が同値のはずだが、
    // 一部の報告でいずれかのキーが未入力だと aggregate() がその報告の値を null 扱いにするため
    // totalRuns がキーごとにずれる場合がある。その際は最大値を採用する。
    entry.totalRuns = Math.max(entry.totalRuns, s.totalRuns);
    grouped.set(baseName, entry);
  }

  return [...grouped.entries()]
    .map(([baseName, { slots, base, totalRuns, totalSlots }]) => ({
      baseName,
      totalRuns,
      totalSlots,
      slots,
      base,
    }))
    .sort((a, b) => a.baseName.localeCompare(b.baseName));
}
