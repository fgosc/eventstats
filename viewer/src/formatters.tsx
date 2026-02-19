import type { ReactNode } from "react";
import type { EventPeriod } from "./types";

const RE_FGOSCCNT = /https:\/\/fgojunks\.max747\.org\/fgosccnt\/results\/\S+/;
const RE_MODIFIER = /(\((?:x|\+)\d+\))$/;

/** メモ欄の fgosccnt URL をリンク化して返す */
export function formatNote(note: string): ReactNode {
  const m = RE_FGOSCCNT.exec(note);
  if (!m) return note;
  const before = note.slice(0, m.index);
  const after = note.slice(m.index + m[0].length);
  return (
    <>
      {before}
      <a href={m[0]} target="_blank" rel="noopener noreferrer">
        fgosccnt
      </a>
      {after}
    </>
  );
}

/** アイテム名の修飾子部分（"(x3)" 等）を改行で区切って返す */
export function formatItemHeader(name: string): ReactNode {
  const m = RE_MODIFIER.exec(name);
  if (!m) return name;
  const base = name.slice(0, m.index);
  return (
    <>
      {base}
      <br />
      {m[1]}
    </>
  );
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

export function formatPeriod(period: EventPeriod): string {
  return `${formatDateTime(period.start)} 〜 ${formatDateTime(period.end)}`;
}
