import type { ItemStats } from "./types";

const RE_BOX_COUNT = /\(x(\d+)\)$/;
const RE_QP_BONUS = /^QP\(\+(\d+)\)$/;
const RE_POINT_BONUS = /^ポイント\(\+(\d+)\)$/;

export function classifyStats(stats: ItemStats[]) {
  const normal: ItemStats[] = [];
  const eventItems: ItemStats[] = [];
  const points: ItemStats[] = [];
  const qp: ItemStats[] = [];

  for (const s of stats) {
    if (RE_BOX_COUNT.test(s.itemName)) {
      eventItems.push(s);
    } else if (RE_QP_BONUS.test(s.itemName)) {
      qp.push(s);
    } else if (RE_POINT_BONUS.test(s.itemName)) {
      points.push(s);
    } else {
      normal.push(s);
    }
  }

  return { normal, eventItems, points, qp };
}

export function extractBaseName(name: string): string {
  const mBox = RE_BOX_COUNT.exec(name);
  if (mBox) return name.slice(0, mBox.index);
  if (RE_POINT_BONUS.test(name)) return "ポイント";
  if (RE_QP_BONUS.test(name)) return "QP";
  return name;
}

export function extractModifier(name: string): number {
  const mBox = RE_BOX_COUNT.exec(name);
  if (mBox) return Number.parseInt(mBox[1], 10);
  const mPoint = RE_POINT_BONUS.exec(name);
  if (mPoint) return Number.parseInt(mPoint[1], 10);
  const mQp = RE_QP_BONUS.exec(name);
  if (mQp) return Number.parseInt(mQp[1], 10);
  return 0;
}

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
  slots: number;
  base: number;
}

export function calcEventItemExpected(eventItems: ItemStats[]): EventItemExpected[] {
  const grouped = new Map<string, { slots: number; base: number; totalRuns: number }>();

  for (const s of eventItems) {
    if (s.totalRuns === 0) continue;
    const baseName = extractBaseName(s.itemName);
    const multiplier = extractModifier(s.itemName);
    const dropsPerRun = s.totalDrops / s.totalRuns;

    const entry = grouped.get(baseName) ?? { slots: 0, base: 0, totalRuns: 0 };
    entry.slots += dropsPerRun;
    entry.base += dropsPerRun * multiplier;
    // 同一 baseName のキー（例: "ミトン(x1)" と "ミトン(x3)"）は本来 totalRuns が同値のはずだが、
    // 一部の報告でいずれかのキーが未入力だと aggregate() がその報告の値を null 扱いにするため
    // totalRuns がキーごとにずれる場合がある。その際は最大値を採用する。
    entry.totalRuns = Math.max(entry.totalRuns, s.totalRuns);
    grouped.set(baseName, entry);
  }

  return [...grouped.entries()]
    .map(([baseName, { slots, base, totalRuns }]) => ({ baseName, totalRuns, slots, base }))
    .sort((a, b) => a.baseName.localeCompare(b.baseName));
}
