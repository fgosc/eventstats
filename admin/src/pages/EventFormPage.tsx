import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getEvents,
  createEvent,
  updateEvent,
  fetchHarvestQuests,
} from "../api/client";
import type { EventData, Quest, HarvestQuest } from "../types";

export function EventFormPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const isEdit = eventId !== "new";

  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [quests, setQuests] = useState<Quest[]>([]);
  const [eventItems, setEventItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");

  // Harvest クエスト候補
  const [candidates, setCandidates] = useState<HarvestQuest[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

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
        setQuests([...ev.quests].sort(sortByLevel));
        setEventItems(ev.eventItems ?? []);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, [eventId, isEdit]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const sortedQuests = [...quests].sort(sortByLevel);
    const payload: Omit<EventData, "eventId"> = {
      name,
      period: {
        start: toISO(start),
        end: toISO(end),
      },
      quests: sortedQuests,
      eventItems,
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

  const addEventItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (eventItems.includes(trimmed)) return;
    setEventItems([...eventItems, trimmed]);
    setNewItem("");
  };

  const removeEventItem = (index: number) => {
    setEventItems(eventItems.filter((_, i) => i !== index));
  };

  const addQuest = () => {
    setQuests(
      [...quests, { questId: "", name: "", level: "", ap: 40 }],
    );
  };

  const removeQuest = (index: number) => {
    setQuests(quests.filter((_, i) => i !== index));
  };

  const updateQuest = (
    index: number,
    field: keyof Quest,
    value: string | number,
  ) => {
    const updated = quests.map((q, i) =>
      i === index ? { ...q, [field]: value } : q,
    );
    setQuests(updated);
  };

  const fetchCandidates = async () => {
    if (!start || !end) {
      setError("候補取得にはイベント期間の入力が必要です");
      return;
    }
    setCandidatesLoading(true);
    setError("");
    try {
      const all = await fetchHarvestQuests();
      const startDate = new Date(toISO(start));
      const endDate = new Date(toISO(end));
      const filtered = all.filter((q) => {
        if (q.is_freequest) return false;
        const since = new Date(q.since);
        return since >= startDate && since <= endDate;
      });
      setCandidates(filtered);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Harvest データ取得に失敗",
      );
    } finally {
      setCandidatesLoading(false);
    }
  };

  const addCandidate = (c: HarvestQuest) => {
    if (quests.some((q) => q.questId === c.id)) return;
    const questName = c.place || c.chapter || c.name;
    setQuests(
      [...quests, { questId: c.id, name: questName, level: "", ap: 40 }],
    );
  };

  if (loading) return <p>読み込み中...</p>;

  const addedIds = new Set(quests.map((q) => q.questId));

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

        <h2>イベントアイテム</h2>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="アイテム名（例: ぐん肥）"
              style={{ flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEventItem();
                }
              }}
            />
            <button type="button" onClick={addEventItem}>
              追加
            </button>
          </div>
          {eventItems.map((item, i) => (
            <span
              key={i}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                border: "1px solid #ccc",
                borderRadius: 4,
                padding: "2px 8px",
                marginRight: 4,
                marginBottom: 4,
              }}
            >
              {item}
              <button
                type="button"
                onClick={() => removeEventItem(i)}
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 14,
                  color: "#888",
                }}
              >
                x
              </button>
            </span>
          ))}
          {eventItems.length === 0 && (
            <p style={{ fontSize: 12, color: "#666", margin: "4px 0 0" }}>
              未設定の場合、集計時に報告データから自動検出されます。
            </p>
          )}
        </div>

        <h2>クエスト一覧</h2>

        {/* Harvest 候補取得 */}
        <div
          style={{
            border: "1px solid #b0c4de",
            background: "#f0f8ff",
            padding: 12,
            marginBottom: 16,
            borderRadius: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong>Harvest からクエスト候補を取得</strong>
            <button
              type="button"
              onClick={fetchCandidates}
              disabled={candidatesLoading}
            >
              {candidatesLoading ? "取得中..." : "候補を取得"}
            </button>
          </div>
          <p style={{ fontSize: 12, color: "#666", margin: "4px 0 0" }}>
            イベント期間内に報告があるクエスト (is_freequest=false) を取得します。
            level と AP は手動で設定してください。
          </p>

          {candidates.length > 0 && (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: 8,
                fontSize: 14,
              }}
            >
              <thead>
                <tr>
                  <th style={candidateTh}>名前</th>
                  <th style={candidateTh}>報告数</th>
                  <th style={candidateTh}>初回報告</th>
                  <th style={candidateTh}>操作</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id}>
                    <td style={candidateTd}>{c.name}</td>
                    <td style={candidateTd}>{c.count}</td>
                    <td style={candidateTd}>
                      {new Date(c.since).toLocaleDateString("ja-JP")}
                    </td>
                    <td style={candidateTd}>
                      {addedIds.has(c.id) ? (
                        <span style={{ color: "#888" }}>追加済み</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addCandidate(c)}
                        >
                          追加
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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

const SUFFIX_ORDER = ["", "+", "++", "+++", "\u2605", "\u2605\u2605", "\u2605\u2605\u2605"];

function parseLevelKey(level: string): [number, number] {
  const m = level.match(/^(\d+)(.*)/);
  if (!m) return [0, 0];
  const num = parseInt(m[1], 10);
  const suffix = m[2];
  const suffixIdx = SUFFIX_ORDER.indexOf(suffix);
  return [num, suffixIdx >= 0 ? suffixIdx : SUFFIX_ORDER.length];
}

function sortByLevel(a: Quest, b: Quest): number {
  const [aNum, aSuf] = parseLevelKey(a.level);
  const [bNum, bSuf] = parseLevelKey(b.level);
  if (aNum !== bNum) return aNum - bNum;
  return aSuf - bSuf;
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

const candidateTh: React.CSSProperties = {
  borderBottom: "1px solid #b0c4de",
  padding: "4px 8px",
  textAlign: "left",
};

const candidateTd: React.CSSProperties = {
  borderBottom: "1px solid #dde",
  padding: "4px 8px",
};
