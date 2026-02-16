import { useEffect, useState } from "react";
import { Outlet, useNavigate, useParams, useMatch } from "react-router-dom";
import type { EventData, ExclusionsMap } from "./types";
import { fetchEvents, fetchExclusions } from "./api";
import { formatPeriod } from "./formatters";
import { getHighestQuest } from "./routeUtils";

export interface LayoutContext {
  events: EventData[];
  exclusions: ExclusionsMap;
}

export function AppLayout() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [exclusions, setExclusions] = useState<ExclusionsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { eventId, questId } = useParams<{ eventId: string; questId: string }>();
  const reportersMatch = useMatch("/events/:eventId/reporters");

  useEffect(() => {
    Promise.all([fetchEvents(), fetchExclusions()])
      .then(([eventsRes, exclusionsRes]) => {
        setEvents(eventsRes.events);
        setExclusions(exclusionsRes);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>読み込み中...</p>;
  if (error) return <p style={{ color: "red" }}>エラー: {error}</p>;
  if (events.length === 0) return <p>イベントが登録されていません。</p>;

  const selectedEvent = events.find((e) => e.eventId === eventId);
  const showReporterSummary = reportersMatch !== null;

  const handleEventChange = (newEventId: string) => {
    const ev = events.find((e) => e.eventId === newEventId);
    if (!ev) return;
    const quest = getHighestQuest(ev.quests);
    if (quest) {
      navigate(`/events/${newEventId}/quests/${quest.questId}`);
    } else {
      navigate(`/events/${newEventId}/reporters`);
    }
  };

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <h1>FGO EventStats</h1>

      <div style={{ marginBottom: "1rem" }}>
        <label>
          イベント:{" "}
          <select
            value={eventId ?? ""}
            onChange={(e) => handleEventChange(e.target.value)}
          >
            {events.map((e) => (
              <option key={e.eventId} value={e.eventId}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedEvent && (
        <div style={{ marginBottom: "1rem" }}>
          <h2 style={{ margin: "2rem 0 0.25rem" }}>{selectedEvent.name}</h2>
          <p style={{ margin: "0 0 1rem", color: "#666" }}>
            集計期間: {formatPeriod(selectedEvent.period)}
          </p>
        </div>
      )}

      {selectedEvent && selectedEvent.quests.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          {[...selectedEvent.quests]
            .sort((a, b) => Number(a.level) - Number(b.level))
            .map((q) => (
              <button
                key={q.questId}
                onClick={() => navigate(`/events/${selectedEvent.eventId}/quests/${q.questId}`)}
                style={{
                  padding: "6px 16px",
                  marginRight: "4px",
                  marginBottom: "4px",
                  background:
                    q.questId === questId && !showReporterSummary
                      ? "#1976d2"
                      : "#e0e0e0",
                  color:
                    q.questId === questId && !showReporterSummary
                      ? "#fff"
                      : "#333",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Lv.{q.level} {q.name}
              </button>
            ))}
          <button
            onClick={() => navigate(`/events/${selectedEvent.eventId}/reporters`)}
            style={{
              padding: "6px 16px",
              marginRight: "4px",
              marginBottom: "4px",
              background: showReporterSummary ? "#1976d2" : "#e0e0e0",
              color: showReporterSummary ? "#fff" : "#333",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            報告者サマリ
          </button>
        </div>
      )}

      <Outlet context={{ events, exclusions } satisfies LayoutContext} />
    </div>
  );
}
