/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useRef } from "react";
import "../../../components/Crash/crash.scss";
import Unity from "react-unity-webgl";
import Context from "../../../context";
import { appConfig } from "../../../shared/config/appConfig";
import { postLastRoundWinner } from "../services/crashApi";
import {
  createCrashRealtimeConnection,
  extractRoundUsers,
  mapRoundEvent,
  mergeRoundEventRows,
  type CrashConnectionStatus,
  type CrashPayload,
} from "../services/crashRealtime";

const MULTIPLIER_SOCKET_URL = appConfig.game.multiplierWsUrl;
const MULTIPLIER_TOPIC = appConfig.game.multiplierTopic;
const ROUND_TOPIC_PREFIX = "/topic/round:";

export default function CrashBoard() {
  const {
    myUnityContext,
    unityLoading,
    setCurrentTarget,
    GameState,
    roundId,
    roundEvent,
    currentSecondNum,
    applyRoundTick,
    bettedUsers,
    setBettedUsers,
    setPreviousHand,
    setPreviousRoundResult,
    roundStats,
  } = React.useContext(Context);

  const [connectionStatus, setConnectionStatus] = React.useState<CrashConnectionStatus>("CONNECTING");
  const [showCrashOverlay, setShowCrashOverlay] = React.useState(false);
  const [showCrashedText, setShowCrashedText] = React.useState(false);
  const [unityDomReady, setUnityDomReady] = React.useState(false);

  const previousGameStateRef = useRef<string>("BET");
  const startAudioRef = useRef<HTMLAudioElement | null>(null);
  const crashAudioRef = useRef<HTMLAudioElement | null>(null);
  const cashoutAudioRef = useRef<HTMLAudioElement | null>(null);
  const crashOverlayTimerRef = useRef<number | null>(null);
  const roundDataClearTimerRef = useRef<number | null>(null);
  const lastMultiplierRoundIdRef = useRef<string>("");
  const lastCrashRoundIdRef = useRef<string>("");
  const lastWinnerFetchRoundIdRef = useRef<string>("");
  const sawCrashWithoutRoundRef = useRef(false);
  const lastHistoryRefreshRoundIdRef = useRef<string>("");

  const isSfxEnabled = useMemo(() => {
    const saved = localStorage.getItem("aviator-sfx-enabled");
    return saved !== "false";
  }, []);

  const stageEffectClass = useMemo(() => {
    if (roundEvent !== "RUNNING") return "";
    if (currentSecondNum >= 10) return "danger";
    if (currentSecondNum >= 4) return "hot";
    return "steady";
  }, [roundEvent, currentSecondNum]);

  const topCashout = useMemo(() => {
    if (!bettedUsers?.length) return 0;
    return Math.max(...bettedUsers.map((item) => Number(item.cashOut || 0)));
  }, [bettedUsers]);
  const unityRoundToken = useMemo(() => {
    if (roundEvent === "RUNNING") return 2;
    if (roundEvent === "CRASHED") return 5;
    return 1;
  }, [roundEvent]);

  const playSound = (ref: React.MutableRefObject<HTMLAudioElement | null>) => {
    if (!isSfxEnabled || !ref.current) return;
    ref.current.currentTime = 0;
    ref.current.play().catch(() => {
      // Browser autoplay restrictions.
    });
  };

  const triggerCrashNotification = React.useCallback(() => {
    if (crashAudioRef.current) {
      crashAudioRef.current.volume = 0.95;
      crashAudioRef.current.playbackRate = 1.12;
    }
    playSound(crashAudioRef);
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([80, 40, 120]);
    }
    setShowCrashOverlay(true);
    setShowCrashedText(true);
    if (crashOverlayTimerRef.current) {
      window.clearTimeout(crashOverlayTimerRef.current);
    }
    crashOverlayTimerRef.current = window.setTimeout(() => {
      setShowCrashOverlay(false);
      setShowCrashedText(false);
      crashOverlayTimerRef.current = null;
    }, 1800);
  }, [isSfxEnabled]);

  useEffect(() => {
    startAudioRef.current = new Audio("/sound/take_off.mp3");
    crashAudioRef.current = new Audio("/sound/cashout.mp3");
    cashoutAudioRef.current = new Audio("/sound/main.wav");
    if (startAudioRef.current) startAudioRef.current.volume = 0.4;
    if (crashAudioRef.current) crashAudioRef.current.volume = 0.55;
    if (cashoutAudioRef.current) cashoutAudioRef.current.volume = 0.25;
  }, []);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      setUnityDomReady(true);
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    setConnectionStatus("CONNECTING");
    let connection = createCrashRealtimeConnection(
      {
        brokerUrl: MULTIPLIER_SOCKET_URL,
        multiplierTopic: MULTIPLIER_TOPIC,
        roundTopicPrefix: ROUND_TOPIC_PREFIX,
      },
      {
        onConnectionStatusChange: setConnectionStatus,
        onRawMessage: (source, rawMessage) => {
          console.log(`${source} topic raw message:`, rawMessage);
        },
        onRoundPayload: (payload: CrashPayload) => {
          console.log("Round topic payload:", payload);
          const mappedUsers = extractRoundUsers(payload);
          if (mappedUsers && typeof setBettedUsers === "function") {
            setBettedUsers(mappedUsers);
            if (roundDataClearTimerRef.current) {
              window.clearTimeout(roundDataClearTimerRef.current);
              roundDataClearTimerRef.current = null;
            }
          } else {
            const mappedEvent = mapRoundEvent(payload);
            if (mappedEvent && typeof setBettedUsers === "function") {
              setBettedUsers((prev: any[]) => mergeRoundEventRows(prev, mappedEvent));
              if (roundDataClearTimerRef.current) {
                window.clearTimeout(roundDataClearTimerRef.current);
                roundDataClearTimerRef.current = null;
              }
            }
          }

          const normalizedState = payload.state?.toUpperCase();
          if (normalizedState === "CRASHED") {
            if (typeof setBettedUsers === "function") {
              setBettedUsers([]);
            }
          }

          applyRoundTick(payload);
        },
        onMultiplierPayload: (payload: CrashPayload) => {
          const normalizedState = payload.state?.toUpperCase();
          if (normalizedState === "BETTING") {
            sawCrashWithoutRoundRef.current = false;
          }
          if (normalizedState === "CRASHED") {
            const crashedRoundId = String(payload.roundId || "").trim();
            if (crashedRoundId && crashedRoundId !== lastWinnerFetchRoundIdRef.current) {
              lastWinnerFetchRoundIdRef.current = crashedRoundId;
              void postLastRoundWinner(crashedRoundId)
                .then((result) => {
                  console.log("last-round-winner response:", result);
                  if (typeof setPreviousHand === "function") {
                    const responseBody = result?.body as any;
                    const winnerRows = Array.isArray(responseBody?.data) ? responseBody.data : [];
                    const crashedValue = Number(responseBody?.crashed);
                    if (typeof setPreviousRoundResult === "function") {
                      setPreviousRoundResult(Number.isFinite(crashedValue) ? crashedValue : null);
                    }
                    const mappedRows = winnerRows.map((item: any) => ({
                      id: String(item?.id || ""),
                      name: String(item?.userId || item?.user || "player"),
                      avatar: "./avatars/av-5.png",
                      betAmount: Number(item?.amount || 0),
                      target: Number(item?.settledMultiplier || item?.cashoutAt || 0),
                      cashOut: Number(item?.winAmount || 0),
                      cashouted: String(item?.status || "").toUpperCase() === "CASHED_OUT",
                      roundId: String(item?.roundId || ""),
                      createdAt: item?.createdAt,
                      roundCrash: Number.isFinite(crashedValue) ? crashedValue : undefined,
                    }));
                    setPreviousHand(mappedRows);
                  }
                })
                .catch((error) => {
                  console.log("last-round-winner error:", error);
                });
            }

            if (typeof setBettedUsers === "function") {
              setBettedUsers([]);
            }
            if (payload.roundId) {
              if (lastCrashRoundIdRef.current !== payload.roundId) {
                lastCrashRoundIdRef.current = payload.roundId;
                triggerCrashNotification();
              }
            } else if (!sawCrashWithoutRoundRef.current) {
              sawCrashWithoutRoundRef.current = true;
              triggerCrashNotification();
            }
          }

          if (payload.roundId) {
            const nextRoundId = String(payload.roundId).trim();
            if (nextRoundId && nextRoundId !== lastMultiplierRoundIdRef.current) {
              if (lastMultiplierRoundIdRef.current && typeof setBettedUsers === "function") {
                if (roundDataClearTimerRef.current) {
                  window.clearTimeout(roundDataClearTimerRef.current);
                }
                roundDataClearTimerRef.current = window.setTimeout(() => {
                  setBettedUsers([]);
                  roundDataClearTimerRef.current = null;
                }, 3000);
              }

              lastMultiplierRoundIdRef.current = nextRoundId;
              connection.subscribeToRound(nextRoundId);
            }
          }

          applyRoundTick(payload);
        },
      }
    );

    connection.connect();

    return () => {
      if (roundDataClearTimerRef.current) {
        window.clearTimeout(roundDataClearTimerRef.current);
        roundDataClearTimerRef.current = null;
      }
      connection.disconnect();
    };
  }, [applyRoundTick, setBettedUsers, setPreviousHand, setPreviousRoundResult, triggerCrashNotification]);

  useEffect(() => {
    if (previousGameStateRef.current !== GameState) {
      window.dispatchEvent(
        new CustomEvent("aviator-round-transition", {
          detail: { from: previousGameStateRef.current, to: GameState, at: Date.now() },
        })
      );
      if (GameState === "PLAYING" && previousGameStateRef.current === "BET") {
        playSound(startAudioRef);
      }
      if (GameState === "BET" && previousGameStateRef.current === "GAMEEND") {
        playSound(cashoutAudioRef);
      }
      previousGameStateRef.current = GameState;
    }
  }, [GameState]);

  useEffect(() => {
    return () => {
      if (crashOverlayTimerRef.current) {
        window.clearTimeout(crashOverlayTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (roundEvent !== "BETTING") return;
    if (crashOverlayTimerRef.current) {
      window.clearTimeout(crashOverlayTimerRef.current);
      crashOverlayTimerRef.current = null;
    }
    setShowCrashOverlay(false);
    setShowCrashedText(false);
  }, [roundEvent]);

  useEffect(() => {
    if (roundEvent !== "BETTING") return;
    const currentRoundId = String(roundId || "");
    if (!currentRoundId || lastHistoryRefreshRoundIdRef.current === currentRoundId) {
      return;
    }

    lastHistoryRefreshRoundIdRef.current = currentRoundId;
    window.dispatchEvent(new CustomEvent("aviator-refresh-history"));
  }, [roundEvent, roundId]);

  useEffect(() => {
    if (roundEvent === "RUNNING") {
      setCurrentTarget(currentSecondNum);
    } else if (roundEvent === "BETTING") {
      setCurrentTarget(1);
    }
  }, [roundEvent, currentSecondNum, setCurrentTarget]);

  useEffect(() => {
    if (!unityDomReady || !unityLoading) return;
    myUnityContext?.send(
      "GameManager",
      "RequestToken",
      JSON.stringify({
        gameState: unityRoundToken,
      })
    );
  }, [unityRoundToken, myUnityContext, unityDomReady, unityLoading]);

  return (
    <div className={`crash-container ${stageEffectClass}`}>
      <div className="crash-topline">
        <div className={`socket-pill ${connectionStatus.toLowerCase()}`}>{connectionStatus}</div>
        <div className="round-stats">
          <span>State: {roundEvent}</span>
          <span>Players: {roundStats.players}</span>
          <span>Bet: {roundStats.totalBet.toFixed(2)}</span>
          <span>Payout: {roundStats.totalCashOut.toFixed(2)}</span>
          <span>Top: {topCashout.toFixed(2)}</span>
        </div>
      </div>

      {connectionStatus !== "CONNECTED" && (
        <div className="reconnect-banner">Connection unstable. Reconnecting live round feed...</div>
      )}

      <div className="flight-motion" aria-hidden="true" />

      <div className={`canvas ${roundEvent === "CRASHED" || showCrashOverlay ? "canvas-crashed" : ""}`}>
        {unityDomReady ? (
          <Unity unityContext={myUnityContext} matchWebGLToCanvasSize={true} />
        ) : (
          <div className="unity-canvas-placeholder" aria-hidden="true" />
        )}
      </div>

      {unityLoading && (
        <div className="crash-text-container">
          <div className="crashtext">
            {roundEvent === "CRASHED" || showCrashedText ? (
              <>
                <div className="flew-away">FLEW AWAY!</div>
                <div className="flew-away-value">{Number(currentSecondNum).toFixed(2)}x</div>
              </>
            ) : roundEvent === "BETTING" ? (
              <div className="round-loading-screen">
                <div className="brand-row">
                  <span className="aviator-mark">Aviator</span>
                </div>
                <div className="loader-track">
                  <div className="loader-fill"></div>
                </div>
              </div>
            ) : (
              <div>
                {Number(currentSecondNum).toFixed(2)} <span className="font-[900]">x</span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
