import React, { useMemo, useState } from "react";
import {
  BALANCE_REPORT_ROWS,
  calculateBalanceSheet,
  formatCurrency,
  getBalanceSheetMonths,
  getMonthNameRU
} from "../financialCalculations";

export default function BalanceSheet({ transactions, balanceSourceData }) {
  const [periodMode, setPeriodMode] = useState("year");
  const allMonths = useMemo(
    () => getBalanceSheetMonths(transactions, balanceSourceData),
    [transactions, balanceSourceData]
  );
  const periodColumns = useMemo(() => {
    const sourceMonths = allMonths.length ? allMonths : ["2026-06"];

    if (periodMode === "month") {
      return sourceMonths.map((month) => ({
        key: month,
        label: getMonthNameRU(month),
        month
      }));
    }

    const columnsByPeriod = new Map();
    sourceMonths.forEach((month) => {
      const year = month.substring(0, 4);
      const quarter = Math.ceil(Number(month.substring(5, 7)) / 3);
      const key = periodMode === "quarter" ? `${year}-Q${quarter}` : year;
      const label = periodMode === "quarter" ? `${year} Q${quarter}` : year;

      // Months are sorted, so the last month in each year/quarter becomes the balance date.
      columnsByPeriod.set(key, { key, label, month });
    });

    return Array.from(columnsByPeriod.values());
  }, [allMonths, periodMode]);
  const months = periodColumns.map(({ month }) => month);

  const balanceSheet = calculateBalanceSheet(transactions, months, undefined, balanceSourceData);

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
    balanced: true,
    check: 0
  };
  const isFormulaMode = Boolean(latestBS.formulaMode);
  const liabilitiesBarWidth = latestBS.totalAssets
    ? `${Math.max(0, Math.min(50, (latestBS.totalLiabilities / latestBS.totalAssets) * 50))}%`
    : "0%";
  const selectedPeriodLabel = {
    year: "По годам",
    quarter: "По кварталам",
    month: "По месяцам"
  }[periodMode];
  const latestVisibleLabel = periodColumns[periodColumns.length - 1]?.label || "2026";
  const tableMinWidth = periodMode === "year"
    ? "100%"
    : `${Math.max(900, 188 + periodColumns.length * (periodMode === "month" ? 136 : 124))}px`;
  const getRowClassName = (row) => {
    if (row.type === "section") return "header-row";
    if (row.type === "subtotal") return "subtotal-row";
    if (row.type === "total") return "total-row";
    return "";
  };
  const getRowValue = (row, bs) => row.type === "section" ? "" : bs[row.key];
  const renderBalanceValue = (row, value) => {
    if (row.type === "section") return "";
    if (row.type === "check") {
      return Math.abs(Number(value || 0)) < 1 ? "СБАЛАНСИРОВАН" : formatCurrency(value);
    }
    return formatCurrency(value || 0);
  };
  const getValueColor = (row, value) => {
    if (row.type === "check") {
      return Math.abs(Number(value || 0)) < 1 ? "var(--success)" : "var(--error)";
    }
    if (Number(value || 0) < 0) return "var(--error)";
    return undefined;
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Overview stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: periodMode === "month" ? "minmax(0, 1fr)" : "minmax(0, 1.2fr) minmax(320px, 1fr)",
        gap: "32px",
        alignItems: "start"
      }}>
        
        {/* Left: Summary table for all months */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: 0 }}>
          <div>
            <h2 style={{ fontSize: "20px" }}>Балансовый отчет (Balance Sheet)</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>
              Состояние активов, обязательств и капитала на конец каждого отчетного месяца.
            </p>
          </div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "16px",
            padding: "16px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border)"
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Период отчета
              </span>
              <strong style={{ color: "white", fontSize: "15px" }}>{selectedPeriodLabel}</strong>
              <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                {isFormulaMode ? "Расчет по LET-формуле Google Sheets" : "Демо-расчет из операций"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ display: "inline-flex", gap: "4px", padding: "4px", minHeight: "40px", borderRadius: "12px", backgroundColor: "rgba(0, 0, 0, 0.22)", border: "1px solid var(--border)" }}>
                {[
                  { id: "year", label: "Год" },
                  { id: "quarter", label: "Квартал" },
                  { id: "month", label: "Месяц" }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className="btn"
                    style={{
                      minHeight: "32px",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "none",
                      color: periodMode === mode.id ? "white" : "var(--text-secondary)",
                      backgroundColor: periodMode === mode.id ? "var(--primary)" : "transparent",
                      boxShadow: periodMode === mode.id ? "var(--glow-primary)" : "none",
                      transitionProperty: "background-color, color, box-shadow, transform",
                      transitionDuration: "150ms",
                      transitionTimingFunction: "ease"
                    }}
                    onClick={() => setPeriodMode(mode.id)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

            </div>
          </div>

          <div className="table-container balance-table-container">
            <table className="fin-table balance-table" style={{ minWidth: tableMinWidth }}>
              <thead>
                <tr>
                  <th>Раздел Баланса</th>
                  {periodColumns.map((period) => (
                    <th key={period.key} className="text-right">
                      {period.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BALANCE_REPORT_ROWS.map((row) => (
                  <tr key={row.key} className={getRowClassName(row)}>
                    <td style={{ color: row.type === "section" ? "white" : "var(--text-secondary)", fontWeight: row.type ? "700" : "500" }}>
                      <span style={{ display: "inline-block", minWidth: "22px", color: "var(--text-muted)", fontSize: "11px" }}>
                        {row.id}
                      </span>
                      <span>{row.label}</span>
                    </td>
                    {balanceSheet.map((bs, idx) => {
                      const value = getRowValue(row, bs);
                      return (
                        <td
                          key={idx}
                          className="text-right"
                          style={{
                            fontWeight: row.type === "subtotal" || row.type === "total" || row.type === "check" ? "700" : "500",
                            color: getValueColor(row, value),
                            fontSize: row.type === "check" ? "11px" : undefined,
                            textTransform: row.type === "check" ? "uppercase" : undefined
                          }}
                        >
                          {renderBalanceValue(row, value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right side: Detailed Structure View for the latest month */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 }}>
          
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ fontSize: "16px" }}>Структура баланса на {latestVisibleLabel}</h3>
            
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
                  width: liabilitiesBarWidth,
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
                {isFormulaMode && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                      <span style={{ color: "var(--text-secondary)" }}>ТМЗ торговля / производство:</span>
                      <span>{formatCurrency((latestBS.invTrade || 0) + (latestBS.invProd || 0))}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Деловые отходы и лом:</span>
                      <span>{formatCurrency(latestBS.waste || 0)}</span>
                    </div>
                  </>
                )}
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
                {isFormulaMode && (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Связанные стороны:</span>
                    <span>{formatCurrency((latestBS.relLiability || 0) - (latestBS.relAsset || 0))}</span>
                  </div>
                )}
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
