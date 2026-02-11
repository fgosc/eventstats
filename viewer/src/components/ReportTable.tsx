import type { Report, Exclusion } from "../types";

interface Props {
  reports: Report[];
  exclusions: Exclusion[];
  itemNames: string[];
}

export function ReportTable({ reports, exclusions, itemNames }: Props) {
  const excludedIds = new Set(exclusions.map((e) => e.reportId));
  const exclusionMap = new Map(exclusions.map((e) => [e.reportId, e.reason]));

  if (reports.length === 0) return <p>報告なし</p>;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", whiteSpace: "nowrap" }}>
        <thead>
          <tr>
            <th style={thStyle}>状態</th>
            <th style={thStyle}>報告者</th>
            <th style={thStyle}>周回数</th>
            {itemNames.map((name) => (
              <th key={name} style={thStyle}>
                {name}
              </th>
            ))}
            <th style={thStyle}>日時</th>
            <th style={thStyle}>メモ</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => {
            const excluded = excludedIds.has(r.id);
            const rowStyle: React.CSSProperties = excluded
              ? { opacity: 0.5, textDecoration: "line-through" }
              : {};

            return (
              <tr key={r.id} style={rowStyle} title={excluded ? exclusionMap.get(r.id) : undefined}>
                <td style={tdStyle}>
                  {excluded ? "除外" : "有効"}
                </td>
                <td style={tdStyle}>
                  {r.reporterName || r.reporter || "匿名"}
                </td>
                <td style={tdStyleRight}>{r.runcount}</td>
                {itemNames.map((name) => {
                  const value = r.items[name];
                  return (
                    <td key={name} style={tdStyleRight}>
                      {value == null ? "-" : value}
                    </td>
                  );
                })}
                <td style={tdStyle}>
                  {new Date(r.timestamp).toLocaleString("ja-JP")}
                </td>
                <td style={{ ...tdStyle, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.note}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "6px 12px",
  background: "#f5f5f5",
  textAlign: "left",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "6px 12px",
};

const tdStyleRight: React.CSSProperties = {
  ...tdStyle,
  textAlign: "right",
};
