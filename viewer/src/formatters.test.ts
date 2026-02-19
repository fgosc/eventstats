import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import {
  formatDateTime,
  formatItemHeader,
  formatNote,
  formatPeriod,
  formatTimestamp,
} from "./formatters";

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

describe("formatNote", () => {
  test("fgosccnt URL がなければ元の文字列を返す", () => {
    expect(formatNote("メモなし")).toBe("メモなし");
  });

  test("fgosccnt URL をリンク化する", () => {
    const url = "https://fgojunks.max747.org/fgosccnt/results/abc123";
    const html = renderToStaticMarkup(formatNote(`結果: ${url} 以上`));
    expect(html).toContain(`href="${url}"`);
    expect(html).toContain("fgosccnt");
    expect(html).toContain("結果: ");
    expect(html).toContain(" 以上");
  });

  test("URL のみの場合でもリンク化する", () => {
    const url = "https://fgojunks.max747.org/fgosccnt/results/xyz";
    const html = renderToStaticMarkup(formatNote(url));
    expect(html).toContain(`href="${url}"`);
  });
});

describe("formatItemHeader", () => {
  test("修飾子がなければ元の文字列を返す", () => {
    expect(formatItemHeader("騎士の誓い")).toBe("騎士の誓い");
  });

  test("(xN) 修飾子を改行で区切る", () => {
    const html = renderToStaticMarkup(formatItemHeader("ぐん肥(x3)"));
    expect(html).toContain("ぐん肥");
    expect(html).toContain("<br/>");
    expect(html).toContain("(x3)");
  });

  test("(+N) 修飾子を改行で区切る", () => {
    const html = renderToStaticMarkup(formatItemHeader("ポイント(+600)"));
    expect(html).toContain("ポイント");
    expect(html).toContain("<br/>");
    expect(html).toContain("(+600)");
  });
});
