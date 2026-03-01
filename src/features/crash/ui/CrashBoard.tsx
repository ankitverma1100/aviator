/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useRef } from "react";
import "../../../components/Crash/crash.scss";
import Unity from "react-unity-webgl";
import Context from "../../../context";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { appConfig } from "../../../shared/config/appConfig";

const MULTIPLIER_SOCKET_URL = appConfig.game.multiplierSocketUrl;
const MULTIPLIER_TOPIC = appConfig.game.multiplierTopic;

type ConnectionStatus = "CONNECTING" | "CONNECTED" | "RECONNECTING" | "DISCONNECTED";

export default function CrashBoard() {
  const {
    myUnityContext,
    unityLoading,
    setCurrentTarget,
    GameState,
    roundEvent,
    currentSecondNum,
    applyRoundTick,
    bettedUsers,
    roundStats,
  } = React.useContext(Context);

  const [connectionStatus, setConnectionStatus] = React.useState<ConnectionStatus>("CONNECTING");
  const [showCrashOverlay, setShowCrashOverlay] = React.useState(false);
  const [showCrashedText, setShowCrashedText] = React.useState(false);
  const [unityDomReady, setUnityDomReady] = React.useState(false);

  const stompClient = useRef<Client | null>(null);
  const previousGameStateRef = useRef<string>("BET");
  const startAudioRef = useRef<HTMLAudioElement | null>(null);
  const crashAudioRef = useRef<HTMLAudioElement | null>(null);
  const cashoutAudioRef = useRef<HTMLAudioElement | null>(null);
  const crashOverlayTimerRef = useRef<number | null>(null);
  const lastCrashRoundIdRef = useRef<string>("");
  const sawCrashWithoutRoundRef = useRef(false);

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
    const client = new Client({
      webSocketFactory: () => new SockJS(MULTIPLIER_SOCKET_URL),
      reconnectDelay: 2500,
      debug: () => {},
      onConnect: () => {
        setConnectionStatus("CONNECTED");
        client.subscribe(MULTIPLIER_TOPIC, (msg) => {
          try {
            const payload = JSON.parse(msg.body) as {
              roundId?: string;
              state?: string;
              multiplier?: number;
            };
            const normalizedState = payload.state?.toUpperCase();
            if (normalizedState === "BETTING") {
              sawCrashWithoutRoundRef.current = false;
            }
            if (normalizedState === "CRASHED") {
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
            applyRoundTick(payload);
          } catch {
            console.log("Multiplier topic raw message:", msg.body);
          }
        });
      },
      onWebSocketClose: () => {
        console.error("Multiplier socket disconnected/reconnecting");
        setConnectionStatus("RECONNECTING");
      },
      onWebSocketError: () => {
        setConnectionStatus("RECONNECTING");
      },
      onStompError: () => {
        setConnectionStatus("RECONNECTING");
      },
    });
    stompClient.current = client;
    client.activate();

    return () => {
      setConnectionStatus("DISCONNECTED");
      stompClient.current?.deactivate();
    };
  }, []);

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
          <div className={`crashtext ${(roundEvent === "CRASHED" || showCrashedText) ? "red" : ""}`}>
            {roundEvent === "CRASHED" || showCrashedText ? (
              <>
                <div className="flew-away">CRASHED</div>
                <div className="round-loading">ROUND LOADING</div>
              </>
            ) : roundEvent === "BETTING" ? (
              <div className="betting-label">Place your bets</div>
            ) : (
              <div>
                {Number(currentSecondNum).toFixed(2)} <span className="font-[900]">x</span>
              </div>
            )}
          </div>
        </div>
      )}

      {showCrashOverlay && (
        <div className="crash-overlay">
          <div className="crash-descent-trail" aria-hidden="true"></div>
          <div className="crash-impact-ring" aria-hidden="true"></div>
          <div className="crash-impact-ring second" aria-hidden="true"></div>
          <div className="crash-impact-zone" aria-hidden="true">
            <div className="crash-smoke"></div>
            <div className="crash-smoke second"></div>
            <div className="crash-blast"></div>
          </div>
          <div className="overlay-value">{Number(currentSecondNum).toFixed(2)}x</div>
        </div>
      )}
    </div>
  );
}
