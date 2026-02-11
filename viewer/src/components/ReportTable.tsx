import { useState } from "react";
import type { Report, Exclusion, ItemOutlierStats, ItemStats } from "../types";
import { isOutlier } from "../aggregate";

interface Props {
  reports: Report[];
  exclusions: Exclusion[];
  itemNames: string[];
  outlierStats: ItemOutlierStats[];
  stats: ItemStats[];
}

type SortKey = "reporter" | "runcount" | "timestamp";
type SortDir = "asc" | "desc";
type SortState = { key: SortKey; dir: SortDir } | null;

const RE_FGOSCCNT = /https:\/\/fgojunks\.max747\.org\/fgosccnt\/results\/\S+/;
const RE_MODIFIER = /(\((?:x|\+)\d+\))$/;

function formatNote(note: string): React.ReactNode {
  const m = RE_FGOSCCNT.exec(note);
  if (!m) return note;
  const before = note.slice(0, m.index);
  const after = note.slice(m.index + m[0].length);
  return (
    <>
      {before}
      <a href={m[0]} target="_blank" rel="noopener noreferrer">fgosccnt</a>
      {after}
    </>
  );
}

function formatItemHeader(name: string): React.ReactNode {
  const m = RE_MODIFIER.exec(name);
  if (!m) return name;
  const base = name.slice(0, m.index);
  return (
    <>
      {base}
      <br />
      {m[1]}
    </>
  );
}

function sortIndicator(sort: SortState, key: SortKey): string {
  if (sort && sort.key === key) {
    return sort.dir === "asc" ? " ▲" : " ▼";
  }
  return " △";
}

function getReporterName(r: Report): string {
  return r.reporterName || r.reporter || "匿名";
}

function sortReports(reports: Report[], sort: SortState): Report[] {
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

export function ReportTable({ reports, exclusions, itemNames, outlierStats, stats }: Props) {
  const [sort, setSort] = useState<SortState>(null);
  const excludedIds = new Set(exclusions.map((e) => e.reportId));
  const exclusionMap = new Map(exclusions.map((e) => [e.reportId, e.reason]));

  const outlierMap = new Map(outlierStats.map((s) => [s.itemName, s]));
  const statsMap = new Map(stats.map((s) => [s.itemName, s]));

  if (reports.length === 0) return <p>報告なし</p>;

  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const sorted = sortReports(reports, sort);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", whiteSpace: "nowrap" }}>
        <thead>
          <tr>
            <th style={thStyle}>状態</th>
            <th style={sort?.key === "reporter" ? thStyleSortActive : thStyleSortable} onClick={() => toggleSort("reporter")}>
              報告者{sortIndicator(sort, "reporter")}
            </th>
            <th style={sort?.key === "runcount" ? thStyleSortActive : thStyleSortable} onClick={() => toggleSort("runcount")}>
              周回数{sortIndicator(sort, "runcount")}
            </th>
            {itemNames.map((name) => (
              <th key={name} style={thStyleItem}>
                {formatItemHeader(name)}
              </th>
            ))}
            <th style={sort?.key === "timestamp" ? thStyleSortActive : thStyleSortable} onClick={() => toggleSort("timestamp")}>
              日時{sortIndicator(sort, "timestamp")}
            </th>
            <th style={thStyle}>メモ</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const excluded = excludedIds.has(r.id);
            const rowStyle: React.CSSProperties = excluded
              ? { opacity: 0.5, textDecoration: "line-through" }
              : {};

            return (
              <tr key={r.id} style={rowStyle} title={excluded ? exclusionMap.get(r.id) : undefined}>
                <td style={tdStyle}>
                  {excluded ? "除外" : "有効"}
                </td>
                <td style={tdStyleReporter} title={r.reporterName || r.reporter || "匿名"}>
                  <a href={`https://fgodrop.max747.org/reports/${r.id}`} target="_blank" rel="noopener noreferrer">
                    {r.reporterName || r.reporter || "匿名"}
                  </a>
                </td>
                <td style={tdStyleRight}>{r.runcount}</td>
                {itemNames.map((name) => {
                  const value = r.items[name];
                  const oStats = outlierMap.get(name);
                  const iStats = statsMap.get(name);
                  const zScore = !excluded && oStats && iStats
                    ? isOutlier(value, r.runcount, oStats, iStats.dropRate)
                    : null;
                  const cellStyle: React.CSSProperties = zScore != null
                    ? { ...tdStyleRight, background: "#fde8e8" }
                    : tdStyleRight;
                  return (
                    <td
                      key={name}
                      style={cellStyle}
                      title={zScore != null ? `z-score: ${zScore.toFixed(2)}` : undefined}
                    >
                      {value == null ? "-" : value}
                    </td>
                  );
                })}
                <td style={tdStyle}>
                  {new Date(r.timestamp).toLocaleString("ja-JP")}
                </td>
                <td style={{ ...tdStyle, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {formatNote(r.note)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "6px 12px",
  background: "#f5f5f5",
  textAlign: "left",
};

const thStyleSortable: React.CSSProperties = {
  ...thStyle,
  cursor: "pointer",
  userSelect: "none",
};

const thStyleSortActive: React.CSSProperties = {
  ...thStyleSortable,
  background: "#e3edf7",
};

const thStyleItem: React.CSSProperties = {
  ...thStyle,
  whiteSpace: "normal",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "6px 12px",
};

const tdStyleReporter: React.CSSProperties = {
  ...tdStyle,
  maxWidth: "15em",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const tdStyleRight: React.CSSProperties = {
  ...tdStyle,
  textAlign: "right",
};
