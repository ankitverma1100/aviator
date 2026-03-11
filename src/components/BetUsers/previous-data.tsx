import React from "react";
import { binaryToFloat, displayName } from "../utils";
import Context from "../../context";

type PreviousRow = {
  name: string;
  avatar?: string;
  betAmount: number | string;
  target: number | string;
  cashOut: number | string;
  cashouted?: boolean;
  roundCrash?: number;
};

interface PreviousDataProps {
  previousHand?: any[];
}

function toRows(previousHand: any[] | undefined): PreviousRow[] {
  if (!Array.isArray(previousHand) || previousHand.length === 0) {
    return [];
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
      roundCrash: Number.isFinite(Number(item?.roundCrash)) ? Number(item?.roundCrash) : undefined,
    };
  });
}

export default function PreviousData({ previousHand }: PreviousDataProps) {
  const { previousRoundResult } = React.useContext(Context);
  const rows: PreviousRow[] = toRows(previousHand);
  const crashedRoundResult = rows.find((row) => Number.isFinite(Number(row.roundCrash)))?.roundCrash;
  const bestTarget = rows.reduce((max, row) => {
    const current = Number(binaryToFloat(row.target));
    return current > max ? current : max;
  }, 0);
  const roundResult = Number.isFinite(Number(previousRoundResult))
    ? Number(previousRoundResult)
    : Number.isFinite(Number(crashedRoundResult))
    ? Number(crashedRoundResult)
    : bestTarget > 0
      ? bestTarget
      : 0;

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
          {rows.length === 0 && <div className="bet-list-item empty-state">No previous results yet</div>}
        </div>
      </div>
    </>
  );
}
