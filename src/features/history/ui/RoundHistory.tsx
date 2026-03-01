import React, { useEffect, useMemo } from "react";
import Context from "../../../context";
import { appConfig } from "../../../shared/config/appConfig";

const HISTORY_API_URL = appConfig.game.historyUrl;
type HistoryFilter = "all" | "low" | "mid" | "high";
const HISTORY_LIMIT = 40;

function toNumber(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function normalizeHistoryResponse(payload: any): number[] {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.items)
        ? payload.items
        : [];

  const mapped = list
    .map((item: any) =>
      toNumber(
        item?.crashPoint ??
          item?.multiplier ??
          item?.flyAway ??
          item?.target ??
          item
      )
    )
    .filter((item: number | null): item is number => item !== null);

  return mapped.slice(0, HISTORY_LIMIT);
}

export default function RoundHistory() {
  const { history: socketHistory } = React.useContext(Context);
  const [showHistory, setShowHistory] = React.useState(false);
  const [history, setHistory] = React.useState<number[]>([]);
  const [filter, setFilter] = React.useState<HistoryFilter>("all");

  const fetchHistory = React.useCallback(async () => {
    try {
      const res = await fetch(HISTORY_API_URL);
      const data = await res.json();
      const normalized = normalizeHistoryResponse(data);
      if (normalized.length > 0) {
        setHistory(normalized);
      }
    } catch {
      // Keep UI usable even if REST history is unavailable.
    }
  }, []);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    const onRefreshRequest = () => {
      void fetchHistory();
    };

    window.addEventListener("aviator-refresh-history", onRefreshRequest);
    return () => {
      window.removeEventListener("aviator-refresh-history", onRefreshRequest);
    };
  }, [fetchHistory]);

  useEffect(() => {
    if (!Array.isArray(socketHistory) || socketHistory.length === 0) {
      return;
    }

    const normalizedSocketHistory = socketHistory
      .map((item: number | string) => toNumber(item))
      .filter((item: number | null): item is number => item !== null)
      .slice(0, HISTORY_LIMIT);

    if (normalizedSocketHistory.length > 0) {
      setHistory(normalizedSocketHistory);
    }
  }, [socketHistory]);

  const filteredHistory = useMemo(() => {
    if (filter === "low") return history.filter((item) => item < 2);
    if (filter === "mid") return history.filter((item) => item >= 2 && item < 10);
    if (filter === "high") return history.filter((item) => item >= 10);
    return history;
  }, [history, filter]);

  const topMultipliers = useMemo(() => {
    return [...history].sort((a, b) => b - a).slice(0, 5);
  }, [history]);

  return (
    <div className="stats">
      <div className="payouts-wrapper">
        <div className="payouts-block">
          {!!filteredHistory.length &&
            filteredHistory.slice(0, 20).map((item, key) => (
              <div key={key} className="payout">
                <div className={`item opacity-${100 - 2 * key} ${Number(item) < 2 ? "blue" : Number(item) < 10 ? "purple" : "big"}`}>
                  {Number(item).toFixed(2)}x
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="button-block" onClick={() => setShowHistory(!showHistory)}>
        <div className="button dropdown-toggle">
          <div className="trigger">
            <div className="history-icon"></div>
            <div className={`dd-icon ${showHistory ? "up" : ""}`}></div>
          </div>
        </div>
      </div>

      {!!showHistory && (
        <div className="dropdown-menu">
          <div className="wrapper">
            <div className="header-2">
              <div>Round History</div>
            </div>

            <div className="history-filter-row">
              <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>
              <button className={filter === "low" ? "active" : ""} onClick={() => setFilter("low")}>{"<2x"}</button>
              <button className={filter === "mid" ? "active" : ""} onClick={() => setFilter("mid")}>2x-10x</button>
              <button className={filter === "high" ? "active" : ""} onClick={() => setFilter("high")}>{">=10x"}</button>
            </div>

            <div className="top-multipliers">
              <span className="label">Top:</span>
              {topMultipliers.map((item, idx) => (
                <span key={idx} className={`top-chip ${item < 2 ? "blue" : item < 10 ? "purple" : "big"}`}>
                  {item.toFixed(2)}x
                </span>
              ))}
            </div>

            <div className="payouts-block">
              {!!filteredHistory.length &&
                filteredHistory.slice(0, 160).map((item, key) => (
                  <div key={key} className="payout">
                    <div className={`bubble-multiplier ${Number(item) < 2 ? "blue" : Number(item) < 10 ? "purple" : "big"}`}>
                      {Number(item).toFixed(2)}x
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
