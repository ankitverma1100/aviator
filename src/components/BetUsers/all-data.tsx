import React from "react";
import Context from "../../context";
import { displayName } from "../utils";
import { BettedUserType, UserType } from "../../utils/interfaces";
import { binaryToFloat } from "../utils";

interface AllDataProps {
  pre?: boolean;
  setPre?: React.Dispatch<React.SetStateAction<boolean>>;
  allData: UserType[] | BettedUserType[];
}

const AllData = ({ allData }: AllDataProps) => {
  const { bettedUsers } = React.useContext(Context);
  const safeRows: any[] = Array.isArray(allData) ? (allData as any[]) : [];
  const rows = safeRows;
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
          {rows.length === 0 && <div className="bet-list-item empty-state">No bets yet</div>}
        </div>
      </div>
    </>
  );
};

export default AllData;
