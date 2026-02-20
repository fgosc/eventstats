import { useEffect, useState } from "react";
import { Navigate, useOutletContext, useParams } from "react-router-dom";
import type { LayoutContext } from "../AppLayout";
import { aggregate } from "../aggregate";
import { fetchQuestData } from "../api";
import { EventItemSummaryView, type QuestExpected } from "../components/EventItemSummaryView";
import { LoadingError } from "../components/LoadingError";
import { parseLevel } from "../routeUtils";
import { calcEventItemExpected, classifyStats } from "../summaryUtils";

export function EventItemSummaryPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { events, exclusions } = useOutletContext<LayoutContext>();

  const [questExpected, setQuestExpected] = useState<QuestExpected[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    const event = events.find((e) => e.eventId === eventId);
    if (!event) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const sortedQuests = [...event.quests].sort(
      (a, b) => parseLevel(a.level) - parseLevel(b.level),
    );

    Promise.all(
      sortedQuests.map((q) => fetchQuestData(event.eventId, q.questId, controller.signal)),
    )
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
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [eventId, events, exclusions]);

  if (!eventId) return <Navigate to="/" replace />;
  const event = events.find((e) => e.eventId === eventId);
  if (!event) return <Navigate to="/" replace />;
  if (loading || error) return <LoadingError loading={loading} error={error} />;

  return (
    <>
      <h3>イベントアイテムサマリ</h3>
      <EventItemSummaryView questExpected={questExpected} />
    </>
  );
}
