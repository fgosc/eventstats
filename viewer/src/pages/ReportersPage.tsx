import { Navigate, useParams } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import type { LayoutContext } from "../AppLayout";
import { ReporterSummary } from "../components/ReporterSummary";

export function ReportersPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { events, exclusions } = useOutletContext<LayoutContext>();

  if (!eventId) return null;

  const event = events.find((e) => e.eventId === eventId);
  if (!event) return <Navigate to="/" replace />;

  return (
    <ReporterSummary
      eventId={event.eventId}
      quests={event.quests}
      exclusions={exclusions}
    />
  );
}
