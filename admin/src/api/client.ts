import { fetchAuthSession } from "aws-amplify/auth";
import type { EventData, EventsResponse, Exclusion, HarvestQuest, QuestData } from "../types";

const API_URL = import.meta.env.VITE_API_URL as string;
const DATA_URL = import.meta.env.VITE_DATA_URL as string;

/**
 * Cognito の idToken を Bearer トークンとして含む認証ヘッダーを生成する。
 * すべての API リクエストの前処理として request() から呼び出される。
 */
async function authHeaders(): Promise<Record<string, string>> {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString() ?? "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/**
 * 認証ヘッダーを付けて管理 API へリクエストを送る汎用関数。
 * レスポンスが ok でない場合はレスポンスボディを含むエラーをスローする。
 * @param path API パス（VITE_API_URL からの相対パス）
 * @param init fetch の追加オプション（method, body など）
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

/** イベント一覧を取得する。 */
export function getEvents() {
  return request<EventsResponse>("/events");
}

/** イベントを新規作成する。作成されたイベント（eventId 付き）を返す。 */
export function createEvent(data: Omit<EventData, "eventId">) {
  return request<EventData>("/events", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * 指定イベントを更新する。更新後のイベントデータを返す。
 * @param eventId 更新対象のイベント ID
 * @param data イベントデータ（eventId を除く）
 */
export function updateEvent(eventId: string, data: Omit<EventData, "eventId">) {
  return request<EventData>(`/events/${eventId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/** 指定イベントを削除する。 */
export function deleteEvent(eventId: string) {
  return request<{ message: string }>(`/events/${eventId}`, {
    method: "DELETE",
  });
}

/** 指定クエストの除外リストを取得する。 */
export function getExclusions(questId: string) {
  return request<Exclusion[]>(`/exclusions/${questId}`);
}

/**
 * 指定クエストの除外リストを更新する（全件置き換え）。
 * 更新後の除外リストを返す。
 * @param questId クエスト ID
 * @param exclusions 除外リスト（全件置き換え）
 */
export function updateExclusions(questId: string, exclusions: Exclusion[]) {
  return request<Exclusion[]>(`/exclusions/${questId}`, {
    method: "PUT",
    body: JSON.stringify(exclusions),
  });
}

/**
 * Harvest のクエスト一覧を取得する。
 * EventFormPage でイベントクエスト候補を絞り込む際に使用する。
 */
export function fetchHarvestQuests() {
  return request<HarvestQuest[]>("/harvest/quests");
}

/**
 * 指定クエストの集計 JSON（報告一覧）を公開データ URL から取得する。
 * viewer と同じ CloudFront 配下の公開ファイルのため、認証ヘッダーは付けない。
 * S3 + CloudFront では未作成オブジェクトに 403 が返るため、403/404 は
 * 「未集計（報告データなし）」として null を返す。
 * @param eventId イベント ID（JSON パスの一部）
 * @param questId クエスト ID（JSON パスの一部）
 */
export async function fetchQuestReports(
  eventId: string,
  questId: string,
): Promise<QuestData | null> {
  if (!DATA_URL) {
    throw new Error("VITE_DATA_URL is not set");
  }
  const res = await fetch(
    `${DATA_URL}/${encodeURIComponent(eventId)}/${encodeURIComponent(questId)}.json`,
  );
  if (res.status === 403 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch quest data: ${res.status}`);
  return res.json() as Promise<QuestData>;
}
