import { useState } from "react";
import { isAuthenticated, markAuthenticated, validateCredentials } from "../auth";

export default function AuthGate({ children }) {
  const [authenticated, setAuthenticated] = useState(isAuthenticated);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const validCredentials = await validateCredentials(login, password);
      if (!validCredentials) {
        setError("Неверный логин или пароль");
        setPassword("");
        return;
      }

      markAuthenticated();
      setAuthenticated(true);
    } finally {
      setLoading(false);
    }
  };

  if (authenticated) return children;

  return (
    <main className="auth-page">
      <section className="auth-card" aria-label="Вход в FinanceFlow">
        <div className="auth-brand">
          <div className="auth-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </div>
          <div>
            <h1>FINANCE.FLOW</h1>
            <span>Private dashboard</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <h2>Вход</h2>
            <p>Введите логин и пароль для доступа к финансовой панели.</p>
          </div>

          <label className="input-group">
            <span className="input-label">Логин</span>
            <input
              className="input-control"
              type="text"
              autoComplete="username"
              required
              value={login}
              onChange={(event) => setLogin(event.target.value)}
            />
          </label>

          <label className="input-group">
            <span className="input-label">Пароль</span>
            <input
              className="input-control"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
            {loading ? "Проверяем..." : "Войти"}
          </button>
        </form>
      </section>
    </main>
  );
}
