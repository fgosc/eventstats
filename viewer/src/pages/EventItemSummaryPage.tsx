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

    const sortedQuests = [...event.quests].sort((a, b) => Number(a.level) - Number(b.level));

    Promise.all(sortedQuests.map((q) => fetchQuestData(event.eventId, q.questId)))
      .then((results) => {
        const qe: QuestExpected[] = [];
        for (let i = 0; i < sortedQuests.length; i++) {
          const data = results[i];
          if (data === null) continue;

          const quest = sortedQuests[i];
          const questExclusions = exclusions[quest.questId] ?? [];
          const stats = aggregate(data.reports, questExclusions);
          const { eventItems } = classifyStats(stats);
          const expected = calcEventItemExpected(eventItems);
          if (expected.length > 0) {
            qe.push({ quest, data: expected });
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
