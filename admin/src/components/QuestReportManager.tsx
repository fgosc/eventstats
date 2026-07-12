import { useState } from "react";
import { fetchQuestReports, getExclusions, updateExclusions } from "../api/client";
import type { Exclusion, Report } from "../types";

interface Props {
  eventId: string;
  questId: string;
}

/**
 * 1クエスト分の報告一覧を表示し、各報告の除外（無効化）を編集するアコーディオン。
 * EventFormPage のクエストカード内に配置され、自己完結で状態と保存を管理する。
 * 除外は exclusions.json（クエスト単位・全件置き換え）へ独立して保存され、
 * イベント本体の更新 submit とは分離される。
 */
export function QuestReportManager({ eventId, questId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const [reports, setReports] = useState<Report[]>([]);
  // reportId → 除外中かどうか
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  // reportId → 除外理由
  const [reasons, setReasons] = useState<Record<string, string>>({});
  // ロード済み reports に存在しない reportId の既存除外（保存時にマージして保持する）
  const [orphanExclusions, setOrphanExclusions] = useState<Exclusion[]>([]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [questData, exclusions] = await Promise.all([
        fetchQuestReports(eventId, questId),
        getExclusions(questId),
      ]);
      const loadedReports = questData?.reports ?? [];
      const reportIds = new Set(loadedReports.map((r) => r.id));
      const excluded = new Set<string>();
      const reasonMap: Record<string, string> = {};
      const orphans: Exclusion[] = [];
      for (const e of exclusions) {
        if (reportIds.has(e.reportId)) {
          excluded.add(e.reportId);
          reasonMap[e.reportId] = e.reason;
        } else {
          orphans.push(e);
        }
      }
      setReports(loadedReports);
      setExcludedIds(excluded);
      setReasons(reasonMap);
      setOrphanExclusions(orphans);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "報告データの取得に失敗");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !loaded && !loading) load();
  };

  const toggleExcluded = (id: string) => {
    setSavedMsg("");
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateReason = (id: string, value: string) => {
    setSavedMsg("");
    setReasons((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSavedMsg("");
    try {
      const payload: Exclusion[] = [
        ...orphanExclusions,
        ...reports
          .filter((r) => excludedIds.has(r.id))
          .map((r) => ({ reportId: r.id, reason: reasons[r.id] ?? "" })),
      ];
      await updateExclusions(questId, payload);
      setSavedMsg("保存しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗");
    } finally {
      setSaving(false);
    }
  };

  const excludedCount = excludedIds.size + orphanExclusions.length;

  return (
    <div style={{ marginTop: 8 }}>
      <button type="button" onClick={toggleExpanded} style={accordionButton}>
        {expanded ? "▲ 報告管理を閉じる" : "▼ 報告管理"}
        {loaded && excludedCount > 0 && (
          <span style={{ marginLeft: 6, color: "#0066cc" }}>({excludedCount} 件除外中)</span>
        )}
      </button>

      {expanded && (
        <div style={panelStyle}>
          {loading && <p style={{ fontSize: 13, color: "#666", margin: 0 }}>読み込み中...</p>}
          {error && <p style={{ color: "red", fontSize: 13, margin: "0 0 6px" }}>{error}</p>}

          {loaded && !loading && reports.length === 0 && (
            <p style={{ fontSize: 13, color: "#666", margin: 0 }}>
              報告データがありません（未集計のクエストです）。
            </p>
          )}

          {loaded && !loading && reports.length > 0 && (
            <>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", fontSize: 13, width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={th}>除外</th>
                      <th style={th}>報告者</th>
                      <th style={thRight}>周回</th>
                      <th style={th}>日時</th>
                      <th style={th}>メモ</th>
                      <th style={th}>理由</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => {
                      const excluded = excludedIds.has(r.id);
                      return (
                        <tr key={r.id} style={excluded ? excludedRow : undefined}>
                          <td style={tdCenter}>
                            <input
                              type="checkbox"
                              checked={excluded}
                              onChange={() => toggleExcluded(r.id)}
                            />
                          </td>
                          <td style={tdReporter} title={r.reporterName || r.reporter}>
                            <a
                              href={`https://fgodrop.max747.org/reports/${r.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {r.reporterName || r.reporter}
                            </a>
                          </td>
                          <td style={tdRight}>{r.runcount}</td>
                          <td style={td}>{formatTimestamp(r.timestamp)}</td>
                          <td style={tdNote} title={r.note}>
                            {r.note}
                          </td>
                          <td style={td}>
                            {excluded && (
                              <input
                                type="text"
                                value={reasons[r.id] ?? ""}
                                onChange={(e) => updateReason(r.id, e.target.value)}
                                placeholder="除外理由"
                                style={{ fontSize: 13, width: "12em" }}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <button type="button" onClick={handleSave} disabled={saving}>
                  {saving ? "保存中..." : "除外を保存"}
                </button>
                {savedMsg && <span style={{ color: "#0a0", fontSize: 13 }}>{savedMsg}</span>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** ISO 形式の日時文字列を日本時間のロケール文字列に変換する。 */
function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

const accordionButton: React.CSSProperties = {
  fontSize: 12,
  color: "#555",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
};

const panelStyle: React.CSSProperties = {
  marginTop: 6,
  padding: "8px 12px",
  background: "#f9f9f9",
  borderRadius: 4,
  border: "1px solid #e0e0e0",
};

const th: React.CSSProperties = {
  borderBottom: "1px solid #ccc",
  padding: "4px 8px",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const thRight: React.CSSProperties = { ...th, textAlign: "right" };

const td: React.CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: "4px 8px",
  whiteSpace: "nowrap",
};

const tdRight: React.CSSProperties = { ...td, textAlign: "right" };
const tdCenter: React.CSSProperties = { ...td, textAlign: "center" };

const tdReporter: React.CSSProperties = {
  ...td,
  maxWidth: "12em",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const tdNote: React.CSSProperties = {
  ...td,
  maxWidth: "16em",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const excludedRow: React.CSSProperties = {
  opacity: 0.5,
  textDecoration: "line-through",
};
