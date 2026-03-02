import React from "react";
import Context from "../../context";
import { displayName } from "../utils";
import { BettedUserType, UserType } from "../../utils/interfaces";
import { binaryToFloat } from "../utils";

const DUMMY_ALL_BETS: Array<{
  name: string;
  avatar: string;
  betAmount: number;
  target: number;
  cashOut: number;
  cashouted: boolean;
}> = [
  { name: "w***1", avatar: "./avatars/av-59.png", betAmount: 25000, target: 0, cashOut: 0, cashouted: false },
  { name: "m***7", avatar: "./avatars/av-21.png", betAmount: 18000, target: 0, cashOut: 0, cashouted: false },
  { name: "k***3", avatar: "./avatars/av-23.png", betAmount: 10000, target: 1.5, cashOut: 15000, cashouted: true },
  { name: "j***4", avatar: "./avatars/av-39.png", betAmount: 8000, target: 1.17, cashOut: 9360, cashouted: true },
  { name: "s***5", avatar: "./avatars/av-42.png", betAmount: 6000, target: 0, cashOut: 0, cashouted: false },
];

interface AllDataProps {
  pre?: boolean;
  setPre?: React.Dispatch<React.SetStateAction<boolean>>;
  allData: UserType[] | BettedUserType[];
}

const AllData = ({ allData }: AllDataProps) => {
  const { bettedUsers } = React.useContext(Context);
  const safeRows: any[] = Array.isArray(allData) ? (allData as any[]) : [];
  // Temporary fallback so the section remains visible before API data is wired.
  const rows = safeRows.length > 0 ? safeRows : DUMMY_ALL_BETS;
  const totalBetsCount = rows.length;
  const totalCashoutValue = rows.reduce(
    (sum, item: any) => sum + Number(binaryToFloat(item?.cashOut || 0)),
    0
  );
  const cashedRowsCount = rows.filter((item: any) => Number(binaryToFloat(item?.cashOut || 0)) > 0).length;
  const progressPercent =
    totalBetsCount > 0 ? Math.min(100, Math.round((cashedRowsCount / totalBetsCount) * 100)) : 0;

  const topAvatars = rows
    .slice(0, 3)
    .map((item: any) => item?.avatar || item?.img || "")
    .filter(Boolean);

  return (
    <>
      <div>
        <div className="total-win-container">
          <div className="total-win-header">
            <div className="avatars">
              {topAvatars.length > 0 ? (
                topAvatars.map((src, idx) => (
                  <img
                    key={`${src}-${idx}`}
                    draggable="false"
                    className="avatar"
                    src={src}
                    alt={src}
                    style={{ zIndex: 10 - idx }}
                  />
                ))
              ) : (
                <img draggable="false" className="avatar" src="./avatars/av-5.png" alt="avatar" />
              )}
            </div>
            <span className="cashout-value">{totalCashoutValue.toFixed(2)}</span>
          </div>

          <div className="total-win-stats">
            <div className="bets">
              <span className="bets-count">{totalBetsCount}</span>
              <span className="bets-label">/{bettedUsers?.length || totalBetsCount} Bets</span>
            </div>
            <div className="total-win">Total win INR</div>
          </div>

          <div className="total-win-progress">
            <div className="total-win-progress-bar" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        <div className="bets-list-header">
          <span className="bets-list-header-item player">Player</span>
          <span className="bets-list-header-item bet">Bet INR</span>
          <span className="bets-list-header-item x">X</span>
          <span className="bets-list-header-item win">Win INR</span>
        </div>
      </div>
      <div className="cdk-virtual-scroll-viewport scroll-y bets-list-viewport">
        <div className="cdk-virtual-scroll-content-wrapper">
          {rows?.map((user: any, key) => (
            <div
              className={`bet-list-item ${user.cashouted ? "celebrated" : ""}`}
              key={key}
            >
              <div className="bet-list-item-column player">
                {user.avatar || user.img ? (
                  <img className="avatar" src={user.avatar || user.img} alt="avatar" />
                ) : (
                  <img
                    className="avatar"
                    src="./avatars/av-5.png"
                    alt="avatar"
                  />
                )}
                <div className="username">{displayName(user.name)}</div>
              </div>
              <div className="bet-list-item-column bet">{binaryToFloat(user.betAmount).toFixed(2)}</div>
              {user.cashouted && (
                <div className="bet-list-item-column x">
                  <div
                    className={`bubble font-weight-bold opacity-${100 - 2 * key} ${binaryToFloat(user.target) < 2
                      ? "blue"
                      : binaryToFloat(user.target) < 10
                        ? "purple"
                        : "big"
                      }`}
                  >
                    {binaryToFloat(user.target).toFixed(2)}x
                  </div>
                </div>
              )}
              {!user.cashouted && <div className="bet-list-item-column x"></div>}
              <div className="bet-list-item-column win">
                {binaryToFloat(user.cashOut) > 0
                  ? binaryToFloat(user.cashOut).toFixed(2)
                  : ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default AllData;
