import { getReporterName } from "./reportTableUtils";
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

/**
 * 全クエストデータから報告者ごとの集計行を作成する。
 * 各クエストの除外リストに含まれる報告はスキップする。
 * 同一報告者（reporterName 優先、なければ reporter）の報告をまとめ、
 * 報告回数・合計周回数・明細リストを集計する。
 * @param allQuestData 全クエストのデータ（クエスト情報 + 報告リスト）
 * @param exclusions クエスト ID をキーとする除外リストのマップ
 * @returns 報告者ごとの集計行（ReporterRow）の配列
 */
export function aggregateReporters(
  allQuestData: QuestData[],
  exclusions: ExclusionsMap,
): ReporterRow[] {
  const map = new Map<string, ReporterRow>();

  for (const qd of allQuestData) {
    const excludedIds = new Set((exclusions[qd.quest.questId] ?? []).map((e) => e.reportId));

    for (const r of qd.reports) {
      if (excludedIds.has(r.id)) continue;

      const name = getReporterName(r);
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

/**
 * ソートキー・方向に従って報告者行を並び替える。
 * @param rows 並び替え対象の報告者行リスト
 * @param sort ソートキー（"reportCount" または "totalRuns"）と方向
 */
export function sortRows(rows: ReporterRow[], sort: SortState): ReporterRow[] {
  return [...rows].sort((a, b) => {
    const cmp = a[sort.key] - b[sort.key];
    return sort.dir === "asc" ? cmp : -cmp;
  });
}
