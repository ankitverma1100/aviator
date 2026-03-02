import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const DEFAULT_DEV_GAME_URL = "http://localhost:3000";

function parseMaybeJson(value) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeBalance(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const numeric = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return undefined;
}

function getCurrencyAndBalance(validationData) {
  const parsed = parseMaybeJson(validationData);
  const authResult = parseMaybeJson(parsed?.authResult);
  const candidates = [
    parsed,
    parsed?.wallet,
    parsed?.data,
    parsed?.data?.wallet,
    parsed?.game,
    parsed?.game?.wallet,
    authResult,
    authResult?.wallet,
    authResult?.data,
    authResult?.data?.wallet,
    authResult?.result,
    authResult?.result?.wallet,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const currency =
      typeof candidate.currency === "string" && candidate.currency.trim()
        ? candidate.currency
        : "";
    const balance = normalizeBalance(candidate.balance);

    if (currency || typeof balance === "number") {
      return { currency, balance: typeof balance === "number" ? String(balance) : "" };
    }
  }

  return { currency: "", balance: "" };
}

function getDisplayUser(validationData) {
  const parsed = parseMaybeJson(validationData);
  const authResult = parseMaybeJson(parsed?.authResult);
  const candidates = [
    parsed,
    parsed?.data,
    parsed?.user,
    parsed?.account,
    authResult,
    authResult?.data,
    authResult?.user,
    authResult?.account,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const name =
      candidate?.userName ||
      candidate?.username ||
      candidate?.userId ||
      candidate?.userID ||
      candidate?.id;
    if (typeof name === "string" && name.trim()) {
      return name.trim();
    }
  }

  return "user";
}

function buildIframeUrl(baseUrl) {
  try {
    const url = new URL(baseUrl);
    return url.toString();
  } catch {
    return baseUrl;
  }
}

function isPrivateOrLocalHost(input) {
  try {
    const host = new URL(input).hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
    if (host.startsWith("10.")) return true;
    if (host.startsWith("192.168.")) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
    return false;
  } catch {
    return false;
  }
}

export default function GamePage() {
  const navigate = useNavigate();
  const iframeRef = useRef(null);
  const { logout, validationData } = useAuth();
  const validationPayload = validationData || null;
  const { currency, balance } = getCurrencyAndBalance(validationPayload);
  const displayUser = getDisplayUser(validationPayload);
  const configuredGameUrl = import.meta.env.VITE_GAME_URL || "";
  const baseGameUrl = import.meta.env.DEV ? (configuredGameUrl || DEFAULT_DEV_GAME_URL) : configuredGameUrl;
  const blockedPrivateTarget = !import.meta.env.DEV && baseGameUrl && isPrivateOrLocalHost(baseGameUrl);
  const gameUrl = baseGameUrl ? buildIframeUrl(baseGameUrl) : "";
  const iframeOrigin = gameUrl ? new URL(gameUrl).origin : window.location.origin;
  const numericBalance = Number(balance);
  const walletBalance = Number.isFinite(numericBalance) ? numericBalance : undefined;
  const [iframeLoaded, setIframeLoaded] = useState(false);

  function syncValidationToIframe() {
    if (!iframeRef.current?.contentWindow || !validationPayload) {
      return;
    }

    iframeRef.current.contentWindow.postMessage(
      {
        type: "VALIDATION_DATA_SYNC",
        payload: validationPayload,
      },
      iframeOrigin
    );

    iframeRef.current.contentWindow.postMessage(
      {
        type: "WALLET_OVERRIDE",
        payload: {
          currency,
          ...(typeof walletBalance === "number" ? { balance: walletBalance } : {}),
        },
      },
      iframeOrigin
    );
  }

  useEffect(() => {
    if (!validationPayload) {
      navigate("/dashboard", { replace: true });
    }
  }, [validationPayload, navigate]);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== iframeOrigin) {
        return;
      }

      const { type } = event.data || {};
      if (type !== "AVIATOR_IFRAME_READY") {
        return;
      }

      syncValidationToIframe();
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [iframeOrigin, validationPayload, currency, walletBalance]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="page game-page">
      <div className="header app-header">
        <div className="header-copy">
          <h2>Aviator</h2>
          <p className="subtle">{displayUser}</p>
        </div>

        <div className="game-header-actions">
          <span className="wallet-chip">
            Balance: {typeof walletBalance === "number" ? walletBalance.toFixed(0) : "--"}{" "}
            {currency || "INR"}
          </span>
          <button className="btn-secondary" type="button" onClick={() => navigate("/dashboard")}>
            Back
          </button>
          <button className="btn-secondary" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="card frame-wrap">
          {!baseGameUrl ? (
            <div className="iframe-loader">
              Missing <code>VITE_GAME_URL</code> for hosted build.
            </div>
          ) : blockedPrivateTarget ? (
            <div className="iframe-loader">
              <div>Blocked private/local iframe target in hosted mode.</div>
              <div>Set <code>VITE_GAME_URL</code> to a public HTTPS game URL.</div>
            </div>
          ) : (
            <>
              {!iframeLoaded ? <div className="iframe-loader">Loading...</div> : null}
              <iframe
                ref={iframeRef}
                src={gameUrl}
                title="Aviator Game"
                loading="lazy"
                onLoad={() => {
                  setIframeLoaded(true);
                  syncValidationToIframe();
                }}
              />
            </>
          )}
      </div>
    </div>
  );
}
