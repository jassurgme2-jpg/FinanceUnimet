import React from "react";
import { formatCurrency, getMonthsList, getMonthNameRU, calculateBalanceSheet } from "../financialCalculations";

export default function BalanceSheet({ transactions }) {
  const months = getMonthsList(transactions);
  const balanceSheet = calculateBalanceSheet(transactions, months);

  // Get active balance sheet data at the end of the last selected month
  const latestBS = balanceSheet[balanceSheet.length - 1] || {
    totalCash: 2100000,
    equipment: 0,
    accountsReceivable: 0,
    totalAssets: 2100000,
    accountsPayable: 0,
    outstandingLoan: 0,
    totalLiabilities: 0,
    equity: 2100000,
    balanced: true
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Overview stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "32px" }}>
        
        {/* Left: Summary table for all months */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <h2 style={{ fontSize: "20px" }}>Балансовый отчет (Balance Sheet)</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>
              Состояние активов, обязательств и капитала на конец каждого отчетного месяца.
            </p>
          </div>

          <div className="table-container">
            <table className="fin-table">
              <thead>
                <tr>
                  <th>Раздел Баланса</th>
                  {months.map(m => (
                    <th key={m} className="text-right">
                      {getMonthNameRU(m).split(" ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="header-row">
                  <td style={{ color: "white" }}>1. АКТИВЫ (Assets)</td>
                  {months.map((m, idx) => (
                    <td key={idx} className="text-right"></td>
                  ))}
                </tr>
                <tr>
                  <td style={{ paddingLeft: "24px", color: "var(--text-secondary)" }}>Денежные средства</td>
                  {balanceSheet.map((bs, idx) => (
                    <td key={idx} className="text-right">{formatCurrency(bs.totalCash)}</td>
                  ))}
                </tr>
                <tr>
                  <td style={{ paddingLeft: "24px", color: "var(--text-secondary)" }}>Дебиторская задолженность (А/R)</td>
                  {balanceSheet.map((bs, idx) => (
                    <td key={idx} className="text-right">{formatCurrency(bs.accountsReceivable)}</td>
                  ))}
                </tr>
                <tr>
                  <td style={{ paddingLeft: "24px", color: "var(--text-secondary)" }}>Оборудование и ОС</td>
                  {balanceSheet.map((bs, idx) => (
                    <td key={idx} className="text-right">{formatCurrency(bs.equipment)}</td>
                  ))}
                </tr>
                <tr className="subtotal-row" style={{ color: "var(--info)" }}>
                  <td style={{ paddingLeft: "20px", fontWeight: "600" }}>ИТОГО АКТИВОВ</td>
                  {balanceSheet.map((bs, idx) => (
                    <td key={idx} className="text-right" style={{ fontWeight: "700" }}>{formatCurrency(bs.totalAssets)}</td>
                  ))}
                </tr>

                <tr className="header-row" style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ color: "white" }}>2. ОБЯЗАТЕЛЬСТВА (Liabilities)</td>
                  {months.map((m, idx) => (
                    <td key={idx} className="text-right"></td>
                  ))}
                </tr>
                <tr>
                  <td style={{ paddingLeft: "24px", color: "var(--text-secondary)" }}>Кредиторская задолженность (A/P)</td>
                  {balanceSheet.map((bs, idx) => (
                    <td key={idx} className="text-right">{formatCurrency(bs.accountsPayable)}</td>
                  ))}
                </tr>
                <tr>
                  <td style={{ paddingLeft: "24px", color: "var(--text-secondary)" }}>Заемные средства (Банки)</td>
                  {balanceSheet.map((bs, idx) => (
                    <td key={idx} className="text-right">{formatCurrency(bs.outstandingLoan)}</td>
                  ))}
                </tr>
                <tr className="subtotal-row" style={{ color: "var(--warning)" }}>
                  <td style={{ paddingLeft: "20px", fontWeight: "600" }}>ИТОГО ОБЯЗАТЕЛЬСТВ</td>
                  {balanceSheet.map((bs, idx) => (
                    <td key={idx} className="text-right" style={{ fontWeight: "700" }}>{formatCurrency(bs.totalLiabilities)}</td>
                  ))}
                </tr>

                <tr className="header-row" style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ color: "white" }}>3. СОБСТВЕННЫЙ КАПИТАЛ (Equity)</td>
                  {months.map((m, idx) => (
                    <td key={idx} className="text-right"></td>
                  ))}
                </tr>
                <tr>
                  <td style={{ paddingLeft: "24px", color: "var(--text-secondary)" }}>Нераспределенная прибыль</td>
                  {balanceSheet.map((bs, idx) => (
                    <td key={idx} className="text-right">{formatCurrency(bs.equity)}</td>
                  ))}
                </tr>
                
                <tr className="total-row" style={{ backgroundColor: "rgba(255, 255, 255, 0.03)" }}>
                  <td style={{ fontWeight: "700", color: "white" }}>ИТОГО ПАССИВОВ (Капитал + Обязательства)</td>
                  {balanceSheet.map((bs, idx) => (
                    <td key={idx} className="text-right" style={{ fontWeight: "700" }}>{formatCurrency(bs.totalLiabilities + bs.equity)}</td>
                  ))}
                </tr>

                {/* Validation Equivalence Check */}
                <tr style={{ backgroundColor: "rgba(16, 185, 129, 0.02)" }}>
                  <td style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase" }}>Проверка равенства баланса</td>
                  {balanceSheet.map((bs, idx) => (
                    <td key={idx} className="text-right" style={{ fontSize: "11px", fontWeight: "600", color: bs.balanced ? "var(--success)" : "var(--error)" }}>
                      {bs.balanced ? "СБАЛАНСИРОВАН" : "РАСХОЖДЕНИЕ"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right side: Detailed Structure View for the latest month */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ fontSize: "16px" }}>Структура баланса на {getMonthNameRU(months[months.length - 1] || "2026-06")}</h3>
            
            {/* Visual Balance Bar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-secondary)" }}>
                <span>Активы (100%)</span>
                <span>Обязательства + Капитал (100%)</span>
              </div>
              
              <div style={{ display: "flex", height: "24px", width: "100%", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--border)" }}>
                {/* Assets Bar */}
                <div style={{
                  flex: 1,
                  backgroundColor: "rgba(59, 130, 246, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "white"
                }}>
                  Активы: {formatCurrency(latestBS.totalAssets)}
                </div>
                
                {/* Liabilities + Equity Bar */}
                <div style={{
                  width: `${(latestBS.totalLiabilities / latestBS.totalAssets) * 50}%`,
                  backgroundColor: "rgba(245, 158, 11, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "white"
                }}>
                  Обяз.
                </div>
                
                <div style={{
                  flexGrow: 1,
                  backgroundColor: "rgba(16, 185, 129, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "white"
                }}>
                  Капитал
                </div>
              </div>
            </div>

            {/* Assets List */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
              <strong style={{ fontSize: "14px", color: "white", display: "block", marginBottom: "8px" }}>Состав Активов</strong>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Денежные средства в кассе и банках:</span>
                  <span>{formatCurrency(latestBS.totalCash)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Дебиторская задолженность (клиенты):</span>
                  <span>{formatCurrency(latestBS.accountsReceivable)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Внеоборотные активы (оборудование):</span>
                  <span>{formatCurrency(latestBS.equipment)}</span>
                </div>
              </div>
            </div>

            {/* Liabilities List */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
              <strong style={{ fontSize: "14px", color: "white", display: "block", marginBottom: "8px" }}>Пассивы и Обязательства</strong>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Кредиторская задолженность (поставщики):</span>
                  <span>{formatCurrency(latestBS.accountsPayable)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Долгосрочные кредиты банка:</span>
                  <span>{formatCurrency(latestBS.outstandingLoan)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Собственный капитал компании:</span>
                  <span>{formatCurrency(latestBS.equity)}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
