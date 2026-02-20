import type { Report, SortDir } from "./types";

export type SortKey = "reporter" | "runcount" | "timestamp";
export type SortState = { key: SortKey; dir: SortDir } | null;

/**
 * 報告者名を返す。reporterName → reporter → "匿名" の優先順で解決する。
 * reporterName は表示名、reporter は X の ID（@なし）を格納するフィールド。
 */
export function getReporterName(r: Report): string {
  return r.reporterName || r.reporter || "匿名";
}

/**
 * ソートキー・方向に従って報告リストを並び替える。
 * sort が null の場合は元の順序のまま返す。
 * @param reports 並び替え対象の報告リスト
 * @param sort ソートキーと方向、または null（ソートなし）
 */
export function sortReports(reports: Report[], sort: SortState): Report[] {
  if (!sort) return reports;
  const { key, dir } = sort;
  const sorted = [...reports].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "reporter":
        cmp = getReporterName(a).localeCompare(getReporterName(b));
        break;
      case "runcount":
        cmp = a.runcount - b.runcount;
        break;
      case "timestamp":
        cmp = a.timestamp.localeCompare(b.timestamp);
        break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
  return sorted;
}
