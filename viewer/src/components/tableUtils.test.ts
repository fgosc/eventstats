import { describe, test, expect } from "vitest";
import { sortIndicator } from "./tableUtils";

describe("sortIndicator", () => {
  test("アクティブキー昇順で ▲ を返す", () => {
    expect(sortIndicator({ key: "runcount", dir: "asc" }, "runcount")).toBe(" ▲");
  });

  test("アクティブキー降順で ▼ を返す", () => {
    expect(sortIndicator({ key: "runcount", dir: "desc" }, "runcount")).toBe(" ▼");
  });

  test("非アクティブキーで △ を返す", () => {
    expect(sortIndicator({ key: "runcount", dir: "asc" }, "reporter")).toBe(" △");
  });

  test("null の場合は △ を返す", () => {
    expect(sortIndicator(null, "reporter")).toBe(" △");
  });
});
