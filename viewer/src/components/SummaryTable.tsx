import type { ItemStats } from "../types";

interface Props {
  stats: ItemStats[];
}

const RE_BOX_COUNT = /\(x(\d+)\)$/;
const RE_POINT_BONUS = /^(.+?)\(\+(\d+)\)$/;

function classifyStats(stats: ItemStats[]) {
  const normal: ItemStats[] = [];
  const eventItems: ItemStats[] = [];
  const points: ItemStats[] = [];

  for (const s of stats) {
    if (RE_BOX_COUNT.test(s.itemName)) {
      eventItems.push(s);
    } else if (RE_POINT_BONUS.test(s.itemName)) {
      points.push(s);
    } else {
      normal.push(s);
    }
  }

  return { normal, eventItems, points };
}

function extractBaseName(name: string): string {
  const mBox = RE_BOX_COUNT.exec(name);
  if (mBox) return name.slice(0, mBox.index);
  const mPoint = RE_POINT_BONUS.exec(name);
  if (mPoint) return mPoint[1];
  return name;
}

function extractModifier(name: string): number {
  const mBox = RE_BOX_COUNT.exec(name);
  if (mBox) return parseInt(mBox[1], 10);
  const mPoint = RE_POINT_BONUS.exec(name);
  if (mPoint) return parseInt(mPoint[2], 10);
  return 0;
}

function sortByBaseAndModifier(items: ItemStats[]): ItemStats[] {
  return [...items].sort((a, b) => {
    const baseA = extractBaseName(a.itemName);
    const baseB = extractBaseName(b.itemName);
    if (baseA < baseB) return -1;
    if (baseA > baseB) return 1;
    return extractModifier(a.itemName) - extractModifier(b.itemName);
  });
}

export function SummaryTable({ stats }: Props) {
  if (stats.length === 0) return <p>データなし</p>;

  const { normal, eventItems, points } = classifyStats(stats);

  return (
    <>
      {normal.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>アイテム</th>
              <th style={thStyle}>合計ドロップ</th>
              <th style={thStyle}>合計周回数</th>
              <th style={thStyle}>ドロップ率</th>
            </tr>
          </thead>
          <tbody>
            {normal.map((s) => (
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
      )}

      {eventItems.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>アイテム</th>
              <th style={thStyle}>合計ドロップ</th>
              <th style={thStyle}>合計周回数</th>
              <th style={thStyle}>1周あたり枠数</th>
            </tr>
          </thead>
          <tbody>
            {sortByBaseAndModifier(eventItems).map((s) => (
              <tr key={s.itemName}>
                <td style={tdStyle}>{s.itemName}</td>
                <td style={tdStyleRight}>{s.totalDrops}</td>
                <td style={tdStyleRight}>{s.totalRuns}</td>
                <td style={tdStyleRight}>
                  {s.totalRuns > 0
                    ? (s.totalDrops / s.totalRuns).toFixed(2)
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {points.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>アイテム</th>
              <th style={thStyle}>合計</th>
              <th style={thStyle}>合計周回数</th>
              <th style={thStyle}>1周あたり</th>
            </tr>
          </thead>
          <tbody>
            {sortByBaseAndModifier(points).map((s) => (
              <tr key={s.itemName}>
                <td style={tdStyle}>{s.itemName}</td>
                <td style={tdStyleRight}>{s.totalDrops}</td>
                <td style={tdStyleRight}>{s.totalRuns}</td>
                <td style={tdStyleRight}>
                  {s.totalRuns > 0
                    ? (s.totalDrops / s.totalRuns).toFixed(2)
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

const tableStyle: React.CSSProperties = {
  borderCollapse: "collapse",
  width: "100%",
  marginBottom: "2rem",
};

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
