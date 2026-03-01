import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const FALLBACK_GAME_URL = "http://localhost:3000";

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

function buildIframeUrl(baseUrl, currency, balance) {
  try {
    const url = new URL(baseUrl);
    if (currency) {
      url.searchParams.set("currency", currency);
    }
    if (balance) {
      url.searchParams.set("balance", balance);
    }
    return url.toString();
  } catch {
    return baseUrl;
  }
}

export default function GamePage() {
  const navigate = useNavigate();
  const iframeRef = useRef(null);
  const { logout, validationData } = useAuth();
  const validationPayload = validationData || null;
  const { currency, balance } = getCurrencyAndBalance(validationPayload);
  const gameUrl = buildIframeUrl(FALLBACK_GAME_URL, currency, balance);
  const iframeOrigin = new URL(FALLBACK_GAME_URL).origin;
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
        </div>
        <div className="game-header-actions">
          <div className="wallet-chip">
            {currency || "INR"} {typeof walletBalance === "number" ? walletBalance.toFixed(2) : "--"}
          </div>
          <button className="btn-secondary" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="back-row">
        <button className="btn-secondary" type="button" onClick={() => navigate("/dashboard")}>
          Back
        </button>
      </div>

      <div className="card frame-wrap">
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
      </div>
    </div>
  );
}
