import type { Report, SortDir } from "./types";

export type SortKey = "reporter" | "runcount" | "timestamp";
export type SortState = { key: SortKey; dir: SortDir } | null;

export function getReporterName(r: Report): string {
  return r.reporterName || r.reporter || "匿名";
}

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
