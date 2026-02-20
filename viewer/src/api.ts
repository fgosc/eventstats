import type { EventsResponse, ExclusionsMap, QuestData } from "./types";

/**
 * 環境変数 VITE_DATA_URL からデータ取得先のベース URL を返す。
 * 未設定の場合は例外をスローする。
 */
function getDataUrl(): string {
  const url = import.meta.env.VITE_DATA_URL;
  if (!url) throw new Error("VITE_DATA_URL is not set");
  return url;
}

/** events.json を取得してイベント一覧を返す。 */
export async function fetchEvents(signal?: AbortSignal): Promise<EventsResponse> {
  const res = await fetch(`${getDataUrl()}/events.json`, { signal });
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
  return res.json();
}

/**
 * exclusions.json を取得して除外リストを返す。
 * ファイルが存在しない場合（403/404 等）は空オブジェクトを返す。
 */
export async function fetchExclusions(signal?: AbortSignal): Promise<ExclusionsMap> {
  const res = await fetch(`${getDataUrl()}/exclusions.json`, { signal });
  if (!res.ok) return {};
  return res.json();
}

/**
 * 指定クエストの集計 JSON を取得する。
 * S3 + CloudFront 構成では未作成オブジェクトに 403 が返るため、
 * 403/404 はデータ未登録として null を返す（エラーにしない）。
 * @param eventId イベント ID（JSON パスの一部）
 * @param questId クエスト ID（JSON パスの一部）
 * @param signal フェッチのキャンセル用シグナル
 */
export async function fetchQuestData(
  eventId: string,
  questId: string,
  signal?: AbortSignal,
): Promise<QuestData | null> {
  const res = await fetch(`${getDataUrl()}/${eventId}/${questId}.json`, { signal });
  // S3 + CloudFront では未作成のオブジェクトに対して 403 が返るため、
  // 404 と同様に「データ未登録」として扱い、エラーではなく null を返す
  if (res.status === 403 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch quest data: ${res.status}`);
  return res.json();
}
