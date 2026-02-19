import type { EventItemExpected } from "../summaryUtils";
import type { Quest } from "../types";
import { tableStyle, tdStyle, tdStyleRight, thStyle } from "./tableUtils";

export interface QuestExpected {
  quest: Quest;
  data: EventItemExpected[];
}

interface Props {
  questExpected: QuestExpected[];
}

const MAX_EVENT_BONUS = 12;

const thStyleNarrow: React.CSSProperties = {
  ...thStyle,
  width: "4em",
};

const thStyleQuest: React.CSSProperties = {
  ...thStyle,
  width: "5em",
};

const h4Style: React.CSSProperties = {
  marginBottom: "0.6rem",
};

export function EventItemSummaryView({ questExpected }: Props) {
  if (questExpected.length === 0) return <p>データなし</p>;

  // 全クエストからベース名をユニーク化・ソート
  const baseNames = [
    ...new Set(questExpected.flatMap((qe) => qe.data.map((d) => d.baseName))),
  ].sort((a, b) => a.localeCompare(b));

  if (baseNames.length === 0) return <p>データなし</p>;

  const bonusRange = Array.from({ length: MAX_EVENT_BONUS + 1 }, (_, i) => i);

  return (
    <>
      {baseNames.map((baseName) => (
        <div key={baseName}>
          <h4 style={h4Style}>{baseName}</h4>
          <div style={{ overflowX: "auto" }}>
            <table style={{ ...tableStyle, whiteSpace: "nowrap" }}>
              <thead>
                <tr>
                  <th style={thStyleQuest}>クエスト</th>
                  <th style={thStyleNarrow}>合計枠数</th>
                  <th style={thStyleNarrow}>周回数</th>
                  <th style={thStyleNarrow}>枠数</th>
                  {bonusRange.map((n) => (
                    <th key={n} style={thStyleNarrow}>
                      +{n}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {questExpected.map(({ quest, data }) => {
                  const item = data.find((d) => d.baseName === baseName);
                  return (
                    <tr key={quest.questId}>
                      <td style={tdStyle}>Lv.{quest.level}</td>
                      {item ? (
                        <>
                          <td style={tdStyleRight}>{item.totalSlots.toLocaleString()}</td>
                          <td style={tdStyleRight}>{item.totalRuns.toLocaleString()}</td>
                          <td style={tdStyleRight}>{item.slots.toFixed(2)}</td>
                          {bonusRange.map((n) => (
                            <td key={n} style={tdStyleRight}>
                              {(item.base + item.slots * n).toFixed(2)}
                            </td>
                          ))}
                        </>
                      ) : (
                        // クエスト列は直前の <td> で描画済み。残り列は 合計枠数(1) + 周回数(1) + 枠数(1) + ボーナス列
                        <td style={tdStyleRight} colSpan={bonusRange.length + 3}>
                          -
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}
