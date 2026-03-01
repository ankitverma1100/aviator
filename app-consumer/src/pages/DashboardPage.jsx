import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import apiClient from "../api/client";

const API_BASE_URL = "https://games.rolex247.net";
const OPERATOR_ID = "1234";
const GAME_ID = "1234";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { logout, token, setValidationData } = useAuth();
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState("");

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  async function handleGameClick() {
    if (!token) {
      setError("Missing login token. Please login again.");
      return;
    }

    setError("");
    setValidating(true);

    try {
      const validateUrl = `${API_BASE_URL}/connect/validate/${encodeURIComponent(token)}/${OPERATOR_ID}/${GAME_ID}`;
      const response = await apiClient.get(validateUrl);

      const payload =
        typeof response.data === "string" ? JSON.parse(response.data) : response.data;

      setValidationData(payload);
      navigate("/game/aviator");
    } catch (err) {
      const message =
        typeof err?.response?.data === "string"
          ? err.response.data.trim()
          : err?.response?.data?.message;

      setError(message || "Unable to validate game right now.");
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="page dashboard-page">
      <div className="header app-header">
        <div className="header-copy">
          <h2>Dashboard</h2>
        </div>
        <button className="btn-secondary" type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="icon-grid game-grid">
        <button
          className="card game-tile"
          type="button"
          aria-label="Open Aviator game"
          onClick={handleGameClick}
          disabled={validating}
        >
          <img
            className="game-icon-img"
            src="https://www.playcasinos.ca/wp-content/uploads/2022/04/Aviator-game-logo-500x500-1.webp"
            alt="Aviator icon"
          />
          <div className="tile-overlay">
            <h3>Aviator</h3>
            <span className="tile-cta">{validating ? "..." : "Play"}</span>
          </div>
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
