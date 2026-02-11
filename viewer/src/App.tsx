import { useEffect, useState } from "react";
import type { EventData, ExclusionsMap } from "./types";
import { fetchEvents, fetchExclusions } from "./api";
import { QuestView } from "./components/QuestView";

export function App() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [exclusions, setExclusions] = useState<ExclusionsMap>({});
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedQuestId, setSelectedQuestId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchEvents(), fetchExclusions()])
      .then(([eventsRes, exclusionsRes]) => {
        setEvents(eventsRes.events);
        setExclusions(exclusionsRes);

        const now = new Date();
        const active = eventsRes.events.find((e) => {
          const start = new Date(e.period.start);
          const end = new Date(e.period.end);
          return now >= start && now <= end;
        });
        const target = active ?? eventsRes.events[eventsRes.events.length - 1];
        if (target) {
          setSelectedEventId(target.eventId);
          if (target.quests.length > 0) {
            setSelectedQuestId(target.quests[0].questId);
          }
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>読み込み中...</p>;
  if (error) return <p style={{ color: "red" }}>エラー: {error}</p>;
  if (events.length === 0) return <p>イベントが登録されていません。</p>;

  const selectedEvent = events.find((e) => e.eventId === selectedEventId);

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <h1>eventstats</h1>

      <div style={{ marginBottom: "1rem" }}>
        <label>
          イベント:{" "}
          <select
            value={selectedEventId}
            onChange={(e) => {
              const eventId = e.target.value;
              setSelectedEventId(eventId);
              const ev = events.find((ev) => ev.eventId === eventId);
              if (ev && ev.quests.length > 0) {
                setSelectedQuestId(ev.quests[0].questId);
              } else {
                setSelectedQuestId("");
              }
            }}
          >
            {events.map((e) => (
              <option key={e.eventId} value={e.eventId}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedEvent && selectedEvent.quests.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          {selectedEvent.quests.map((q) => (
            <button
              key={q.questId}
              onClick={() => setSelectedQuestId(q.questId)}
              style={{
                padding: "6px 16px",
                marginRight: "4px",
                marginBottom: "4px",
                background:
                  q.questId === selectedQuestId ? "#1976d2" : "#e0e0e0",
                color: q.questId === selectedQuestId ? "#fff" : "#333",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {q.name}
            </button>
          ))}
        </div>
      )}

      {selectedEvent && selectedQuestId && (
        <QuestView
          eventId={selectedEvent.eventId}
          questId={selectedQuestId}
          exclusions={exclusions[selectedQuestId] ?? []}
        />
      )}
    </div>
  );
}
