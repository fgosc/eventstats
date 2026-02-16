import type React from "react";

interface StatsItem {
  label: string;
  value: React.ReactNode;
}

interface Props {
  items: StatsItem[];
  children?: React.ReactNode;
}

export function StatsBar({ items, children }: Props) {
  return (
    <div style={barStyle}>
      {items.map((item) => (
        <div key={item.label} style={cardStyle}>
          <div style={labelStyle}>{item.label}</div>
          <div style={valueStyle}>{item.value}</div>
        </div>
      ))}
      {children}
    </div>
  );
}

const barStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  marginBottom: "1.5rem",
  flexWrap: "wrap",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  borderRadius: "6px",
  padding: "8px 16px",
  background: "#f9f9f9",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#666",
  marginBottom: "2px",
};

const valueStyle: React.CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: "bold",
};
