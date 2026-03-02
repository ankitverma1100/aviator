import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const DEFAULT_DEV_GAME_URL = "http://localhost:3000";
const SPORTS_NAV = [
  "Home",
  "Lottery",
  "Cricket",
  "Tennis",
  "Football",
  "Table Tennis",
  "Baccarat",
  "32 Cards",
  "Teenpatti",
  "Poker",
  "Lucky 7",
  "Crash",
];

const LEFT_MENU = [
  {
    title: "Racing Sports",
    items: ["Horse Racing", "Greyhound Racing"],
  },
  {
    title: "Others",
    items: ["Our Casino", "Our VIP Casino", "Our Premium Casino", "Our Virtual"],
  },
  {
    title: "All Sports",
    items: [
      "Politics",
      "Cricket",
      "Football",
      "Tennis",
      "Table Tennis",
      "Badminton",
      "Soccer",
      "Basketball",
      "Volleyball",
      "Snooker",
      "Ice Hockey",
      "E Games",
      "Futsal",
      "Handball",
      "Kabaddi",
      "Golf",
      "Rugby League",
      "Boxing",
      "Beach Volleyball",
      "Mixed Martial Arts",
    ],
  },
];

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
    <div className="consumer-page">
      <header className="consumer-topbar">
        <div className="consumer-brand">BET4WIN</div>
        <div className="consumer-top-actions">
          <button className="consumer-link-btn" type="button" aria-label="Search">
            ⊕
          </button>
          <button className="consumer-link-btn" type="button">
            Rules
          </button>
          <div className="consumer-balance">
            Balance:
            <span>{typeof walletBalance === "number" ? walletBalance.toFixed(0) : "--"}</span>
          </div>
          <div className="consumer-balance">Exp:0</div>
          <div className="consumer-user">{displayUser}</div>
          <button className="consumer-link-btn" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <nav className="consumer-sports-nav">
        {SPORTS_NAV.map((item) => (
          <button key={item} type="button" className={`sports-tab ${item === "Crash" ? "active" : ""}`}>
            {item}
          </button>
        ))}
      </nav>

      <div className="consumer-layout">
        <aside className="consumer-left-menu">
          {LEFT_MENU.map((section) => (
            <div key={section.title} className="menu-section">
              <div className="menu-section-title">{section.title}</div>
              <div className="menu-items">
                {section.items.map((item) => (
                  <button key={item} type="button" className="menu-item">
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <div className="consumer-content">
          <div className="consumer-content-head">
            <h2>Aviator</h2>
            <button className="consumer-exit-btn" type="button" onClick={() => navigate("/dashboard")}>
              EXIT
            </button>
          </div>
          <div className="card frame-wrap consumer-frame">
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

          <div className="consumer-back-row">
            <button className="btn-secondary" type="button" onClick={() => navigate("/dashboard")}>
              Back to Lobby
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
