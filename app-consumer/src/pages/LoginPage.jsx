import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import apiClient from "../api/client";

const AUTH_API_URL = "http://168.144.1.126:8080/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiClient.post(
        AUTH_API_URL,
        {
          userId: userId.trim(),
          password,
        },
        {
          responseType: "text",
        }
      );

      const responseText = String(response.data || "").trim();

      if (!responseText) {
        setError("Login succeeded but token was empty.");
        return;
      }

      login(responseText);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const serverMessage =
        typeof err?.response?.data === "string"
          ? err.response.data.trim()
          : err?.response?.data?.message;

      setError(serverMessage || "Unable to connect to login API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <h1>Sign in</h1>
        <p className="subtle">Login using your user ID and password.</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="userId">User ID</label>
            <input
              id="userId"
              className="input"
              type="text"
              autoComplete="username"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="password-wrap">
              <input
                id="password"
                className="input password-input"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M3.27 2 2 3.27l4.1 4.1C4.17 8.9 2.75 10.7 2 12c2.1 3.6 5.8 6 10 6 1.98 0 3.8-.53 5.37-1.44L20.73 20 22 18.73 3.27 2Zm8.73 5c2.76 0 5 2.24 5 5 0 .72-.15 1.4-.43 2.02l-1.54-1.54A3 3 0 0 0 11.52 9l-1.7-1.7c.66-.2 1.4-.3 2.18-.3Zm-7.8 5c1.74-2.35 4.49-4 7.8-4 .44 0 .87.03 1.3.1l-1.66 1.66A3 3 0 0 0 9 12c0 .58.16 1.12.44 1.58L7.9 15.12c-1.46-.74-2.72-1.82-3.7-3.12Zm9.98 5.8L12.9 16.5c-.29.06-.59.1-.9.1-2.76 0-5-2.24-5-5 0-.31.03-.61.1-.9L5.84 9.44C4.63 10.2 3.6 11.2 2.8 12.36 4.32 15 7.03 17 10.2 17c1.37 0 2.66-.38 3.8-1.05Z"
                      fill="currentColor"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 5c4.2 0 7.9 2.4 10 7-2.1 4.6-5.8 7-10 7S4.1 16.6 2 12c2.1-4.6 5.8-7 10-7Zm0 2c-3.1 0-5.9 1.7-7.7 5 1.8 3.3 4.6 5 7.7 5s5.9-1.7 7.7-5c-1.8-3.3-4.6-5-7.7-5Zm0 2.5A2.5 2.5 0 1 1 12 14.5 2.5 2.5 0 0 1 12 9.5Z"
                      fill="currentColor"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          {error ? <p className="error">{error}</p> : null}
        </form>
      </div>
    </div>
  );
}
