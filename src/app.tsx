import React from "react";
import Header from "./components/Header/index";
import BetsUsers from "./components/BetUsers/index";
import Main from "./components/Main";
import propeller from "./assets/images/propeller.png";
import Context from "./context";

function App() {
  const { unityLoading, currentProgress, rechargeState, launchCheckComplete, launchAllowed } =
    React.useContext(Context);

  if (launchCheckComplete && !launchAllowed) {
    return (
      <div className="main-container">
        <div className="recharge">
          <div className="recharge-body">
            <div className="recharge-body-font">Invalid game launch</div>
            <p>This game must be opened from the parent consumer app.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      {!unityLoading && (
        <div className="myloading">
          <div className="loading-container">
            <div className="rotation">
              <img alt="propeller" src={propeller} />
            </div>
            <div className="waiting">
              <div style={{ width: `${currentProgress * 1.111 + 0.01}%` }}></div>
            </div>
            <p>{Number(currentProgress * 1.111 + 0.01).toFixed(2)}%</p>
          </div>
        </div>
      )}

      {rechargeState && (
        <div className="recharge">
          <div className="recharge-body">
            <div className="recharge-body-font">Insufficient balance amount</div>
            <a href="https://induswin.com/#/pages/recharge/recharge">Induswin.com</a>
          </div>
        </div>
      )}

      <Header />
      <div className="game-container">
        <BetsUsers />
        <Main />
      </div>
    </div>
  );
}

export default App;
