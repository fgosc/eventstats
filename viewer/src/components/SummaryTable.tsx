import type { ItemStats } from "../types";

interface Props {
  stats: ItemStats[];
}

export function SummaryTable({ stats }: Props) {
  if (stats.length === 0) return <p>データなし</p>;

  return (
    <table
      style={{
        borderCollapse: "collapse",
        width: "100%",
        marginBottom: "2rem",
      }}
    >
      <thead>
        <tr>
          <th style={thStyle}>アイテム</th>
          <th style={thStyle}>合計ドロップ</th>
          <th style={thStyle}>合計周回数</th>
          <th style={thStyle}>ドロップ率</th>
        </tr>
      </thead>
      <tbody>
        {stats.map((s) => (
          <tr key={s.itemName}>
            <td style={tdStyle}>{s.itemName}</td>
            <td style={tdStyleRight}>{s.totalDrops}</td>
            <td style={tdStyleRight}>{s.totalRuns}</td>
            <td style={tdStyleRight}>
              {s.totalRuns > 0
                ? `${(s.dropRate * 100).toFixed(2)}%`
                : "-"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
