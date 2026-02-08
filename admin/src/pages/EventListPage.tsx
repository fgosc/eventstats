import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getEvents, deleteEvent } from "../api/client";
import type { EventData } from "../types";
import { useAuth } from "../auth/AuthProvider";

export function EventListPage() {
  const { logout, username } = useAuth();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEvents = async () => {
    try {
      const data = await getEvents();
      setEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDelete = async (eventId: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    try {
      await deleteEvent(eventId);
      setEvents((prev) => prev.filter((e) => e.eventId !== eventId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete event");
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "24px auto", padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>イベント一覧</h1>
        <div>
          <span style={{ marginRight: 12 }}>{username}</span>
          <button onClick={logout}>ログアウト</button>
        </div>
      </div>

      <Link to="/events/new">
        <button style={{ marginBottom: 16 }}>新規作成</button>
      </Link>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <p>読み込み中...</p>
      ) : events.length === 0 ? (
        <p>イベントがありません。</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>イベント名</th>
              <th style={thStyle}>開始</th>
              <th style={thStyle}>終了</th>
              <th style={thStyle}>クエスト数</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.eventId}>
                <td style={tdStyle}>
                  <Link to={`/events/${ev.eventId}/edit`}>{ev.name}</Link>
                </td>
                <td style={tdStyle}>{formatDate(ev.period.start)}</td>
                <td style={tdStyle}>{formatDate(ev.period.end)}</td>
                <td style={tdStyle}>{ev.quests.length}</td>
                <td style={tdStyle}>
                  <Link to={`/events/${ev.eventId}/edit`}>
                    <button style={{ marginRight: 4 }}>編集</button>
                  </Link>
                  <button onClick={() => handleDelete(ev.eventId, ev.name)}>
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

const thStyle: React.CSSProperties = {
  borderBottom: "2px solid #ccc",
  padding: "8px 4px",
  textAlign: "left",
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: "8px 4px",
};
