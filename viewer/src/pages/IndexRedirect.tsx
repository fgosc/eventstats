import { Navigate, useOutletContext } from "react-router-dom";
import type { LayoutContext } from "../AppLayout";
import { getLatestEvent, getHighestQuest } from "../routeUtils";

export function IndexRedirect() {
  const { events } = useOutletContext<LayoutContext>();
  const latest = getLatestEvent(events);
  if (!latest) return null;
  const quest = getHighestQuest(latest.quests);
  if (!quest) return <Navigate to={`/events/${latest.eventId}/reporters`} replace />;
  return <Navigate to={`/events/${latest.eventId}/quests/${quest.questId}`} replace />;
}
