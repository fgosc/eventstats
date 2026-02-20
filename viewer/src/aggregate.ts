import { RE_EVENT_ITEM, RE_POINT, RE_QP } from "./constants";
import type { Exclusion, ItemOutlierStats, ItemStats, Report } from "./types";

const Z = 1.96; // 95% confidence

/**
 * Wilson スコア法による二項比率の 95% 信頼区間を計算する。
 * @param successes ドロップ数（成功回数）
 * @param n 試行回数（周回数）
 * @returns 信頼区間の下限・上限（0〜1）
 */
function wilsonCI(successes: number, n: number): { lower: number; upper: number } {
  if (n === 0) return { lower: 0, upper: 0 };
  const p = successes / n;
  const z2 = Z * Z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const margin = (Z / denom) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return {
    lower: Math.max(0, centre - margin),
    upper: Math.min(1, centre + margin),
  };
}

/**
 * 除外リストから reportId の Set を作成する。
 * 集計・外れ値計算の前処理として有効報告のフィルタリングに使用する。
 */
export function createExcludedIdSet(exclusions: Exclusion[]): Set<string> {
  return new Set(exclusions.map((e) => e.reportId));
}

/**
 * 有効な報告を集計し、アイテムごとのドロップ数・ドロップ率・Wilson 95% 信頼区間を計算する。
 * exclusions に含まれる報告は集計から除外される。
 * @param reports クエストの全報告リスト
 * @param exclusions 除外対象の報告リスト
 * @returns アイテムごとの集計結果（ItemStats）の配列
 */
export function aggregate(reports: Report[], exclusions: Exclusion[]): ItemStats[] {
  const excludedIds = createExcludedIdSet(exclusions);
  const validReports = reports.filter((r) => !excludedIds.has(r.id));

  const itemNames = new Set<string>();
  for (const report of validReports) {
    for (const key of Object.keys(report.items)) {
      itemNames.add(key);
    }
  }

  const stats: ItemStats[] = [];
  for (const itemName of itemNames) {
    let totalDrops = 0;
    let totalRuns = 0;

    for (const report of validReports) {
      const value = report.items[itemName];
      if (value == null) continue;
      totalDrops += value;
      totalRuns += report.runcount;
    }

    const { lower, upper } = wilsonCI(totalDrops, totalRuns);
    stats.push({
      itemName,
      totalDrops,
      totalRuns,
      dropRate: totalRuns > 0 ? totalDrops / totalRuns : 0,
      ciLower: lower,
      ciUpper: upper,
    });
  }

  return stats;
}

/**
 * アイテムが外れ値検出の常時対象かどうかを判定する。
 * イベントアイテム・ポイント・QP は低ドロップ率でも外れ値チェックを行うため、true を返す。
 */
function isAlwaysTargetItem(itemName: string): boolean {
  return RE_EVENT_ITEM.test(itemName) || RE_POINT.test(itemName) || RE_QP.test(itemName);
}

/**
 * アイテムごとに「1周あたりドロップ数」の平均・標準偏差を計算する。
 * isOutlier() による外れ値判定の基準値として使用する。
 * @param reports クエストの全報告リスト
 * @param exclusions 除外対象の報告リスト
 * @returns アイテムごとの外れ値統計（ItemOutlierStats）の配列
 */
export function calcOutlierStats(reports: Report[], exclusions: Exclusion[]): ItemOutlierStats[] {
  const excludedIds = createExcludedIdSet(exclusions);
  const validReports = reports.filter((r) => !excludedIds.has(r.id));

  const itemNames = new Set<string>();
  for (const report of validReports) {
    for (const key of Object.keys(report.items)) {
      itemNames.add(key);
    }
  }

  const result: ItemOutlierStats[] = [];
  for (const itemName of itemNames) {
    const perRun: number[] = [];
    for (const report of validReports) {
      const value = report.items[itemName];
      if (value == null) continue;
      perRun.push(value / report.runcount);
    }

    const sampleCount = perRun.length;
    if (sampleCount === 0) {
      result.push({ itemName, mean: 0, stdDev: 0, sampleCount: 0 });
      continue;
    }

    const mean = perRun.reduce((a, b) => a + b, 0) / sampleCount;
    const variance = perRun.reduce((sum, v) => sum + (v - mean) ** 2, 0) / sampleCount;
    const stdDev = Math.sqrt(variance);

    result.push({ itemName, mean, stdDev, sampleCount });
  }

  return result;
}

const OUTLIER_Z_THRESHOLD = 3.0;
const MIN_SAMPLE_COUNT = 5;
const MIN_RUNCOUNT = 20;
const MIN_DROP_RATE_FOR_NORMAL = 0.2;

/**
 * 報告の値が外れ値かどうかを z スコアで判定する。
 *
 * 以下のいずれかに該当する場合は外れ値チェックをスキップして null を返す:
 * - value が null（そのアイテムの報告が存在しない）
 * - 周回数が少ない（MIN_RUNCOUNT 未満）
 * - サンプル数が少ない（MIN_SAMPLE_COUNT 未満）
 * - 標準偏差がほぼゼロ（全報告が同一値）
 * - 通常アイテムかつドロップ率が低い（MIN_DROP_RATE_FOR_NORMAL 未満）
 *
 * @param value 報告のアイテムドロップ数
 * @param runcount 報告の周回数
 * @param outlierStats そのアイテムの全体統計（平均・標準偏差）
 * @param dropRate そのアイテムの全体ドロップ率
 * @returns 外れ値の場合は z スコア、外れ値でないまたはスキップの場合は null
 */
export function isOutlier(
  value: number | null,
  runcount: number,
  outlierStats: ItemOutlierStats,
  dropRate: number,
): number | null {
  if (value == null) return null;
  if (runcount < MIN_RUNCOUNT) return null;
  if (outlierStats.sampleCount < MIN_SAMPLE_COUNT) return null;
  if (outlierStats.stdDev < 1e-9) return null;

  if (!isAlwaysTargetItem(outlierStats.itemName) && dropRate < MIN_DROP_RATE_FOR_NORMAL) {
    return null;
  }

  const perRun = value / runcount;
  const zScore = (perRun - outlierStats.mean) / outlierStats.stdDev;

  if (Math.abs(zScore) > OUTLIER_Z_THRESHOLD) return zScore;
  return null;
}
