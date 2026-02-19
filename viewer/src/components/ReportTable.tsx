import { createExcludedIdSet, isOutlier } from "../aggregate";
import { formatTimestamp } from "../formatters";
import { useSortState } from "../hooks/useSortState";
import { sortReports } from "../reportTableUtils";
import type { SortKey } from "../reportTableUtils";
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
      <a href={m[0]} target="_blank" rel="noopener noreferrer">
        fgosccnt
      </a>
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

export function ReportTable({ reports, exclusions, itemNames, outlierStats, stats }: Props) {
  const { sort, toggleSort } = useSortState<SortKey>();
  const excludedIds = createExcludedIdSet(exclusions);
  const exclusionMap = new Map(exclusions.map((e) => [e.reportId, e.reason]));

  const outlierMap = new Map(outlierStats.map((s) => [s.itemName, s]));
  const statsMap = new Map(stats.map((s) => [s.itemName, s]));

  if (reports.length === 0) return <p>報告なし</p>;

  const sorted = sortReports(reports, sort);

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
