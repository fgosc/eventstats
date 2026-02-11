import { useEffect, useState } from "react";
import type { QuestData, Exclusion } from "../types";
import { fetchQuestData } from "../api";
import { aggregate, calcOutlierStats } from "../aggregate";
import { SummaryTable } from "./SummaryTable";
import { ReportTable } from "./ReportTable";

interface Props {
  eventId: string;
  questId: string;
  exclusions: Exclusion[];
}

export function QuestView({ eventId, questId, exclusions }: Props) {
  const [data, setData] = useState<QuestData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchQuestData(eventId, questId)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [eventId, questId]);

  if (loading) return <p>読み込み中...</p>;
  if (error) return <p style={{ color: "red" }}>エラー: {error}</p>;
  if (!data) return null;

  const stats = aggregate(data.reports, exclusions);
  const outlierStats = calcOutlierStats(data.reports, exclusions);
  const excludedIds = new Set(exclusions.map((e) => e.reportId));
  const totalRuns = data.reports
    .filter((r) => !excludedIds.has(r.id))
    .reduce((sum, r) => sum + r.runcount, 0);
  const validCount = data.reports.filter((r) => !excludedIds.has(r.id)).length;

  const itemNames = new Set<string>();
  for (const report of data.reports) {
    for (const key of Object.keys(report.items)) {
      itemNames.add(key);
    }
  }
  const sortedItemNames = [...itemNames];

  return (
    <div>
      <h2>
        {data.quest.name} (Lv.{data.quest.level} / AP {data.quest.ap})
      </h2>
      <div style={statsBarStyle}>
        <div style={statsCardStyle}>
          <div style={statsLabelStyle}>更新</div>
          <div style={statsValueStyle}>
            {new Date(data.lastUpdated).toLocaleString("ja-JP")}
          </div>
        </div>
        <div style={statsCardStyle}>
          <div style={statsLabelStyle}>有効報告数</div>
          <div style={statsValueStyle}>{validCount}</div>
        </div>
        <div style={statsCardStyle}>
          <div style={statsLabelStyle}>合計周回数</div>
          <div style={statsValueStyle}>{totalRuns.toLocaleString()}</div>
        </div>
        <div style={{ alignSelf: "center", fontSize: "0.75rem", color: "#999" }}>
          データは2時間ごとに更新されます
        </div>
      </div>

      <h3 style={{ marginBottom: "0.25rem" }}>集計結果</h3>
      <SummaryTable stats={stats} />

      <h3 style={{ marginBottom: "0.25rem" }}>報告一覧</h3>
      <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", color: "#666" }}>
        <span style={{ background: "#fde8e8", padding: "1px 6px", marginRight: "4px" }}>色付きセル</span>
        統計的に外れ値の可能性があるドロップ数（ホバーで z-score 表示）
      </p>
      <ReportTable
        reports={data.reports}
        exclusions={exclusions}
        itemNames={sortedItemNames}
        outlierStats={outlierStats}
        stats={stats}
      />
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
