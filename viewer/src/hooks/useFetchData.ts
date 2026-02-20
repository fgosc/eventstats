import type React from "react";
import { useEffect, useState } from "react";

/**
 * AbortController・loading/error 状態管理を共通化する汎用フェッチフック。
 * @param fetcher AbortSignal を受け取り Promise を返す非同期関数
 * @param deps fetcher の再実行トリガーとなる依存配列（呼び出し側が管理する）
 * @param initialData フェッチ完了前に返す初期値
 * @returns data・loading・error の状態オブジェクト
 */
export function useFetchData<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList,
  initialData: T,
): { data: T; loading: boolean; error: string | null } {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetcher(controller.signal)
      .then(setData)
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // biome-ignore lint/correctness/useExhaustiveDependencies: caller controls deps
  }, deps);

  return { data, loading, error };
}
