import { Navigate, useParams, useOutletContext } from "react-router-dom";
import type { LayoutContext } from "../AppLayout";
import { getHighestQuest } from "../routeUtils";

export function EventRedirect() {
  const { eventId } = useParams<{ eventId: string }>();
  const { events } = useOutletContext<LayoutContext>();
  const event = events.find((e) => e.eventId === eventId);
  if (!event) return <Navigate to="/" replace />;
  const quest = getHighestQuest(event.quests);
  if (!quest) return <Navigate to={`/events/${event.eventId}/reporters`} replace />;
  return <Navigate to={`/events/${event.eventId}/quests/${quest.questId}`} replace />;
}
