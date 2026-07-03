import React, { useState } from "react";
import { formatCurrency, getMonthNameRU, calculateCashFlow } from "../financialCalculations";

const DEFAULT_CF_START_DATE = "2025-01-01";
const DEFAULT_CF_END_DATE = "2026-05-29";

const buildMonths = (startDate, endDate) => {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const months = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

  while (cursor <= last) {
    months.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
};

const formatCFValue = (value) => {
  if (value === "") return "";
  const num = Number(value || 0);
  if (Math.abs(num) < 0.5) return "$0";
  return formatCurrency(num);
};

export default function CashFlowReport({ transactions }) {
  const [startDate, setStartDate] = useState(DEFAULT_CF_START_DATE);
  const [endDate, setEndDate] = useState(DEFAULT_CF_END_DATE);

  const months = buildMonths(startDate, endDate);
  const { cashFlowRows = [], monthlyBalances = {}, initialTotal = 0 } = calculateCashFlow(
    transactions,
    months,
    undefined,
    { startDate, endDate }
  );

  const rowByKey = (key) => cashFlowRows.find((row) => row.key === key) || { values: [], total: 0 };
  const netChange = rowByKey("netChange");
  const closing = rowByKey("closing");
  const check = rowByKey("check");
  const lastMonth = months[months.length - 1];
  const endingCash = closing.total || monthlyBalances[lastMonth] || initialTotal;

  const renderSparkline = (points) => {
    const numericPoints = points.filter((p) => typeof p === "number");
    if (numericPoints.length < 2) return null;
    const width = 60;
    const height = 16;
    const maxVal = Math.max(...numericPoints.map(Math.abs), 1);
    const coordinates = numericPoints.map((p, idx) => {
      const x = 2 + (idx * (width - 4)) / (numericPoints.length - 1);
      const y = height - 2 - ((p + maxVal) / (maxVal * 2)) * (height - 4);
      return `${x},${y}`;
    }).join(" ");

    return (
      <svg width={width} height={height}>
        <polyline fill="none" stroke="var(--info)" strokeWidth="1.5" points={coordinates} />
      </svg>
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: "22px" }}>Отчет о движении денежных средств (Cash Flow)</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>
              Кассовый метод по данным листов Деньги р/с и Касса.
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>НАЧАЛО</span>
              <input
                type="date"
                className="input-control"
                style={{ padding: "6px 12px", fontSize: "12px", colorScheme: "dark" }}
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>КОНЕЦ</span>
              <input
                type="date"
                className="input-control"
                style={{ padding: "6px 12px", fontSize: "12px", colorScheme: "dark" }}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          <div className="card" style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>ЧИСТОЕ ИЗМЕНЕНИЕ</span>
            <h3 style={{ fontSize: "20px", marginTop: "4px", color: netChange.total >= 0 ? "var(--success)" : "var(--error)" }}>
              {formatCFValue(netChange.total)}
            </h3>
          </div>
          <div className="card" style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>ДЕНЬГИ НА КОНЕЦ</span>
            <h3 style={{ fontSize: "20px", marginTop: "4px" }}>{formatCFValue(endingCash)}</h3>
          </div>
          <div className="card" style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>ПРОВЕРКА</span>
            <h3 style={{ fontSize: "20px", marginTop: "4px", color: Math.abs(check.total || 0) < 1 ? "var(--success)" : "var(--error)" }}>
              {formatCFValue(check.total)}
            </h3>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-container">
          <table className="fin-table">
            <thead>
              <tr>
                <th style={{ width: "56px", textAlign: "center" }}>№</th>
                <th style={{ minWidth: "310px" }}>Статья (RU)</th>
                <th style={{ minWidth: "260px" }}>Line item (EN)</th>
                <th style={{ width: "80px", textAlign: "center" }}>Тренд</th>
                {months.map((m) => (
                  <th key={m} className="text-right" style={{ minWidth: "110px" }}>
                    {getMonthNameRU(m).split(" ")[0]}
                  </th>
                ))}
                <th className="text-right" style={{ minWidth: "130px", borderLeft: "1px solid var(--border)" }}>Итого</th>
              </tr>
            </thead>
            <tbody>
              {cashFlowRows.map((row) => {
                const values = row.values || [];
                const isNegative = Number(row.total || 0) < 0;
                return (
                  <tr
                    key={row.key}
                    className={row.isHeader ? "header-row" : row.isTotal ? "total-row" : row.isSubtotal ? "subtotal-row" : ""}
                  >
                    <td style={{ textAlign: "center", color: "var(--text-muted)", fontWeight: row.isHeader ? 700 : 500 }}>{row.id}</td>
                    <td style={{ color: row.isHeader ? "white" : "var(--text-primary)", fontWeight: row.isHeader || row.isSubtotal || row.isTotal ? 700 : 500 }}>
                      {row.ru}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "12px" }}>{row.en}</td>
                    <td style={{ textAlign: "center" }}>{row.isHeader ? "" : renderSparkline(values)}</td>
                    {values.map((value, idx) => {
                      const numericValue = Number(value || 0);
                      return (
                        <td
                          key={`${row.key}-${months[idx]}`}
                          className={`text-right ${numericValue > 0 ? "amount-positive" : numericValue < 0 ? "amount-negative" : ""}`}
                          style={{ fontWeight: row.isSubtotal || row.isTotal ? 700 : 500 }}
                        >
                          {formatCFValue(value)}
                        </td>
                      );
                    })}
                    <td
                      className={`text-right ${isNegative ? "amount-negative" : Number(row.total || 0) > 0 ? "amount-positive" : ""}`}
                      style={{ borderLeft: "1px solid var(--border)", fontWeight: 800 }}
                    >
                      {formatCFValue(row.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
