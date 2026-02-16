import { Navigate, useParams, useOutletContext } from "react-router-dom";
import type { LayoutContext } from "../AppLayout";
import { QuestView } from "../components/QuestView";

export function QuestPage() {
  const { eventId, questId } = useParams<{ eventId: string; questId: string }>();
  const { events, exclusions } = useOutletContext<LayoutContext>();

  if (!eventId || !questId) return <Navigate to="/" replace />;

  const event = events.find((e) => e.eventId === eventId);
  if (!event) return <Navigate to="/" replace />;

  const quest = event.quests.find((q) => q.questId === questId);
  if (!quest) return <Navigate to="/" replace />;

  return (
    <QuestView
      eventId={eventId}
      questId={questId}
      exclusions={exclusions[questId] ?? []}
    />
  );
}
