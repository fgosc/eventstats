import { useMemo } from "react";
import { createExcludedIdSet, isOutlier } from "../aggregate";
import { formatItemHeader, formatNote, formatTimestamp } from "../formatters";
import { useSortState } from "../hooks/useSortState";
import type { SortKey } from "../reportTableUtils";
import { sortReports } from "../reportTableUtils";
import type { Exclusion, ItemOutlierStats, ItemStats, Report } from "../types";
import {
  sortIndicator,
  tdStyle,
  tdStyleRight,
  thStyle,
  thStyleSortActive,
  thStyleSortable,
} from "./tableUtils";

interface Props {
  reports: Report[];
  exclusions: Exclusion[];
  itemNames: string[];
  outlierStats: ItemOutlierStats[];
  stats: ItemStats[];
}

export function ReportTable({ reports, exclusions, itemNames, outlierStats, stats }: Props) {
  const { sort, toggleSort } = useSortState<SortKey>();
  const excludedIds = useMemo(() => createExcludedIdSet(exclusions), [exclusions]);
  const exclusionMap = useMemo(
    () => new Map(exclusions.map((e) => [e.reportId, e.reason])),
    [exclusions],
  );
  const outlierMap = useMemo(
    () => new Map(outlierStats.map((s) => [s.itemName, s])),
    [outlierStats],
  );
  const statsMap = useMemo(() => new Map(stats.map((s) => [s.itemName, s])), [stats]);
  const sorted = useMemo(() => sortReports(reports, sort), [reports, sort]);

  if (reports.length === 0) return <p>報告なし</p>;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", whiteSpace: "nowrap" }}>
        <thead>
          <tr>
            <th style={thStyle}>状態</th>
            <th
              style={sort?.key === "reporter" ? thStyleSortActive : thStyleSortable}
              onClick={() => toggleSort("reporter")}
            >
              報告者{sortIndicator(sort, "reporter")}
            </th>
            <th
              style={sort?.key === "runcount" ? thStyleSortActive : thStyleSortable}
              onClick={() => toggleSort("runcount")}
            >
              周回数{sortIndicator(sort, "runcount")}
            </th>
            {itemNames.map((name) => (
              <th key={name} style={thStyleItem}>
                {formatItemHeader(name)}
              </th>
            ))}
            <th
              style={sort?.key === "timestamp" ? thStyleSortActive : thStyleSortable}
              onClick={() => toggleSort("timestamp")}
            >
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
                <td style={tdStyle}>{excluded ? "除外" : "有効"}</td>
                <td style={tdStyleReporter} title={r.reporterName || r.reporter || "匿名"}>
                  <a
                    href={`https://fgodrop.max747.org/reports/${r.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {r.reporterName || r.reporter || "匿名"}
                  </a>
                </td>
                <td style={tdStyleRight}>{r.runcount}</td>
                {itemNames.map((name) => {
                  const value = r.items[name];
                  const oStats = outlierMap.get(name);
                  const iStats = statsMap.get(name);
                  const zScore =
                    !excluded && oStats && iStats
                      ? isOutlier(value, r.runcount, oStats, iStats.dropRate)
                      : null;
                  const cellStyle: React.CSSProperties =
                    zScore != null ? { ...tdStyleRight, background: "#fde8e8" } : tdStyleRight;
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
                <td style={tdStyle}>{formatTimestamp(r.timestamp)}</td>
                <td
                  style={{
                    ...tdStyle,
                    maxWidth: "200px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
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

const thStyleItem: React.CSSProperties = {
  ...thStyle,
  whiteSpace: "normal",
};

const tdStyleReporter: React.CSSProperties = {
  ...tdStyle,
  maxWidth: "15em",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
