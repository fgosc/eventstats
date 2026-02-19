import {
  calcEventItemExpected,
  classifyStats,
  extractModifier,
  sortByBaseAndModifier,
} from "../summaryUtils";
import type { ItemStats } from "../types";
import { tableStyle, tdStyle, tdStyleRight, thStyle as thStyleBase } from "./tableUtils";

interface Props {
  stats: ItemStats[];
}

const MAX_EVENT_BONUS = 12;

function EventItemExpectedTable({ eventItems }: { eventItems: ItemStats[] }) {
  const rows = calcEventItemExpected(eventItems);
  if (rows.length === 0) return null;

  const bonusRange = Array.from({ length: MAX_EVENT_BONUS + 1 }, (_, i) => i);

  return (
    <>
      <h4 style={h4Style}>イベントアイテム獲得数期待値</h4>
      <div style={{ overflowX: "auto" }}>
        <table style={{ ...tableStyle, whiteSpace: "nowrap" }}>
          <thead>
            <tr>
              <th style={thStyleItem}>アイテム</th>
              <th style={thStyleNarrow}>枠数</th>
              {bonusRange.map((n) => (
                <th key={n} style={thStyleNarrow}>
                  +{n}
                </th>
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
      <h4 style={h4Style}>{title}</h4>
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
                  {s.totalRuns > 0 ? (s.totalDrops / s.totalRuns).toFixed(2) : "-"}
                </td>
                <td style={tdStyleRight}>
                  {s.totalRuns > 0 ? ((s.totalDrops / s.totalRuns) * bonus).toFixed(2) : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td style={tdStyleBold} colSpan={4}>
              合計
            </td>
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
          <h4 style={h4Style}>素材</h4>
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
                    {s.totalRuns > 0 ? `${(s.dropRate * 100).toFixed(2)}%` : "-"}
                  </td>
                  <td style={tdStyleRight}>
                    {s.totalRuns > 0
                      ? `±${(((s.ciUpper - s.ciLower) / 2) * 100).toFixed(2)}%`
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
          <h4 style={h4Style}>イベントアイテム</h4>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyleItem}>アイテム</th>
                <th style={thStyle}>合計枠数</th>
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
                    {s.totalRuns > 0 ? (s.totalDrops / s.totalRuns).toFixed(2) : "-"}
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

const h4Style: React.CSSProperties = {
  marginBottom: "0.6rem",
};

const thStyle: React.CSSProperties = {
  ...thStyleBase,
  width: "8em",
};

const thStyleItem: React.CSSProperties = {
  ...thStyleBase,
  width: "12em",
};

const thStyleNarrow: React.CSSProperties = {
  ...thStyleBase,
  width: "4em",
};

const tdStyleBold: React.CSSProperties = {
  ...tdStyle,
  fontWeight: "bold",
};

const tdStyleRightBold: React.CSSProperties = {
  ...tdStyleRight,
  fontWeight: "bold",
};
