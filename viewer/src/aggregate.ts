import type { Report, Exclusion, ItemStats } from "./types";

const Z = 1.96; // 95% confidence

function wilsonCI(
  successes: number,
  n: number,
): { lower: number; upper: number } {
  if (n === 0) return { lower: 0, upper: 0 };
  const p = successes / n;
  const z2 = Z * Z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const margin = (Z / denom) * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n));
  return {
    lower: Math.max(0, centre - margin),
    upper: Math.min(1, centre + margin),
  };
}

export function aggregate(
  reports: Report[],
  exclusions: Exclusion[],
): ItemStats[] {
  const excludedIds = new Set(exclusions.map((e) => e.reportId));
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
