import type React from "react";

export function sortIndicator(
  sort: { key: string; dir: "asc" | "desc" } | null,
  key: string,
): string {
  if (sort && sort.key === key) {
    return sort.dir === "asc" ? " ▲" : " ▼";
  }
  return " △";
}

export const tableStyle: React.CSSProperties = {
  borderCollapse: "collapse",
  marginBottom: "2rem",
};

export const thStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "6px 12px",
  background: "#f5f5f5",
  textAlign: "left",
};

export const thStyleSortable: React.CSSProperties = {
  ...thStyle,
  cursor: "pointer",
  userSelect: "none",
};

export const thStyleSortActive: React.CSSProperties = {
  ...thStyleSortable,
  background: "#e3edf7",
};

export const tdStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "6px 12px",
};

export const tdStyleRight: React.CSSProperties = {
  ...tdStyle,
  textAlign: "right",
};
