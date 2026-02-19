import { useCallback, useState } from "react";

/**
 * Set&lt;string&gt; のトグル管理フック。
 * アコーディオン展開状態などに使用する。
 */
export function useToggleSet() {
  const [set, setSet] = useState<Set<string>>(new Set());

  const toggle = useCallback((item: string) => {
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }, []);

  return { set, toggle };
}
