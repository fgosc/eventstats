import { Navigate, useOutletContext, useParams } from "react-router-dom";
import type { LayoutContext } from "../AppLayout";
import { aggregate } from "../aggregate";
import { fetchQuestData } from "../api";
import { EventItemSummaryView, type QuestExpected } from "../components/EventItemSummaryView";
import { LoadingError } from "../components/LoadingError";
import { useFetchData } from "../hooks/useFetchData";
import { parseLevel } from "../routeUtils";
import { calcEventItemExpected, classifyStats } from "../summaryUtils";

export function EventItemSummaryPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { events, exclusions } = useOutletContext<LayoutContext>();

  const {
    data: questExpected,
    loading,
    error,
  } = useFetchData(
    async (signal) => {
      if (!eventId) return [];
      const event = events.find((e) => e.eventId === eventId);
      if (!event) return [];

      const sortedQuests = [...event.quests].sort(
        (a, b) => parseLevel(a.level) - parseLevel(b.level),
      );

      const results = await Promise.all(
        sortedQuests.map((q) => fetchQuestData(event.eventId, q.questId, signal)),
      );

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
      return qe;
    },
    [eventId, events, exclusions],
    [],
  );

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
