import type { Report, Exclusion, ItemStats } from "./types";

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

    stats.push({
      itemName,
      totalDrops,
      totalRuns,
      dropRate: totalRuns > 0 ? totalDrops / totalRuns : 0,
    });
  }

  return stats;
}
