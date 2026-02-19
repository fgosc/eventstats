import type { ExclusionsMap, QuestData, SortDir } from "./types";

export interface ReportDetail {
  reportId: string;
  questName: string;
  runcount: number;
  items: Record<string, number | null>;
  timestamp: string;
}

export interface ReporterRow {
  reporter: string;
  xId: string;
  reportCount: number;
  totalRuns: number;
  details: ReportDetail[];
}

export type SortKey = "reportCount" | "totalRuns";
export type SortState = { key: SortKey; dir: SortDir };

export const DEFAULT_SORT: SortState = { key: "totalRuns", dir: "desc" };

export function aggregateReporters(
  allQuestData: QuestData[],
  exclusions: ExclusionsMap,
): ReporterRow[] {
  const map = new Map<string, ReporterRow>();

  for (const qd of allQuestData) {
    const excludedIds = new Set((exclusions[qd.quest.questId] ?? []).map((e) => e.reportId));

    for (const r of qd.reports) {
      if (excludedIds.has(r.id)) continue;

      const name = r.reporterName || r.reporter || "匿名";
      const entry = map.get(name) ?? {
        reporter: name,
        xId: r.reporter || "",
        reportCount: 0,
        totalRuns: 0,
        details: [],
      };
      entry.reportCount += 1;
      entry.totalRuns += r.runcount;
      entry.details.push({
        reportId: r.id,
        questName: qd.quest.name,
        runcount: r.runcount,
        items: r.items,
        timestamp: r.timestamp,
      });
      map.set(name, entry);
    }
  }

  return [...map.values()];
}

export function sortRows(rows: ReporterRow[], sort: SortState): ReporterRow[] {
  return [...rows].sort((a, b) => {
    const cmp = a[sort.key] - b[sort.key];
    return sort.dir === "asc" ? cmp : -cmp;
  });
}
