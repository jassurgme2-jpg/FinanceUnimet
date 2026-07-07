import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AuthGate from './components/AuthGate.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Caught React crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: "40px",
          color: "#f43f5e",
          backgroundColor: "#0b0c10",
          fontFamily: "monospace",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          gap: "20px"
        }}>
          <h2 style={{ color: "#ffffff", fontSize: "24px" }}>⚠️ Произошла ошибка при отрисовке приложения (React Crash)</h2>
          <div style={{ backgroundColor: "rgba(244, 63, 94, 0.08)", border: "1px solid rgba(244, 63, 94, 0.3)", padding: "20px", borderRadius: "8px" }}>
            <strong style={{ color: "#f43f5e" }}>Ошибка: </strong>
            <span style={{ color: "#f3f4f6" }}>{this.state.error?.message || String(this.state.error)}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <strong style={{ color: "#ffffff" }}>Стек вызовов:</strong>
            <pre style={{
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "16px",
              borderRadius: "8px",
              color: "#a1a1aa",
              overflow: "auto",
              fontSize: "13px",
              lineHeight: "1.5",
              maxHeight: "400px"
            }}>
              {this.state.error?.stack || "Нет стека вызовов"}
            </pre>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              width: "fit-content"
            }}
          >
            Перезагрузить страницу
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthGate>
        <App />
      </AuthGate>
    </ErrorBoundary>
  </StrictMode>,
)
