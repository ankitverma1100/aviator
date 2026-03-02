import React from "react";
import { binaryToFloat, displayName } from "../utils";

type PreviousRow = {
  name: string;
  avatar?: string;
  betAmount: number | string;
  target: number | string;
  cashOut: number | string;
  cashouted?: boolean;
};

const DUMMY_PREVIOUS_ROWS: PreviousRow[] = [
  { name: "7***h", avatar: "./avatars/av-23.png", betAmount: 10000, target: 2.84, cashOut: 28400, cashouted: true },
  { name: "a***9", avatar: "./avatars/av-59.png", betAmount: 5000, target: 3.06, cashOut: 15300, cashouted: true },
  { name: "1***h", avatar: "./avatars/av-39.png", betAmount: 5000, target: 4.06, cashOut: 20300, cashouted: true },
  { name: "z***4", avatar: "./avatars/av-21.png", betAmount: 4000, target: 1.44, cashOut: 5760, cashouted: true },
  { name: "t***7", avatar: "./avatars/av-42.png", betAmount: 3625, target: 2.75, cashOut: 9968.75, cashouted: true },
  { name: "1***r", avatar: "./avatars/av-5.png", betAmount: 3000, target: 1.68, cashOut: 5040, cashouted: true },
  { name: "s***0", avatar: "./avatars/av-20.png", betAmount: 3000, target: 2.07, cashOut: 6210, cashouted: true },
  { name: "v***r", avatar: "./avatars/av-55.png", betAmount: 3000, target: 1.35, cashOut: 4050, cashouted: true },
];

interface PreviousDataProps {
  previousHand?: any[];
}

function toRows(previousHand: any[] | undefined): PreviousRow[] {
  if (!Array.isArray(previousHand) || previousHand.length === 0) {
    return DUMMY_PREVIOUS_ROWS;
  }

  return previousHand.map((item: any) => {
    const betAmount = binaryToFloat(item?.betAmount);
    const target = binaryToFloat(item?.target || item?.cashoutAt || 0);
    const cashOut = binaryToFloat(item?.cashOut || item?.winAmount || betAmount * target);
    return {
      name: item?.name || "player",
      avatar: item?.avatar || item?.img || "./avatars/av-5.png",
      betAmount,
      target,
      cashOut,
      cashouted: cashOut > 0,
    };
  });
}

export default function PreviousData({ previousHand }: PreviousDataProps) {
  const rows: PreviousRow[] = toRows(previousHand);
  const bestTarget = rows.reduce((max, row) => {
    const current = Number(binaryToFloat(row.target));
    return current > max ? current : max;
  }, 0);
  const roundResult = bestTarget > 0 ? bestTarget : 4.31;

  return (
    <>
      <div className="previous-result-card">
        <div className="label">Round Result</div>
        <div className="value">{roundResult.toFixed(2)}x</div>
      </div>

      <div className="bets-list-header">
        <span className="bets-list-header-item player">Player</span>
        <span className="bets-list-header-item bet">Bet INR</span>
        <span className="bets-list-header-item x">X</span>
        <span className="bets-list-header-item win">Win INR</span>
      </div>

      <div className="cdk-virtual-scroll-viewport scroll-y bets-list-viewport">
        <div className="cdk-virtual-scroll-content-wrapper">
          {rows.map((row, key) => {
            const betAmount = Number(binaryToFloat(row.betAmount));
            const target = Number(binaryToFloat(row.target));
            const cashOut = Number(binaryToFloat(row.cashOut));
            const won = cashOut > 0;
            return (
              <div className={`bet-list-item ${won ? "celebrated" : ""}`} key={`${row.name}-${key}`}>
                <div className="bet-list-item-column player">
                  <img className="avatar" src={row.avatar || "./avatars/av-5.png"} alt="avatar" />
                  <div className="username">{displayName(row.name)}</div>
                </div>
                <div className="bet-list-item-column bet">{betAmount.toFixed(2)}</div>
                <div className="bet-list-item-column x">{won ? <span className="prev-x">{target.toFixed(2)}x</span> : ""}</div>
                <div className="bet-list-item-column win">{cashOut.toFixed(2)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
