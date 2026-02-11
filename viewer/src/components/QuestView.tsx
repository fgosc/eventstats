import { useEffect, useState } from "react";
import type { QuestData, Exclusion } from "../types";
import { fetchQuestData } from "../api";
import { aggregate } from "../aggregate";
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
      <h3>
        {data.quest.name} (Lv.{data.quest.level} / AP {data.quest.ap})
      </h3>
      <p>
        更新: {new Date(data.lastUpdated).toLocaleString("ja-JP")} / 有効報告数:{" "}
        {validCount} / 合計周回数: {totalRuns}
      </p>

      <h4>集計結果</h4>
      <SummaryTable stats={stats} />

      <h4>報告一覧</h4>
      <ReportTable
        reports={data.reports}
        exclusions={exclusions}
        itemNames={sortedItemNames}
      />
    </div>
  );
}
