import React from "react";
import { formatCurrency, getMonthsList, getMonthNameRU, calculatePnL, calculateCashFlow } from "../financialCalculations";

export default function DashboardOverview({ transactions, audits, onNavigateToTab }) {
  const months = getMonthsList(transactions);
  
  // Calculate Totals
  let totalRevenue = 0;
  let totalExpenses = 0;
  let totalCash = 0;

  // Process data using calculations helpers
  const pnlData = calculatePnL(transactions, months);
  const cfData = calculateCashFlow(transactions, months);

  // Accumulate totals across all months
  months.forEach((m) => {
    if (pnlData.revenue) {
      Object.values(pnlData.revenue).forEach((catMap) => {
        totalRevenue += catMap[m] || 0;
      });
    }
    
    const expenseGroups = [
      pnlData.cogs,
      pnlData.distribution,
      pnlData.admin,
      pnlData.otherTax,
      pnlData.finance,
      pnlData.incomeTax
    ];
    
    expenseGroups.forEach(group => {
      if (group) {
        Object.values(group).forEach((catMap) => {
          totalExpenses += catMap[m] || 0;
        });
      }
    });
  });

  const netProfit = totalRevenue - totalExpenses;
  const currentCash = cfData.monthlyBalances[months[months.length - 1]] || cfData.initialTotal;

  // Calculate Account Balances for distribution
  const accountBalances = {};
  // Start with initial balances from our mock model or fallback to 0
  const initialAccounts = {
    "Р/С Альфа-Банк": 1200000,
    "Р/С Сбербанк": 850000,
    "Касса Офис": 50000
  };
  
  // Process real account names in transactions
  transactions.forEach((tx) => {
    const acc = tx.account || "Не указан";
    if (!accountBalances[acc]) {
      accountBalances[acc] = initialAccounts[acc] || 0;
    }
    const amt = Number(tx.amount || 0);
    if (tx.type === "Income") {
      accountBalances[acc] += amt;
    } else {
      accountBalances[acc] -= amt;
    }
  });

  // SVG Chart Preparation
  const chartHeight = 180;
  const chartWidth = 500;
  const maxMonthValue = Math.max(
    ...months.map(m => {
      let rev = 0;
      let exp = 0;
      if (pnlData.revenue) {
        Object.values(pnlData.revenue).forEach(cat => rev += cat[m] || 0);
      }
      
      const expenseGroups = [
        pnlData.cogs,
        pnlData.distribution,
        pnlData.admin,
        pnlData.otherTax,
        pnlData.finance,
        pnlData.incomeTax
      ];
      
      expenseGroups.forEach(group => {
        if (group) {
          Object.values(group).forEach(cat => exp += cat[m] || 0);
        }
      });
      
      return Math.max(rev, exp);
    }),
    1 // fallback
  );

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* 4 KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px" }}>
        
        {/* Card 1: Revenue */}
        <div className="card card-hover" style={{ borderLeft: "4px solid var(--primary)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: "500" }}>Выручка (Всего)</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <h2 style={{ fontSize: "28px", fontWeight: "700" }}>{formatCurrency(totalRevenue)}</h2>
          <span style={{ fontSize: "12px", color: "var(--success)", display: "flex", alignItems: "center", gap: "4px", marginTop: "8px" }}>
            <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--success)" }}></span>
            Накопленным итогом
          </span>
        </div>

        {/* Card 2: Expenses */}
        <div className="card card-hover" style={{ borderLeft: "4px solid var(--error)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: "500" }}>Расходы (Всего)</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <h2 style={{ fontSize: "28px", fontWeight: "700" }}>{formatCurrency(totalExpenses)}</h2>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px", marginTop: "8px" }}>
            COGS + OPEX + Налоги
          </span>
        </div>

        {/* Card 3: Net Profit */}
        <div className="card card-hover" style={{ borderLeft: `4px solid ${netProfit >= 0 ? "var(--success)" : "var(--error)"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: "500" }}>Чистая прибыль</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={netProfit >= 0 ? "var(--success)" : "var(--error)"} strokeWidth="2">
              <path d="M23 6l-9.5 9.5-5-5L1 18M17 6h6v6"/>
            </svg>
          </div>
          <h2 style={{ fontSize: "28px", fontWeight: "700", color: netProfit >= 0 ? "var(--success)" : "var(--error)" }}>
            {formatCurrency(netProfit)}
          </h2>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "8px", display: "block" }}>
            Рентабельность: <strong style={{ color: "white" }}>{((netProfit / (totalRevenue || 1)) * 100).toFixed(1)}%</strong>
          </span>
        </div>

        {/* Card 4: Cash Balance */}
        <div className="card card-hover" style={{ borderLeft: "4px solid var(--info)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: "500" }}>Остаток денег</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--info)" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <h2 style={{ fontSize: "28px", fontWeight: "700" }}>{formatCurrency(currentCash)}</h2>
          <span style={{ fontSize: "12px", color: "var(--info)", marginTop: "8px", display: "block" }}>
            Всего на расчетных счетах
          </span>
        </div>

      </div>

      {/* Grid: Charts & Audits */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "32px" }}>
        
        {/* Left: Financial Chart (SVG) */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "18px" }}>Динамика доходов и расходов</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Ежемесячное сравнение выручки и затрат</p>
            </div>
            <div style={{ display: "flex", gap: "16px", fontSize: "12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "var(--primary)" }}></span>
                Выручка
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "var(--error)" }}></span>
                Расходы
              </span>
            </div>
          </div>

          <div style={{ position: "relative", width: "100%", height: `${chartHeight + 40}px` }}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`} width="100%" height="100%">
              {/* Horizontal grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = chartHeight - (ratio * chartHeight) + 15;
                return (
                  <g key={idx}>
                    <line x1="40" y1={y} x2={chartWidth - 10} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
                    <text x="5" y={y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="start">
                      {Math.round((maxMonthValue * ratio) / 1000)}k
                    </text>
                  </g>
                );
              })}

              {/* Draw Bar groups for each month */}
              {months.map((m, idx) => {
                const groupWidth = (chartWidth - 50) / months.length;
                const groupX = 40 + idx * groupWidth;
                
                // Get month calculations
                let income = 0;
                let expense = 0;
                if (pnlData.revenue) {
                  Object.values(pnlData.revenue).forEach(cat => income += cat[m] || 0);
                }
                
                const expenseGroups = [
                  pnlData.cogs,
                  pnlData.distribution,
                  pnlData.admin,
                  pnlData.otherTax,
                  pnlData.finance,
                  pnlData.incomeTax
                ];
                
                expenseGroups.forEach(group => {
                  if (group) {
                    Object.values(group).forEach(cat => expense += cat[m] || 0);
                  }
                });

                const incHeight = (income / maxMonthValue) * chartHeight;
                const expHeight = (expense / maxMonthValue) * chartHeight;

                const barWidth = Math.min(18, groupWidth * 0.35);
                const gap = 4;
                const incX = groupX + (groupWidth - (barWidth * 2 + gap)) / 2;
                const expX = incX + barWidth + gap;

                const incY = chartHeight - incHeight + 15;
                const expY = chartHeight - expHeight + 15;

                return (
                  <g key={m}>
                    {/* Income Bar */}
                    <rect
                      x={incX}
                      y={incY}
                      width={barWidth}
                      height={incHeight}
                      fill="var(--primary)"
                      rx="3"
                      opacity="0.95"
                    />
                    {/* Expense Bar */}
                    <rect
                      x={expX}
                      y={expY}
                      width={barWidth}
                      height={expHeight}
                      fill="var(--error)"
                      rx="3"
                      opacity="0.95"
                    />
                    {/* Month Label */}
                    <text
                      x={groupX + groupWidth / 2}
                      y={chartHeight + 32}
                      fill="var(--text-secondary)"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {getMonthNameRU(m).split(" ")[0]}
                    </text>
                  </g>
                );
              })}
              
              {/* Bottom axis line */}
              <line x1="40" y1={chartHeight + 15} x2={chartWidth - 10} y2={chartHeight + 15} stroke="var(--border)" strokeWidth="1" />
            </svg>
          </div>
        </div>

        {/* Right: Balances & Alerts Summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Account Balances */}
          <div className="card">
            <h3 style={{ fontSize: "16px", marginBottom: "16px" }}>Распределение по счетам</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {Object.entries(accountBalances).map(([acc, balance]) => {
                const total = Object.values(accountBalances).reduce((a, b) => a + b, 0);
                const pct = Math.max(0, Math.round((balance / (total || 1)) * 100));
                
                return (
                  <div key={acc} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                      <span style={{ color: "var(--text-primary)", fontWeight: "500" }}>{acc}</span>
                      <span style={{ fontWeight: "600" }}>{formatCurrency(balance)}</span>
                    </div>
                    <div style={{ height: "6px", width: "100%", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${pct}%`,
                        backgroundColor: balance < 0 ? "var(--error)" : acc.includes("Альфа") ? "var(--primary)" : acc.includes("Сбер") ? "var(--success)" : "var(--warning)",
                        borderRadius: "3px"
                      }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit Highlights */}
          <div className="card" style={{ border: audits.errors.length > 0 ? "1px solid rgba(244, 63, 94, 0.3)" : "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Аудит базы данных</span>
              <span className={`badge ${audits.errors.length > 0 ? 'badge-error' : audits.warnings.length > 0 ? 'badge-warning' : 'badge-success'}`}>
                {audits.total} сообщений
              </span>
            </h3>

            {audits.total > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {audits.errors.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", padding: "10px", backgroundColor: "rgba(244, 63, 94, 0.08)", borderRadius: "8px", borderLeft: "3px solid var(--error)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>Критические ошибки: <strong>{audits.errors.length}</strong>. Баланс уходит в минус!</span>
                  </div>
                )}
                
                {audits.warnings.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", padding: "10px", backgroundColor: "rgba(245, 158, 11, 0.08)", borderRadius: "8px", borderLeft: "3px solid var(--warning)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span>Предупреждения: <strong>{audits.warnings.length}</strong> (дубликаты, пропуски категорий).</span>
                  </div>
                )}

                <button 
                  className="btn btn-secondary" 
                  onClick={() => onNavigateToTab("audits")} 
                  style={{ width: "100%", fontSize: "12px", padding: "8px" }}
                >
                  Перейти в Центр Аудита
                </button>
              </div>
            ) : (
              <p style={{ color: "var(--success)", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                База данных Google Sheets проверена. Ошибок не обнаружено!
              </p>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
