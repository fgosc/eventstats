import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEvents, createEvent, updateEvent } from "../api/client";
import type { EventData, Quest } from "../types";

export function EventFormPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const isEdit = eventId !== "new";

  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    getEvents()
      .then((data) => {
        const ev = data.events.find((e) => e.eventId === eventId);
        if (!ev) {
          setError("イベントが見つかりません");
          return;
        }
        setName(ev.name);
        setStart(toLocalInput(ev.period.start));
        setEnd(toLocalInput(ev.period.end));
        setQuests(ev.quests);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, [eventId, isEdit]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const payload: Omit<EventData, "eventId"> = {
      name,
      period: {
        start: toISO(start),
        end: toISO(end),
      },
      quests,
    };

    try {
      if (isEdit && eventId) {
        await updateEvent(eventId, payload);
      } else {
        await createEvent(payload);
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const addQuest = () => {
    setQuests([...quests, { questId: "", name: "", level: "90+", ap: 40 }]);
  };

  const removeQuest = (index: number) => {
    setQuests(quests.filter((_, i) => i !== index));
  };

  const updateQuest = (index: number, field: keyof Quest, value: string | number) => {
    setQuests(
      quests.map((q, i) => (i === index ? { ...q, [field]: value } : q)),
    );
  };

  if (loading) return <p>読み込み中...</p>;

  return (
    <div style={{ maxWidth: 800, margin: "24px auto", padding: 24 }}>
      <h1>{isEdit ? "イベント編集" : "イベント新規作成"}</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>
            イベント名
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              required
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
          <label style={{ flex: 1 }}>
            開始日時
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              required
            />
          </label>
          <label style={{ flex: 1 }}>
            終了日時
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              required
            />
          </label>
        </div>

        <h2>クエスト一覧</h2>
        {quests.map((q, i) => (
          <div
            key={i}
            style={{
              border: "1px solid #ddd",
              padding: 12,
              marginBottom: 8,
              borderRadius: 4,
            }}
          >
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <label style={{ flex: 1 }}>
                クエスト ID
                <input
                  type="text"
                  value={q.questId}
                  onChange={(e) => updateQuest(i, "questId", e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                  required
                />
              </label>
              <label style={{ flex: 2 }}>
                クエスト名
                <input
                  type="text"
                  value={q.name}
                  onChange={(e) => updateQuest(i, "name", e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                  required
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
              <label style={{ flex: 1 }}>
                推奨レベル
                <input
                  type="text"
                  value={q.level}
                  onChange={(e) => updateQuest(i, "level", e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                  required
                />
              </label>
              <label style={{ flex: 1 }}>
                消費 AP
                <input
                  type="number"
                  value={q.ap}
                  onChange={(e) =>
                    updateQuest(i, "ap", parseInt(e.target.value, 10) || 0)
                  }
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                  required
                />
              </label>
              <button type="button" onClick={() => removeQuest(i)}>
                削除
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addQuest}
          style={{ marginBottom: 16 }}
        >
          クエスト追加
        </button>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit">{isEdit ? "更新" : "作成"}</button>
          <button type="button" onClick={() => navigate("/")}>
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const offset = 9 * 60;
  const local = new Date(d.getTime() + offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function toISO(localInput: string): string {
  return localInput + ":00+09:00";
}
