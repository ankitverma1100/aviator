import { createContext, useContext, useMemo, useState } from "react";

export const AUTH_TOKEN_KEY = "auth_token";
const GAME_SESSION_KEY = "game";
const AUTH_RESULT_SESSION_KEY = "authResult";
const GAME_URL_SESSION_KEY = "gameUrl";

const AuthContext = createContext(null);

function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

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

function getStoredValidationData() {
  const gameRaw = sessionStorage.getItem(GAME_SESSION_KEY);
  const authResultRaw = sessionStorage.getItem(AUTH_RESULT_SESSION_KEY);
  const gameUrlRaw = sessionStorage.getItem(GAME_URL_SESSION_KEY);

  const game = parseMaybeJson(gameRaw);
  const authResult = parseMaybeJson(authResultRaw);
  const gameUrl = gameUrlRaw || undefined;

  if (!game && !authResult && !gameUrl) {
    return null;
  }

  return { game, authResult, gameUrl };
}

function clearValidationSessionKeys() {
  sessionStorage.removeItem(GAME_SESSION_KEY);
  sessionStorage.removeItem(AUTH_RESULT_SESSION_KEY);
  sessionStorage.removeItem(GAME_URL_SESSION_KEY);
}

function writeValidationSessionKeys(nextData) {
  if (nextData?.game === undefined || nextData?.game === null) {
    sessionStorage.removeItem(GAME_SESSION_KEY);
  } else {
    sessionStorage.setItem(GAME_SESSION_KEY, JSON.stringify(nextData.game));
  }

  if (nextData?.authResult === undefined || nextData?.authResult === null) {
    sessionStorage.removeItem(AUTH_RESULT_SESSION_KEY);
  } else {
    const authResultValue =
      typeof nextData.authResult === "string"
        ? nextData.authResult
        : JSON.stringify(nextData.authResult);
    sessionStorage.setItem(AUTH_RESULT_SESSION_KEY, authResultValue);
  }

  if (nextData?.gameUrl === undefined || nextData?.gameUrl === null) {
    sessionStorage.removeItem(GAME_URL_SESSION_KEY);
  } else {
    sessionStorage.setItem(GAME_URL_SESSION_KEY, String(nextData.gameUrl));
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken);
  const [validationData, setValidationDataState] = useState(getStoredValidationData);

  function login(nextToken) {
    setToken(nextToken);
    localStorage.setItem(AUTH_TOKEN_KEY, nextToken);
  }

  function logout() {
    setToken("");
    setValidationDataState(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    clearValidationSessionKeys();
  }

  function setValidationData(nextData) {
    setValidationDataState(nextData);

    if (!nextData) {
      clearValidationSessionKeys();
      return;
    }

    writeValidationSessionKeys(nextData);
  }

  const value = useMemo(
    () => ({
      token,
      validationData,
      isAuthenticated: Boolean(token),
      login,
      logout,
      setValidationData,
    }),
    [token, validationData]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
