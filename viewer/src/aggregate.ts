import { RE_EVENT_ITEM, RE_POINT, RE_QP } from "./constants";
import type { Exclusion, ItemOutlierStats, ItemStats, Report } from "./types";

const Z = 1.96; // 95% confidence

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

export function createExcludedIdSet(exclusions: Exclusion[]): Set<string> {
  return new Set(exclusions.map((e) => e.reportId));
}

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

function isAlwaysTargetItem(itemName: string): boolean {
  return RE_EVENT_ITEM.test(itemName) || RE_POINT.test(itemName) || RE_QP.test(itemName);
}

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
