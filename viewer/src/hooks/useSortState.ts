import { useCallback, useState } from "react";

/**
 * null 許容のソート状態フック。
 * 同キー押下で asc → desc → null とサイクルし、別キー押下で asc から開始する。
 * ReportTable 向け。
 */
export function useSortState<K extends string>() {
  const [sort, setSort] = useState<{ key: K; dir: "asc" | "desc" } | null>(null);

  const toggleSort = useCallback((key: K) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }, []);

  return { sort, toggleSort };
}

/**
 * 常にソート状態を維持するフック（null に戻らない）。
 * 同キー押下で desc ↔ asc をトグルし、別キー押下で desc から開始する。
 * ReporterSummary 向け。
 */
export function useFixedSortState<K extends string>(initial: { key: K; dir: "asc" | "desc" }) {
  const [sort, setSort] = useState(initial);

  const toggleSort = useCallback((key: K) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "desc" };
      return { key, dir: prev.dir === "desc" ? "asc" : "desc" };
    });
  }, []);

  return { sort, toggleSort };
}
