import React, { useState } from "react";
import { formatCurrency, runAudits } from "../financialCalculations";

export default function AuditCenter({ transactions }) {
  const { warnings, errors, total } = runAudits(transactions);
  const [filterSeverity, setFilterSeverity] = useState("all");

  const allAudits = [...errors, ...warnings];
  
  const filteredAudits = allAudits.filter((audit) => {
    if (filterSeverity === "all") return true;
    return audit.severity === filterSeverity;
  });

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      
      {/* Audit Stats Dashboard */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr", gap: "32px" }}>
        
        {/* Left: Audit Gauge Card */}
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "32px" }}>
          <div style={{ position: "relative", width: "120px", height: "120px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
            {/* Custom Circular SVG Progress */}
            <svg width="100%" height="100%" viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--border)"
                strokeWidth="2.5"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={errors.length > 0 ? "var(--error)" : warnings.length > 0 ? "var(--warning)" : "var(--success)"}
                strokeWidth="2.5"
                strokeDasharray={`${Math.max(0, 100 - total * 10)}, 100`}
              />
            </svg>
            <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: "28px", fontWeight: "700", color: "white" }}>{Math.max(0, 100 - total * 10)}%</span>
              <span style={{ fontSize: "10px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Здоровье Базы</span>
            </div>
          </div>

          <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>Авто-аудит Google Sheets</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.5" }}>
            На основе структуры двойной записи, ограничений счетов и лимитов категорий.
          </p>
        </div>

        {/* Right: Breakdown summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          
          <div className="card card-hover" onClick={() => setFilterSeverity("error")} style={{ cursor: "pointer", borderBottom: filterSeverity === "error" ? "3px solid var(--error)" : "1px solid var(--border)" }}>
            <h4 style={{ fontSize: "14px", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
              Критично
              <span className="badge badge-error">{errors.length}</span>
            </h4>
            <h2 style={{ fontSize: "36px", marginTop: "12px", color: "var(--error)" }}>{errors.length}</h2>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Угрожает сходимости отчетов</p>
          </div>

          <div className="card card-hover" onClick={() => setFilterSeverity("warning")} style={{ cursor: "pointer", borderBottom: filterSeverity === "warning" ? "3px solid var(--warning)" : "1px solid var(--border)" }}>
            <h4 style={{ fontSize: "14px", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
              Замечания
              <span className="badge badge-warning">{warnings.length}</span>
            </h4>
            <h2 style={{ fontSize: "36px", marginTop: "12px", color: "var(--warning)" }}>{warnings.length}</h2>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Дубли или пустые ячейки</p>
          </div>

          <div className="card card-hover" onClick={() => setFilterSeverity("all")} style={{ cursor: "pointer", borderBottom: filterSeverity === "all" ? "3px solid var(--primary)" : "1px solid var(--border)" }}>
            <h4 style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Всего ошибок</h4>
            <h2 style={{ fontSize: "36px", marginTop: "12px" }}>{total}</h2>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Найдено аномалий всего</p>
          </div>

        </div>

      </div>

      {/* Audit Logs Table */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "18px" }}>Реестр замечаний и расхождений</h3>
          <div style={{ display: "flex", gap: "8px" }}>
            {["all", "error", "warning", "info"].map((sev) => (
              <button
                key={sev}
                className={`btn ${filterSeverity === sev ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: "6px 12px", fontSize: "12px", borderRadius: "20px" }}
                onClick={() => setFilterSeverity(sev)}
              >
                {sev === "all" ? "Все" : sev === "error" ? "Ошибки" : sev === "warning" ? "Предупреждения" : "Инфо"}
              </button>
            ))}
          </div>
        </div>

        <div className="table-container">
          <table className="fin-table">
            <thead>
              <tr>
                <th style={{ width: "100px" }}>Дата</th>
                <th style={{ width: "120px" }}>Уровень</th>
                <th style={{ width: "220px" }}>Тип Проверки</th>
                <th>Описание проблемы</th>
                <th>Рекомендуемое действие (Fix)</th>
              </tr>
            </thead>
            <tbody>
              {filteredAudits.length > 0 ? (
                filteredAudits.map((audit) => {
                  const isErr = audit.severity === "error";
                  const isWarn = audit.severity === "warning";
                  return (
                    <tr key={audit.id}>
                      <td style={{ color: "var(--text-secondary)" }}>{audit.date || "-"}</td>
                      <td>
                        <span className={`badge ${isErr ? 'badge-error' : isWarn ? 'badge-warning' : 'badge-info'}`}>
                          {isErr ? "Критическая" : isWarn ? "Замечание" : "Инфо"}
                        </span>
                      </td>
                      <td style={{ fontWeight: "600", color: "white" }}>{audit.title}</td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.4" }}>{audit.message}</td>
                      <td style={{ color: "var(--primary)", fontSize: "13px", lineHeight: "1.4" }}>
                        {audit.type === "negative_balance" && "Проверьте дату операции. Возможно, платеж заведен раньше поступления средств, или не дозаведена часть доходов в Google Sheet."}
                        {audit.type === "duplicate_transaction" && "Найдите дублирующую строку в листе 'Operations' в Google Sheet и удалите её, если платеж был один."}
                        {audit.type === "missing_category" && "Укажите финансовую статью из справочника в колонке 'Статья' в Google Sheets для корректного распределения в PnL."}
                        {audit.type === "missing_counterparty" && "Добавьте контрагента в Google Sheets для корректной сверки в актах взаиморасчетов."}
                        {audit.type === "outlier_amount" && "Убедитесь в корректности разряда числа (не добавился ли лишний ноль к сумме операции в Sheets)."}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>
                    Замечаний с выбранным фильтром не найдено.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
