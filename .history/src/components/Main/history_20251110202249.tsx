import React, { useEffect } from "react";
// import { useCrashContext } from "./context";
import Context from "../../context";

export default function History() {

  useEffect(() => {
    fetchHistory();

    // Optional: auto-refresh every 10 seconds
    const interval = setInterval(fetchHistory, 10000);
    return () => clearInterval(interval);
  }, []);
  // const { history } = React.useContext(Context);


    const fetchHistory = async () => {
  console.log("Fetching history...");
  try {
    const res = await fetch("http://localhost:8585/api/game/history");
    const data = await res.json();

    // reverse so newest first
    const latest = data.reverse().slice(0, 15);
    console.log("Latest history data:", latest);

    setHistory(latest);
  } catch (error) {
    console.error("Error loading history:", error);
  }
};

      const [showHistory, setShowHistory] = React.useState(false);
      const [history, setHistory] = React.useState([]);


  // const [showHistory, setShowHistory] = React.useState(false);

  // const history = ["2.67","4","5.66", "10.00", "100.00", "30.00", "1.00", "1.23", "1.99", "99.00", "2.32", "6.54", "54.3", "12.44"]

  return (
    <div className="stats">
      <div className="payouts-wrapper">
        <div className="payouts-block">
          {!!history.length && history.map((item, key) => (
            <div key={key} className="payout">
              <div className={`item opacity-${100 - 2 * key} ${Number(item) < 2 ? "blue" : Number(item) < 10 ? "purple" : "big"}`}>{Number(item).toFixed(2)}x</div>
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
      {!!showHistory && <div className="dropdown-menu">
        <div className="wrapper">
          <div className="header-2">
            <div> Round history </div>
          </div>
          <div className="payouts-block">
            {!!history.length && history.map((item, key) => (key < 123 &&
              <div key={key} className="payout">
                <div className={`bubble-multiplier ${Number(item) < 2 ? "blue" : Number(item) < 10 ? "purple" : "big"}`}>{Number(item).toFixed(2)}x</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      }
    </div>
  );
}
