import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createEvent, fetchHarvestQuests, getEvents, updateEvent } from "../api/client";
import type { EventData, HarvestQuest, Quest } from "../types";

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
  const [sourceExpanded, setSourceExpanded] = useState<Record<number, boolean>>({});
  const [newSourceId, setNewSourceId] = useState<Record<number, string>>({});
  // 候補テーブルの「ソースに追加」select の選択状態: candidateId → questIndex (-1 = 未選択)
  const [addAsSourceTarget, setAddAsSourceTarget] = useState<Record<string, number>>({});

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
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
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
    setQuests([...quests, { questId: "", name: "", level: "", ap: 40, sourceQuestIds: [] }]);
  };

  const toggleSourceExpanded = (index: number) => {
    setSourceExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const addSourceId = (index: number) => {
    const id = (newSourceId[index] ?? "").trim();
    if (!id) return;
    const current = quests[index].sourceQuestIds ?? [];
    if (current.includes(id)) return;
    const updated = quests.map((q, i) =>
      i === index ? { ...q, sourceQuestIds: [...current, id] } : q,
    );
    setQuests(updated);
    setNewSourceId((prev) => ({ ...prev, [index]: "" }));
  };

  const removeSourceId = (questIndex: number, sourceIndex: number) => {
    const current = quests[questIndex].sourceQuestIds ?? [];
    const updated = quests.map((q, i) =>
      i === questIndex
        ? { ...q, sourceQuestIds: current.filter((_, si) => si !== sourceIndex) }
        : q,
    );
    setQuests(updated);
  };

  const addAsSource = (questIndex: number, sourceId: string) => {
    if (questIndex < 0 || questIndex >= quests.length) return;
    const current = quests[questIndex].sourceQuestIds ?? [];
    if (current.includes(sourceId)) return;
    const updated = quests.map((q, i) =>
      i === questIndex ? { ...q, sourceQuestIds: [...current, sourceId] } : q,
    );
    setQuests(updated);
    setAddAsSourceTarget((prev) => ({ ...prev, [sourceId]: -1 }));
  };

  const removeQuest = (index: number) => {
    setQuests(quests.filter((_, i) => i !== index));
    setSourceExpanded((prev) => {
      const next: Record<number, boolean> = {};
      for (const [k, v] of Object.entries(prev)) {
        const ki = Number(k);
        if (ki < index) next[ki] = v;
        else if (ki > index) next[ki - 1] = v;
      }
      return next;
    });
    setNewSourceId((prev) => {
      const next: Record<number, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        const ki = Number(k);
        if (ki < index) next[ki] = v;
        else if (ki > index) next[ki - 1] = v;
      }
      return next;
    });
    setAddAsSourceTarget((prev) => {
      const next: Record<string, number> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (v < index) next[k] = v;
        else if (v > index) next[k] = v - 1;
        // v === index: 削除されたクエストを指していたので除外（未選択に戻す）
      }
      return next;
    });
  };

  const updateQuest = (index: number, field: keyof Quest, value: string | number) => {
    const updated = quests.map((q, i) => (i === index ? { ...q, [field]: value } : q));
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
      setError(err instanceof Error ? err.message : "Harvest データ取得に失敗");
    } finally {
      setCandidatesLoading(false);
    }
  };

  const addCandidate = (c: HarvestQuest) => {
    if (quests.some((q) => q.questId === c.id)) return;
    const questName = c.place || c.chapter || c.name;
    setQuests([...quests, { questId: c.id, name: questName, level: "", ap: 40 }]);
  };

  if (loading) return <p>読み込み中...</p>;

  const addedIds = new Set(quests.flatMap((q) => [q.questId, ...(q.sourceQuestIds ?? [])]));

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
            <button type="button" onClick={fetchCandidates} disabled={candidatesLoading}>
              {candidatesLoading ? "取得中..." : "候補を取得"}
            </button>
          </div>
          <p style={{ fontSize: 12, color: "#666", margin: "4px 0 0" }}>
            イベント期間内に報告があるクエスト (is_freequest=false) を取得します。 level と AP
            は手動で設定してください。
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
                    <td style={candidateTd}>{new Date(c.since).toLocaleDateString("ja-JP")}</td>
                    <td style={candidateTd}>
                      {addedIds.has(c.id) ? (
                        <span style={{ color: "#888" }}>追加済み</span>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 4,
                            alignItems: "center",
                          }}
                        >
                          <button type="button" onClick={() => addCandidate(c)}>
                            追加
                          </button>
                          {quests.length > 0 && (
                            <>
                              <select
                                value={addAsSourceTarget[c.id] ?? -1}
                                onChange={(e) =>
                                  setAddAsSourceTarget((prev) => ({
                                    ...prev,
                                    [c.id]: Number(e.target.value),
                                  }))
                                }
                                style={{ fontSize: 13 }}
                              >
                                <option value={-1}>ソースに追加...</option>
                                {quests.map((q, qi) => (
                                  <option key={qi} value={qi}>
                                    {q.name || `クエスト${qi + 1}`}
                                    {q.level ? ` (Lv.${q.level})` : ""}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                disabled={(addAsSourceTarget[c.id] ?? -1) < 0}
                                onClick={() => addAsSource(addAsSourceTarget[c.id], c.id)}
                                style={{ fontSize: 13 }}
                              >
                                +
                              </button>
                            </>
                          )}
                        </div>
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
                  onChange={(e) => updateQuest(i, "ap", Number.parseInt(e.target.value, 10) || 0)}
                  style={{ display: "block", width: "100%", marginTop: 4 }}
                  required
                />
              </label>
              <button type="button" onClick={() => removeQuest(i)}>
                削除
              </button>
            </div>

            {/* 複数ソース設定 */}
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={() => toggleSourceExpanded(i)}
                style={{
                  fontSize: 12,
                  color: "#555",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {sourceExpanded[i] ? "▲ 複数ソース設定を閉じる" : "▼ 複数ソース設定"}
                {q.sourceQuestIds && q.sourceQuestIds.length > 0 && (
                  <span style={{ marginLeft: 6, color: "#0066cc" }}>
                    ({q.sourceQuestIds.length} 件設定中)
                  </span>
                )}
              </button>
              {sourceExpanded[i] && (
                <div
                  style={{
                    marginTop: 6,
                    padding: "8px 12px",
                    background: "#f9f9f9",
                    borderRadius: 4,
                    border: "1px solid #e0e0e0",
                  }}
                >
                  <p style={{ fontSize: 12, color: "#666", margin: "0 0 6px" }}>
                    集計元の Harvest ページ ID を列挙します。未設定の場合はクエスト ID
                    のみが使われます。
                  </p>
                  {(q.sourceQuestIds ?? []).map((sid, si) => (
                    <div
                      key={si}
                      style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}
                    >
                      <span style={{ fontFamily: "monospace", fontSize: 13, flex: 1 }}>{sid}</span>
                      <button
                        type="button"
                        onClick={() => removeSourceId(i, si)}
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          color: "#888",
                          fontSize: 13,
                        }}
                      >
                        x
                      </button>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <input
                      type="text"
                      value={newSourceId[i] ?? ""}
                      onChange={(e) => setNewSourceId((prev) => ({ ...prev, [i]: e.target.value }))}
                      placeholder="Harvest ページ ID"
                      style={{ flex: 1, fontFamily: "monospace", fontSize: 13 }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSourceId(i);
                        }
                      }}
                    />
                    <button type="button" onClick={() => addSourceId(i)} style={{ fontSize: 13 }}>
                      追加
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        <button type="button" onClick={addQuest} style={{ marginBottom: 16 }}>
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

/**
 * クエストレベル文字列を比較用の [数値部分, サフィックス順序] タプルに変換する。
 * サフィックスは SUFFIX_ORDER の定義順（"", "+", "++", ... , "★★★"）で数値化する。
 * パターンにマッチしない場合は [0, 0] を返す。
 */
function parseLevelKey(level: string): [number, number] {
  const m = level.match(/^(\d+)(.*)/);
  if (!m) return [0, 0];
  const num = Number.parseInt(m[1], 10);
  const suffix = m[2];
  const suffixIdx = SUFFIX_ORDER.indexOf(suffix);
  return [num, suffixIdx >= 0 ? suffixIdx : SUFFIX_ORDER.length];
}

/**
 * クエストをレベル昇順で並び替える比較関数。Array.sort() に渡して使用する。
 * 数値が同じ場合はサフィックス（"+" < "++" < "★" など）の定義順で比較する。
 * @param a 比較対象のクエスト
 * @param b 比較対象のクエスト
 */
function sortByLevel(a: Quest, b: Quest): number {
  const [aNum, aSuf] = parseLevelKey(a.level);
  const [bNum, bSuf] = parseLevelKey(b.level);
  if (aNum !== bNum) return aNum - bNum;
  return aSuf - bSuf;
}

/**
 * ISO 形式の日時文字列を `<input type="datetime-local">` の値形式（JST, "YYYY-MM-DDTHH:mm"）に変換する。
 * API から取得した期間データをフォームに初期表示する際に使用する。
 */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const offset = 9 * 60;
  const local = new Date(d.getTime() + offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

/**
 * `<input type="datetime-local">` の値（"YYYY-MM-DDTHH:mm"）を
 * JST オフセット付きの ISO 形式（"YYYY-MM-DDTHH:mm:00+09:00"）に変換する。
 * フォームの入力値を API へ送信するペイロードに変換する際に使用する。
 */
function toISO(localInput: string): string {
  return `${localInput}:00+09:00`;
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
