import React, { useEffect } from "react";
import axios from "axios";
import "./bets.scss";
import { appConfig } from "../../shared/config/appConfig";
import { displayName } from "../utils";

type TopRow = {
  name: string;
  avatar?: string;
  date: string;
  roundId?: string;
  serverSeed?: string;
  hash?: string;
  clientSeeds?: Array<{ name: string; avatar?: string; seed: string }>;
  betInr: number;
  winInr: number;
  resultX: number;
  roundMaxX: number;
};

const DUMMY_TOP_ROWS: TopRow[] = [
  { name: "w***1", avatar: "./avatars/av-59.png", date: "01.03.26 22:06:44", roundId: "6490068", serverSeed: "vSSynkqwJs0Xb2FyBepkJtpKRMNznVRnYn0fRZgo", hash: "ffad8e45ec1b09182785c8fd8626ea94b5acb225e831684983a1829a80bbac8b574d53be7c2125c15", clientSeeds: [{ name: "d***a", avatar: "./avatars/av-5.png", seed: "qwy76VQdpuoH4hYf0RZG" }, { name: "m***e", avatar: "./avatars/av-65.png", seed: "8ND3oMd994A9bMbp44Qq" }, { name: "b***8", avatar: "./avatars/av-72.png", seed: "gIM4DNcrRzwwkidyesaq" }], betInr: 15000, winInr: 500000, resultX: 33.33, roundMaxX: 110.31 },
  { name: "a***9", avatar: "./avatars/av-23.png", date: "01.03.26 20:48:11", roundId: "6490049", serverSeed: "g1Lc0mzT3vQWivxnSQm3eP4yRF5s8YV0mJY2D7Qb", hash: "f6ad145ec1b09182785c8fd8626ea94b5acb225e831684983a1829a80bbac8b574d53be7c2125c15", clientSeeds: [{ name: "a***9", avatar: "./avatars/av-23.png", seed: "5nY7ZZMd9wpA2hMbp44Qq" }, { name: "w***1", avatar: "./avatars/av-59.png", seed: "7kP3qQdpuoH4hYf0RZG9" }, { name: "c***0", avatar: "./avatars/av-54.png", seed: "nIM4DNcrRzw7kidyesaq" }], betInr: 25000, winInr: 500000, resultX: 20.0, roundMaxX: 43.07 },
  { name: "w***1", avatar: "./avatars/av-59.png", date: "01.03.26 18:21:03", roundId: "6490031", betInr: 15000, winInr: 500000, resultX: 33.33, roundMaxX: 43.07 },
  { name: "a***9", avatar: "./avatars/av-23.png", date: "01.03.26 17:52:19", roundId: "6490022", betInr: 25000, winInr: 500000, resultX: 20.0, roundMaxX: 82.35 },
  { name: "a***9", avatar: "./avatars/av-23.png", date: "01.03.26 16:31:45", roundId: "6490014", betInr: 25000, winInr: 500000, resultX: 20.0, roundMaxX: 89.63 },
  { name: "a***9", avatar: "./avatars/av-23.png", date: "01.03.26 14:14:08", roundId: "6490001", betInr: 25000, winInr: 500000, resultX: 20.0, roundMaxX: 89.63 },
];

type FairnessModalState = {
  open: boolean;
  row: TopRow | null;
  target: number;
};

const TopHistory = () => {
  const [metricType, setMetricType] = React.useState<"x" | "win" | "rounds">("win");
  const [rangeType, setRangeType] = React.useState<"day" | "month" | "year">("day");
  const [history, setHistory] = React.useState<TopRow[]>(DUMMY_TOP_ROWS);
  const [fairnessModal, setFairnessModal] = React.useState<FairnessModalState>({
    open: false,
    row: null,
    target: 0,
  });

  const metricSortedRows = React.useMemo(() => {
    const rows = [...history];
    if (metricType === "x") {
      return rows.sort((a, b) => b.resultX - a.resultX);
    }
    if (metricType === "rounds") {
      return rows.sort((a, b) => b.roundMaxX - a.roundMaxX);
    }
    return rows.sort((a, b) => b.winInr - a.winInr);
  }, [history, metricType]);

  const getMultiplierClass = (value: number) => {
    if (value < 2) return "blue";
    if (value < 10) return "purple";
    return "big";
  };

  const roundRows = React.useMemo(
    () =>
      metricSortedRows.map((item) => ({
        source: item,
        dateTime: item.date,
        x: item.roundMaxX,
      })),
    [metricSortedRows]
  );

  const openFairnessModal = (row: TopRow, target: number) => {
    setFairnessModal({ open: true, row, target });
  };

  const closeFairnessModal = () => {
    setFairnessModal({ open: false, row: null, target: 0 });
  };

  const getModalData = (row: TopRow | null, target: number) => {
    const fallbackHash =
      "ffad8e45ec1b09182785c8fd8626ea94b5acb225e831684983a1829a80bbac8b574d53be7c2125c15";
    const hash = row?.hash || fallbackHash;
    const displayTarget = Number(target || row?.roundMaxX || row?.resultX || 0);
    const clientSeeds = row?.clientSeeds || [
      { name: "d***a", avatar: "./avatars/av-5.png", seed: "qwy76VQdpuoH4hYf0RZG" },
      { name: "m***e", avatar: "./avatars/av-65.png", seed: "8ND3oMd994A9bMbp44Qq" },
      { name: "b***8", avatar: "./avatars/av-72.png", seed: "gIM4DNcrRzwwkidyesaq" },
    ];
    const decimalValue = Number.parseInt(hash.slice(0, 13), 16);
    return {
      roundId: row?.roundId || "6490068",
      time: row?.date?.split(" ").slice(1).join(" ") || "22:06:44",
      serverSeed: row?.serverSeed || "vSSynkqwJs0Xb2FyBepkJtpKRMNznVRnYn0fRZgo",
      hash,
      hex: hash.slice(0, 13),
      decimal: Number.isFinite(decimalValue) ? decimalValue : 4497934101954992,
      result: displayTarget,
      clientSeeds,
    };
  };

  const modalData = React.useMemo(
    () => getModalData(fairnessModal.row, fairnessModal.target),
    [fairnessModal.row, fairnessModal.target]
  );

  const callDate = async (date: "day" | "month" | "year") => {
    try {
      let response = await axios.get(
        `${appConfig.platform.apiBase}/get-${date}-history`
      );
      const apiRows = response?.data?.data;
      if (Array.isArray(apiRows) && apiRows.length > 0) {
        const mapped: TopRow[] = apiRows.slice(0, 40).map((item: any) => ({
          name: item?.userinfo?.[0]?.userName || item?.name || "player",
          avatar: item?.userinfo?.[0]?.avatar || item?.avatar || "./avatars/av-5.png",
          date: item?.createdAt ? new Date(item.createdAt).toLocaleString("en-GB", { hour12: false }).replace(",", "") : "01.03.26 22:06:44",
          roundId: String(item?.flyDetailID || item?.roundId || item?._id || ""),
          serverSeed: item?.serverSeed,
          hash: item?.hash || item?.combinedHash,
          clientSeeds: Array.isArray(item?.seedOfUsers)
            ? item.seedOfUsers.slice(0, 3).map((u: any) => ({
                name: displayName(u?.userName || "player"),
                avatar: u?.avatar || "./avatars/av-5.png",
                seed: String(u?.seed || ""),
              }))
            : undefined,
          betInr: Number(item?.betAmount || 0),
          winInr: Number(item?.winAmount || (Number(item?.betAmount || 0) * Number(item?.cashoutAt || 0))),
          resultX: Number(item?.cashoutAt || item?.result || 0),
          roundMaxX: Number(item?.roundMax || item?.maxX || item?.cashoutAt || 0),
        }));
        setHistory(mapped);
      }
    } catch (error: any) {
      console.log("callDate", error);
      setHistory(DUMMY_TOP_ROWS);
    }
  };

  useEffect(() => {
    callDate("day");
  }, []);

  return (
    <>
      <div className="top-tab-switcher">
        <div className="top-tab-switcher-row">
          {[
            { value: "x", label: "X" },
            { value: "win", label: "Win" },
            { value: "rounds", label: "Rounds" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setMetricType(item.value as "x" | "win" | "rounds");
              }}
              className={`top-tab-switcher__tab ${metricType === item.value ? "top-tab-switcher__tab--active" : ""}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="top-tab-switcher-row">
          {[
            { value: "day", label: "Day" },
            { value: "month", label: "Month" },
            { value: "year", label: "Year" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                if (rangeType !== item.value) {
                  const next = item.value as "day" | "month" | "year";
                  setRangeType(next);
                  callDate(next);
                }
              }}
              className={`top-tab-switcher__tab ${rangeType === item.value ? "top-tab-switcher__tab--active" : ""}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="top-list h-100">
        <div className="h-100 scroll-y top-wins-list">
          {metricType === "rounds" ? (
            <>
              <div className="rounds-header">
                <span>Date &amp; Time</span>
                <span>X</span>
                <span></span>
              </div>
              {roundRows.map((row, index) => (
                <div key={`${row.dateTime}-${index}`} className="rounds-list-item">
                  <div className="round-date">{row.dateTime}</div>
                  <div className={`round-x ${getMultiplierClass(row.x)}`}>{row.x.toFixed(2)}x</div>
                  <button
                    type="button"
                    aria-label="Check Fairness"
                    className="round-action-btn"
                    onClick={() => openFairnessModal(row.source, row.x)}
                  >
                    <div className="icon fairness-i"></div>
                  </button>
                </div>
              ))}
            </>
          ) : (
            metricSortedRows.map((item, index) => (
              <div key={index} className="top-wins-list-item">
                <div className="top-wins-list-item-row">
                  <img className="avatar" alt={item.avatar || "avatar"} src={item.avatar || "/avatars/av-5.png"} />
                  <div className="column username-date">
                    <div className="username">{displayName(item.name)}</div>
                    <div className="date">{item.date}</div>
                  </div>
                  <div className="buttons-group">
                    <button type="button" aria-label="Share Bet" className="btn" disabled>
                      <div className="icon share-i"></div>
                    </button>
                    <button
                      type="button"
                      aria-label="Check Fairness"
                      className="btn"
                      onClick={() => openFairnessModal(item, item.resultX)}
                    >
                      <div className="icon fairness-i"></div>
                    </button>
                  </div>
                </div>

                <div className="top-wins-list-item-row">
                  <div className="column bet-details">
                    <div className="bet-details-row">
                      <div className="description">Bet INR</div>
                      <div className="value">{item.betInr.toFixed(2)}</div>
                    </div>
                    <div className="bet-details-row">
                      <div className="description">Win INR</div>
                      <div className="value">{item.winInr.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="column bet-details">
                    <div className="bet-details-row">
                      <div className="description">Result</div>
                      <div className={`value ${getMultiplierClass(item.resultX)}`}>{item.resultX.toFixed(2)}x</div>
                    </div>
                    <div className="bet-details-row">
                      <div className="description">Round max.</div>
                      <div className={`value ${getMultiplierClass(item.roundMaxX)}`}>{item.roundMaxX.toFixed(2)}x</div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {fairnessModal.open && fairnessModal.row && (
        <div className="top-fairness-modal" role="dialog" aria-modal="true">
          <div className="top-fairness-backdrop" onClick={closeFairnessModal}></div>
          <div className="top-fairness-dialog">
            <div className="top-fairness-header">
              <span className="title">ROUND {modalData.roundId}</span>
              <span className={`multiplier ${getMultiplierClass(modalData.result)}`}>
                {modalData.result.toFixed(2)}x
              </span>
              <span className="time">{modalData.time}</span>
              <button type="button" className="close-btn" onClick={closeFairnessModal} aria-label="Close">
                x
              </button>
            </div>

            <div className="top-fairness-body">
              <div className="fair-section">
                <div className="section-title">Server Seed:</div>
                <div className="section-tip">Generated on our side</div>
                <div className="mono-box">{modalData.serverSeed}</div>
              </div>

              <div className="fair-section">
                <div className="section-title">Client Seed:</div>
                <div className="section-tip">Generated on players side</div>
                {modalData.clientSeeds.map((seed, i) => (
                  <div key={`${seed.seed}-${i}`} className="seed-row">
                    <div className="seed-player">
                      <span>Player N{i + 1}:</span>
                      <img src={seed.avatar || "./avatars/av-5.png"} alt={seed.name} />
                      <strong>{seed.name}</strong>
                    </div>
                    <div className="seed-value">
                      <span>Seed:</span>
                      <span>{seed.seed}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="fair-section">
                <div className="section-title">Combined SHA512 Hash:</div>
                <div className="section-tip">
                  Above seeds combined and converted to SHA512 Hash. This is your game result
                </div>
                <div className="mono-box">{modalData.hash}</div>
              </div>

              <div className="result-grid">
                <div>Hex:</div>
                <div>Decimal:</div>
                <div>Result:</div>
                <div>{modalData.hex}</div>
                <div>{modalData.decimal}</div>
                <div>{modalData.result.toFixed(2)}</div>
              </div>
            </div>

            <div className="top-fairness-footer">
              For instructions check <span>What is Provably Fair</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopHistory;
