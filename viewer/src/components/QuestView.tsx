import { useEffect, useState } from "react";
import { aggregate, calcOutlierStats, createExcludedIdSet } from "../aggregate";
import { fetchQuestData } from "../api";
import { formatTimestamp } from "../formatters";
import type { Exclusion, QuestData } from "../types";
import { ReportTable } from "./ReportTable";
import { StatsBar } from "./StatsBar";
import { SummaryTable } from "./SummaryTable";

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
  if (!data) return <p>このクエストのデータはまだ登録されていません。</p>;

  const stats = aggregate(data.reports, exclusions);
  const outlierStats = calcOutlierStats(data.reports, exclusions);
  const excludedIds = createExcludedIdSet(exclusions);
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
      <StatsBar
        items={[
          { label: "更新", value: formatTimestamp(data.lastUpdated) },
          { label: "有効報告数", value: validCount },
          { label: "合計周回数", value: totalRuns.toLocaleString() },
        ]}
      >
        <div style={{ alignSelf: "center", fontSize: "0.75rem", color: "#999" }}>
          データは3時間ごとに更新されます
        </div>
      </StatsBar>

      <h3 style={{ marginBottom: "0.25rem" }}>集計結果</h3>
      <SummaryTable stats={stats} />

      <h3 style={{ marginBottom: "0.25rem" }}>報告一覧</h3>
      <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", color: "#666" }}>
        <span style={{ background: "#fde8e8", padding: "1px 6px", marginRight: "4px" }}>
          色付きセル
        </span>
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
