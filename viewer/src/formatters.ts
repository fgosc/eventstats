import type { EventPeriod } from "./types";

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP");
}

export function formatPeriod(period: EventPeriod): string {
  return `${formatDateTime(period.start)} 〜 ${formatDateTime(period.end)}`;
}
