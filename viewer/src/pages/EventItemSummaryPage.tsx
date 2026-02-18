import { useEffect, useState } from "react";
import { Navigate, useOutletContext, useParams } from "react-router-dom";
import type { LayoutContext } from "../AppLayout";
import { aggregate } from "../aggregate";
import { fetchQuestData } from "../api";
import { EventItemSummaryView, type QuestExpected } from "../components/EventItemSummaryView";
import { calcEventItemExpected, classifyStats } from "../summaryUtils";

export function EventItemSummaryPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { events, exclusions } = useOutletContext<LayoutContext>();

  const [questExpected, setQuestExpected] = useState<QuestExpected[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const event = events.find((e) => e.eventId === eventId);

  useEffect(() => {
    if (!event) return;

    setLoading(true);
    setError(null);

    Promise.all(event.quests.map((q) => fetchQuestData(event.eventId, q.questId)))
      .then((results) => {
        const qe: QuestExpected[] = [];
        for (let i = 0; i < event.quests.length; i++) {
          const data = results[i];
          if (data === null) continue;

          const quest = event.quests[i];
          const questExclusions = exclusions[quest.questId] ?? [];
          const stats = aggregate(data.reports, questExclusions);
          const { eventItems } = classifyStats(stats);
          const expected = calcEventItemExpected(eventItems);
          if (expected.length > 0) {
            qe.push({ quest, totalRuns: eventItems[0].totalRuns, data: expected });
          }
        }
        setQuestExpected(qe);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [event, exclusions]);

  if (!eventId) return null;
  if (!event) return <Navigate to="/" replace />;
  if (loading) return <p>読み込み中...</p>;
  if (error) return <p style={{ color: "red" }}>エラー: {error}</p>;

  return (
    <>
      <h3>イベントアイテムサマリ</h3>
      <EventItemSummaryView questExpected={questExpected} />
    </>
  );
}
