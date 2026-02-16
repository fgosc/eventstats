import React, { useEffect, useState } from "react";
import { fetchQuestData } from "../api";
import { formatTimestamp } from "../formatters";
import { DEFAULT_SORT, aggregateReporters, sortRows } from "../reporterSummaryUtils";
import type { ReportDetail, SortKey, SortState } from "../reporterSummaryUtils";
import type { ExclusionsMap, Quest, QuestData } from "../types";
import { StatsBar } from "./StatsBar";
import {
  sortIndicator,
  tableStyle,
  tdStyle,
  tdStyleRight,
  thStyle,
  thStyleSortActive,
  thStyleSortable,
} from "./tableUtils";

interface Props {
  eventId: string;
  quests: Quest[];
  exclusions: ExclusionsMap;
}

function DetailTable({ details }: { details: ReportDetail[] }) {
  const sorted = [...details].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const itemNames = new Set<string>();
  for (const d of sorted) {
    for (const key of Object.keys(d.items)) {
      itemNames.add(key);
    }
  }
  const itemCols = [...itemNames];

  return (
    <table style={{ ...tableStyle, marginBottom: "0.5rem", fontSize: "0.85rem" }}>
      <thead>
        <tr>
          <th style={{ ...thStyleDetail, minWidth: "10em" }}>クエスト</th>
          <th style={thStyleDetail}>周回数</th>
          {itemCols.map((name) => (
            <th key={name} style={thStyleDetail}>
              {name}
            </th>
          ))}
          <th style={thStyleDetail}>日時</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((d, i) => (
          <tr key={i}>
            <td style={tdStyleDetail}>
              <a
                href={`https://fgodrop.max747.org/reports/${d.reportId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {d.questName}
              </a>
            </td>
            <td style={tdStyleDetailRight}>{d.runcount.toLocaleString()}</td>
            {itemCols.map((name) => {
              const value = d.items[name];
              return (
                <td key={name} style={tdStyleDetailRight}>
                  {value == null ? "-" : value.toLocaleString()}
                </td>
              );
            })}
            <td style={tdStyleDetail}>{formatTimestamp(d.timestamp)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ReporterSummary({ eventId, quests, exclusions }: Props) {
  const [questData, setQuestData] = useState<QuestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all(quests.map((q) => fetchQuestData(eventId, q.questId)))
      .then(setQuestData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [eventId, quests]);

  if (loading) return <p>読み込み中...</p>;
  if (error) return <p style={{ color: "red" }}>エラー: {error}</p>;

  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "desc" };
      return { key, dir: prev.dir === "desc" ? "asc" : "desc" };
    });
  };

  const rawRows = aggregateReporters(questData, exclusions);
  const rows = sortRows(rawRows, sort);
  const totalReporters = rows.length;
  const totalReports = rows.reduce((s, r) => s + r.reportCount, 0);
  const totalRuns = rows.reduce((s, r) => s + r.totalRuns, 0);

  return (
    <div>
      <h2>報告者サマリ</h2>
      <StatsBar
        items={[
          { label: "報告者数", value: totalReporters.toLocaleString() },
          { label: "総報告数", value: totalReports.toLocaleString() },
          { label: "総周回数", value: totalRuns.toLocaleString() },
        ]}
      />
      {rows.length === 0 ? (
        <p>データなし</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle} />
              <th style={thStyle}>No</th>
              <th style={thStyle}>報告者</th>
              <th style={thStyle}>X ID</th>
              <th
                style={sort.key === "reportCount" ? thStyleSortActive : thStyleSortable}
                onClick={() => toggleSort("reportCount")}
                onKeyDown={(e) => e.key === "Enter" && toggleSort("reportCount")}
              >
                報告数{sortIndicator(sort, "reportCount")}
              </th>
              <th
                style={sort.key === "totalRuns" ? thStyleSortActive : thStyleSortable}
                onClick={() => toggleSort("totalRuns")}
                onKeyDown={(e) => e.key === "Enter" && toggleSort("totalRuns")}
              >
                合計周回数{sortIndicator(sort, "totalRuns")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isExpanded = expanded.has(r.reporter);
              return (
                <React.Fragment key={r.reporter}>
                  <tr>
                    <td style={tdStyle}>
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((prev) => {
                            const next = new Set(prev);
                            if (next.has(r.reporter)) next.delete(r.reporter);
                            else next.add(r.reporter);
                            return next;
                          })
                        }
                        style={toggleBtnStyle}
                      >
                        {isExpanded ? "▼" : "▶"}
                      </button>
                    </td>
                    <td style={tdStyleRight}>{i + 1}</td>
                    <td style={tdStyle}>
                      {r.xId && r.xId !== "anonymous" ? (
                        <a
                          href={`https://fgodrop.max747.org/owners/${r.xId}/reports`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {r.reporter}
                        </a>
                      ) : (
                        r.reporter
                      )}
                    </td>
                    <td style={tdStyle}>
                      {r.xId && r.xId !== "anonymous" ? (
                        <a
                          href={`https://x.com/${r.xId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {r.xId}
                        </a>
                      ) : (
                        r.xId
                      )}
                    </td>
                    <td style={tdStyleRight}>{r.reportCount.toLocaleString()}</td>
                    <td style={tdStyleRight}>{r.totalRuns.toLocaleString()}</td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} style={detailCellStyle}>
                        <DetailTable details={r.details} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const toggleBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "0.8rem",
  padding: "0 4px",
};

const detailCellStyle: React.CSSProperties = {
  padding: "8px 12px 8px 24px",
  background: "#fafafa",
  border: "1px solid #ccc",
};

const thStyleDetail: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "4px 8px",
  background: "#eee",
  textAlign: "left",
  fontSize: "0.85rem",
};

const tdStyleDetail: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: "4px 8px",
};

const tdStyleDetailRight: React.CSSProperties = {
  ...tdStyleDetail,
  textAlign: "right",
};
