import { useEffect, useState } from "react";
import type { Quest, QuestData, ExclusionsMap, Report } from "../types";
import { fetchQuestData } from "../api";

interface Props {
  eventId: string;
  quests: Quest[];
  exclusions: ExclusionsMap;
}

interface ReporterRow {
  reporter: string;
  xId: string;
  reportCount: number;
  totalRuns: number;
  sampleCount: number;
}

const RE_BOX_COUNT = /\(x\d+\)$/;
const RE_POINT_BONUS = /^ポイント\(\+\d+\)$/;
const RE_QP_BONUS = /^QP\(\+\d+\)$/;

function countSamples(report: Report): number {
  let count = 0;
  for (const [key, value] of Object.entries(report.items)) {
    if (value == null) continue;
    if (RE_BOX_COUNT.test(key) || RE_POINT_BONUS.test(key) || RE_QP_BONUS.test(key)) {
      // イベントアイテム・ポイント・QP は枠数（値そのまま）
      count += value;
    } else {
      // 素材ドロップ数
      count += value;
    }
  }
  return count;
}

function aggregateReporters(
  allQuestData: QuestData[],
  exclusions: ExclusionsMap,
): ReporterRow[] {
  const map = new Map<string, ReporterRow>();

  for (const qd of allQuestData) {
    const excludedIds = new Set(
      (exclusions[qd.quest.questId] ?? []).map((e) => e.reportId),
    );

    for (const r of qd.reports) {
      if (excludedIds.has(r.id)) continue;

      const name = r.reporterName || r.reporter || "匿名";
      const entry = map.get(name) ?? {
        reporter: name,
        xId: r.reporter || "",
        reportCount: 0,
        totalRuns: 0,
        sampleCount: 0,
      };
      entry.reportCount += 1;
      entry.totalRuns += r.runcount;
      entry.sampleCount += countSamples(r);
      map.set(name, entry);
    }
  }

  return [...map.values()];
}

type SortKey = "reportCount" | "totalRuns" | "sampleCount";
type SortDir = "asc" | "desc";
type SortState = { key: SortKey; dir: SortDir };

const DEFAULT_SORT: SortState = { key: "sampleCount", dir: "desc" };

function sortIndicator(sort: SortState, key: SortKey): string {
  if (sort.key !== key) return "";
  return sort.dir === "asc" ? " ▲" : " ▼";
}

function sortRows(rows: ReporterRow[], sort: SortState): ReporterRow[] {
  return [...rows].sort((a, b) => {
    const cmp = a[sort.key] - b[sort.key];
    return sort.dir === "asc" ? cmp : -cmp;
  });
}

export function ReporterSummary({ eventId, quests, exclusions }: Props) {
  const [questData, setQuestData] = useState<QuestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all(quests.map((q) => fetchQuestData(eventId, q.questId)))
      .then(setQuestData)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      )
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
      <div style={statsBarStyle}>
        <div style={statsCardStyle}>
          <div style={statsLabelStyle}>報告者数</div>
          <div style={statsValueStyle}>{totalReporters.toLocaleString()}</div>
        </div>
        <div style={statsCardStyle}>
          <div style={statsLabelStyle}>総報告数</div>
          <div style={statsValueStyle}>{totalReports.toLocaleString()}</div>
        </div>
        <div style={statsCardStyle}>
          <div style={statsLabelStyle}>総周回数</div>
          <div style={statsValueStyle}>{totalRuns.toLocaleString()}</div>
        </div>
      </div>
      {rows.length === 0 ? (
        <p>データなし</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>No</th>
              <th style={thStyle}>報告者</th>
              <th style={thStyle}>X ID</th>
              <th style={thStyleSortable} onClick={() => toggleSort("reportCount")}>
                報告数{sortIndicator(sort, "reportCount")}
              </th>
              <th style={thStyleSortable} onClick={() => toggleSort("totalRuns")}>
                合計周回数{sortIndicator(sort, "totalRuns")}
              </th>
              <th style={thStyleSortable} onClick={() => toggleSort("sampleCount")}>
                サンプル数{sortIndicator(sort, "sampleCount")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.reporter}>
                <td style={tdStyleRight}>{i + 1}</td>
                <td style={tdStyle}>
                  {r.xId && r.xId !== "anonymous" ? (
                    <a href={`https://fgodrop.max747.org/owners/${r.xId}/reports`} target="_blank" rel="noopener noreferrer">
                      {r.reporter}
                    </a>
                  ) : r.reporter}
                </td>
                <td style={tdStyle}>
                  {r.xId && r.xId !== "anonymous" ? (
                    <a href={`https://x.com/${r.xId}`} target="_blank" rel="noopener noreferrer">
                      {r.xId}
                    </a>
                  ) : r.xId}
                </td>
                <td style={tdStyleRight}>{r.reportCount.toLocaleString()}</td>
                <td style={tdStyleRight}>{r.totalRuns.toLocaleString()}</td>
                <td style={tdStyleRight}>{r.sampleCount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const statsBarStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  marginBottom: "1.5rem",
  flexWrap: "wrap",
};

const statsCardStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  borderRadius: "6px",
  padding: "8px 16px",
  background: "#f9f9f9",
};

const statsLabelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#666",
  marginBottom: "2px",
};

const statsValueStyle: React.CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: "bold",
};

const tableStyle: React.CSSProperties = {
  borderCollapse: "collapse",
  marginBottom: "2rem",
};

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

const tdStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "6px 12px",
};

const tdStyleRight: React.CSSProperties = {
  ...tdStyle,
  textAlign: "right",
};
