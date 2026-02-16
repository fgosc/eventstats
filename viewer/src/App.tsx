import { useEffect, useState } from "react";
import type { EventData, ExclusionsMap } from "./types";
import { fetchEvents, fetchExclusions } from "./api";
import { QuestView } from "./components/QuestView";
import { ReporterSummary } from "./components/ReporterSummary";
import { formatPeriod } from "./formatters";

export function App() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [exclusions, setExclusions] = useState<ExclusionsMap>({});
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedQuestId, setSelectedQuestId] = useState<string>("");
  const [showReporterSummary, setShowReporterSummary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchEvents(), fetchExclusions()])
      .then(([eventsRes, exclusionsRes]) => {
        setEvents(eventsRes.events);
        setExclusions(exclusionsRes);

        const latest = [...eventsRes.events].sort(
          (a, b) => new Date(b.period.start).getTime() - new Date(a.period.start).getTime()
        )[0];
        const target = latest;
        if (target) {
          setSelectedEventId(target.eventId);
          if (target.quests.length > 0) {
            const sorted = [...target.quests].sort((a, b) => Number(a.level) - Number(b.level));
            setSelectedQuestId(sorted[sorted.length - 1].questId);
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
      <h1>FGO EventStats</h1>

      <div style={{ marginBottom: "1rem" }}>
        <label>
          イベント:{" "}
          <select
            value={selectedEventId}
            onChange={(e) => {
              const eventId = e.target.value;
              setSelectedEventId(eventId);
              setShowReporterSummary(false);
              const ev = events.find((ev) => ev.eventId === eventId);
              if (ev && ev.quests.length > 0) {
                const sorted = [...ev.quests].sort((a, b) => Number(a.level) - Number(b.level));
                setSelectedQuestId(sorted[sorted.length - 1].questId);
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
                onClick={() => { setSelectedQuestId(q.questId); setShowReporterSummary(false); }}
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
                Lv.{q.level} {q.name}
              </button>
            ))}
          <button
            onClick={() => { setShowReporterSummary(true); setSelectedQuestId(""); }}
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

      {selectedEvent && showReporterSummary && (
        <ReporterSummary
          eventId={selectedEvent.eventId}
          quests={selectedEvent.quests}
          exclusions={exclusions}
        />
      )}

      {selectedEvent && selectedQuestId && !showReporterSummary && (
        <QuestView
          eventId={selectedEvent.eventId}
          questId={selectedQuestId}
          exclusions={exclusions[selectedQuestId] ?? []}
        />
      )}

    </div>
  );
}
