import type { ItemStats } from "../types";

interface Props {
  stats: ItemStats[];
}

const RE_BOX_COUNT = /\(x(\d+)\)$/;
const RE_QP_BONUS = /^QP\(\+(\d+)\)$/;
const RE_POINT_BONUS = /^ポイント\(\+(\d+)\)$/;

function classifyStats(stats: ItemStats[]) {
  const normal: ItemStats[] = [];
  const eventItems: ItemStats[] = [];
  const points: ItemStats[] = [];
  const qp: ItemStats[] = [];

  for (const s of stats) {
    if (RE_BOX_COUNT.test(s.itemName)) {
      eventItems.push(s);
    } else if (RE_QP_BONUS.test(s.itemName)) {
      qp.push(s);
    } else if (RE_POINT_BONUS.test(s.itemName)) {
      points.push(s);
    } else {
      normal.push(s);
    }
  }

  return { normal, eventItems, points, qp };
}

function extractBaseName(name: string): string {
  const mBox = RE_BOX_COUNT.exec(name);
  if (mBox) return name.slice(0, mBox.index);
  if (RE_POINT_BONUS.test(name)) return "ポイント";
  if (RE_QP_BONUS.test(name)) return "QP";
  return name;
}

function extractModifier(name: string): number {
  const mBox = RE_BOX_COUNT.exec(name);
  if (mBox) return parseInt(mBox[1], 10);
  const mPoint = RE_POINT_BONUS.exec(name);
  if (mPoint) return parseInt(mPoint[1], 10);
  const mQp = RE_QP_BONUS.exec(name);
  if (mQp) return parseInt(mQp[1], 10);
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

const MAX_EVENT_BONUS = 12;

interface EventItemExpected {
  baseName: string;
  slots: number;    // 枠数の和（倍率無視）
  base: number;     // +0 期待値
}

function calcEventItemExpected(eventItems: ItemStats[]): EventItemExpected[] {
  const grouped = new Map<string, { slots: number; base: number }>();

  for (const s of eventItems) {
    if (s.totalRuns === 0) continue;
    const baseName = extractBaseName(s.itemName);
    const multiplier = extractModifier(s.itemName);
    const dropsPerRun = s.totalDrops / s.totalRuns;

    const entry = grouped.get(baseName) ?? { slots: 0, base: 0 };
    entry.slots += dropsPerRun;
    entry.base += dropsPerRun * multiplier;
    grouped.set(baseName, entry);
  }

  return [...grouped.entries()]
    .map(([baseName, { slots, base }]) => ({ baseName, slots, base }))
    .sort((a, b) => a.baseName.localeCompare(b.baseName));
}

function EventItemExpectedTable({ eventItems }: { eventItems: ItemStats[] }) {
  const rows = calcEventItemExpected(eventItems);
  if (rows.length === 0) return null;

  const bonusRange = Array.from({ length: MAX_EVENT_BONUS + 1 }, (_, i) => i);

  return (
    <>
      <h4>イベントアイテム獲得数期待値</h4>
      <div style={{ overflowX: "auto" }}>
        <table style={{ ...tableStyle, whiteSpace: "nowrap" }}>
          <thead>
            <tr>
              <th style={thStyleItem}>アイテム</th>
              <th style={thStyleNarrow}>枠数</th>
              {bonusRange.map((n) => (
                <th key={n} style={thStyleNarrow}>+{n}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.baseName}>
                <td style={tdStyle}>{r.baseName}</td>
                <td style={tdStyleRight}>{r.slots.toFixed(2)}</td>
                {bonusRange.map((n) => (
                  <td key={n} style={tdStyleRight}>
                    {(r.base + r.slots * n).toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function BonusTable({ title, items }: { title: string; items: ItemStats[] }) {
  const sorted = sortByBaseAndModifier(items);
  const totalExpected = sorted.reduce((sum, s) => {
    if (s.totalRuns === 0) return sum;
    const bonus = extractModifier(s.itemName);
    return sum + (s.totalDrops / s.totalRuns) * bonus;
  }, 0);
  return (
    <>
      <h4>{title}</h4>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyleItem}>アイテム</th>
            <th style={thStyle}>合計</th>
            <th style={thStyle}>合計周回数</th>
            <th style={thStyle}>1周あたり枠数</th>
            <th style={thStyle}>1周あたり期待値</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => {
            const bonus = extractModifier(s.itemName);
            return (
              <tr key={s.itemName}>
                <td style={tdStyle}>{s.itemName}</td>
                <td style={tdStyleRight}>{s.totalDrops.toLocaleString()}</td>
                <td style={tdStyleRight}>{s.totalRuns.toLocaleString()}</td>
                <td style={tdStyleRight}>
                  {s.totalRuns > 0
                    ? (s.totalDrops / s.totalRuns).toFixed(2)
                    : "-"}
                </td>
                <td style={tdStyleRight}>
                  {s.totalRuns > 0
                    ? ((s.totalDrops / s.totalRuns) * bonus).toFixed(2)
                    : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td style={tdStyleBold} colSpan={4}>合計</td>
            <td style={tdStyleRightBold}>{totalExpected.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </>
  );
}

export function SummaryTable({ stats }: Props) {
  if (stats.length === 0) return <p>データなし</p>;

  const { normal, eventItems, points, qp } = classifyStats(stats);

  return (
    <>
      {normal.length > 0 && (
        <>
        <h4>素材</h4>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyleItem}>アイテム</th>
              <th style={thStyle}>合計ドロップ</th>
              <th style={thStyle}>合計周回数</th>
              <th style={thStyle}>ドロップ率</th>
              <th style={thStyle}>95%信頼区間幅</th>
            </tr>
          </thead>
          <tbody>
            {normal.map((s) => (
              <tr key={s.itemName}>
                <td style={tdStyle}>{s.itemName}</td>
                <td style={tdStyleRight}>{s.totalDrops.toLocaleString()}</td>
                <td style={tdStyleRight}>{s.totalRuns.toLocaleString()}</td>
                <td style={tdStyleRight}>
                  {s.totalRuns > 0
                    ? `${(s.dropRate * 100).toFixed(2)}%`
                    : "-"}
                </td>
                <td style={tdStyleRight}>
                  {s.totalRuns > 0
                    ? `±${((s.ciUpper - s.ciLower) / 2 * 100).toFixed(2)}%`
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </>
      )}

      {eventItems.length > 0 && (
        <>
        <h4>イベントアイテム</h4>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyleItem}>アイテム</th>
              <th style={thStyle}>合計ドロップ</th>
              <th style={thStyle}>合計周回数</th>
              <th style={thStyle}>1周あたり枠数</th>
            </tr>
          </thead>
          <tbody>
            {sortByBaseAndModifier(eventItems).map((s) => (
              <tr key={s.itemName}>
                <td style={tdStyle}>{s.itemName}</td>
                <td style={tdStyleRight}>{s.totalDrops.toLocaleString()}</td>
                <td style={tdStyleRight}>{s.totalRuns.toLocaleString()}</td>
                <td style={tdStyleRight}>
                  {s.totalRuns > 0
                    ? (s.totalDrops / s.totalRuns).toFixed(2)
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <EventItemExpectedTable eventItems={eventItems} />
        </>
      )}

      {points.length > 0 && <BonusTable title="ポイント" items={points} />}

      {qp.length > 0 && <BonusTable title="QP" items={qp} />}
    </>
  );
}

const tableStyle: React.CSSProperties = {
  borderCollapse: "collapse",
  marginBottom: "2rem",
};

const itemWidth = "12em";
const numWidth = "8em";
const narrowNumWidth = "4em";

const thStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "6px 12px",
  background: "#f5f5f5",
  textAlign: "left",
  width: numWidth,
};

const thStyleItem: React.CSSProperties = {
  ...thStyle,
  width: itemWidth,
};

const thStyleNarrow: React.CSSProperties = {
  ...thStyle,
  width: narrowNumWidth,
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "6px 12px",
};

const tdStyleRight: React.CSSProperties = {
  ...tdStyle,
  textAlign: "right",
};

const tdStyleBold: React.CSSProperties = {
  ...tdStyle,
  fontWeight: "bold",
};

const tdStyleRightBold: React.CSSProperties = {
  ...tdStyleRight,
  fontWeight: "bold",
};
