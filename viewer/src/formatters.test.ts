import { describe, test, expect } from "vitest";
import { formatDateTime, formatTimestamp, formatPeriod } from "./formatters";

describe("formatDateTime", () => {
  test("ISO 文字列を日本語ローカライズ形式に変換する", () => {
    const result = formatDateTime("2026-01-15T14:30:00+09:00");
    // toLocaleString の出力はランタイム依存だが、主要な要素が含まれるか検証
    expect(result).toContain("2026");
    expect(result).toContain("01");
    expect(result).toContain("15");
    expect(result).toContain("14");
    expect(result).toContain("30");
  });

  test("UTC 時刻も処理できる", () => {
    const result = formatDateTime("2026-06-01T00:00:00Z");
    expect(result).toContain("2026");
    expect(result).toContain("06");
  });
});

describe("formatTimestamp", () => {
  test("ISO 文字列を日本語ローカライズ形式に変換する", () => {
    const result = formatTimestamp("2026-01-15T14:30:45+09:00");
    expect(result).toContain("2026");
    expect(result).toContain("14");
    expect(result).toContain("30");
    expect(result).toContain("45");
  });
});

describe("formatPeriod", () => {
  test("開始〜終了を結合する", () => {
    const result = formatPeriod({
      start: "2026-01-01T00:00:00+09:00",
      end: "2026-01-31T23:59:00+09:00",
    });
    expect(result).toContain("〜");
    expect(result).toContain("2026");
  });
});
