// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { useFetchData } from "./useFetchData";

describe("useFetchData", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("初期状態は loading: true, data: initialData", () => {
    const fetcher = vi.fn((_signal: AbortSignal) => new Promise<string>(() => {}));
    const { result } = renderHook(() => useFetchData(fetcher, [], "initial"));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe("initial");
    expect(result.current.error).toBeNull();
  });

  test("fetch 成功時に data が更新され loading が false になる", async () => {
    const fetcher = vi.fn((_signal: AbortSignal) => Promise.resolve("fetched"));
    const { result } = renderHook(() => useFetchData(fetcher, [], "initial"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe("fetched");
    expect(result.current.error).toBeNull();
  });

  test("fetch 失敗時に error が設定され loading が false になる", async () => {
    const fetcher = vi.fn((_signal: AbortSignal) => Promise.reject(new Error("fetch failed")));
    const { result } = renderHook(() => useFetchData(fetcher, [], "initial"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("fetch failed");
    expect(result.current.data).toBe("initial");
  });

  test("AbortError は error に設定されない", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    const fetcher = vi.fn((_signal: AbortSignal) => Promise.reject(abortError));
    const { result } = renderHook(() => useFetchData(fetcher, [], "initial"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
  });

  test("deps が変わると fetcher が再実行される", async () => {
    let questId = "q1";
    const fetcher = vi.fn((_signal: AbortSignal) => Promise.resolve(`data-${questId}`));
    const { result, rerender } = renderHook(() => useFetchData(fetcher, [questId], "initial"));
    await waitFor(() => expect(result.current.data).toBe("data-q1"));

    questId = "q2";
    rerender();
    await waitFor(() => expect(result.current.data).toBe("data-q2"));
  });

  test("アンマウント時に fetch が中断される", async () => {
    let aborted = false;
    const fetcher = vi.fn(
      (signal: AbortSignal) =>
        new Promise<string>((resolve) => {
          signal.addEventListener("abort", () => {
            aborted = true;
          });
          setTimeout(() => resolve("done"), 1000);
        }),
    );
    const { unmount } = renderHook(() => useFetchData(fetcher, [], "initial"));
    unmount();
    expect(aborted).toBe(true);
  });
});
