import React from "react";
import { formatCurrency, getCategoryType, getMonthsList, getMonthNameRU, calculatePnL, calculateCashFlow } from "../financialCalculations";

export default function DashboardOverview({ transactions }) {
  const months = getMonthsList(transactions);
  
  // Calculate Totals
  let totalRevenue = 0;
  let totalExpenses = 0;

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

  const grossProfitSegments = [
    { key: "trade", label: "Торговля", color: "var(--primary)", glow: "rgba(var(--primary-rgb), 0.3)", revenue: 0, cogs: 0, gross: 0 },
    { key: "production", label: "Производство", color: "var(--success)", glow: "rgba(var(--success-rgb), 0.28)", revenue: 0, cogs: 0, gross: 0 },
    { key: "plasma", label: "Плазморез", color: "var(--info)", glow: "rgba(var(--info-rgb), 0.3)", revenue: 0, cogs: 0, gross: 0 },
    { key: "cashback", label: "Кешбек", color: "var(--warning)", glow: "rgba(var(--warning-rgb), 0.28)", revenue: 0, cogs: 0, gross: 0 }
  ];
  const grossProfitBySegment = new Map(grossProfitSegments.map((segment) => [segment.key, { ...segment }]));
  const getGrossProfitSegmentKey = (tx) => {
    const haystack = `${tx.account || ""} ${tx.category || ""} ${tx.description || ""}`.toLowerCase();
    if (/кешбек|кешбэк|cashback/.test(haystack)) return "cashback";
    if (/плазморез|плазм|plasma/.test(haystack)) return "plasma";
    if (/производ|production/.test(haystack)) return "production";
    if (/торгов|trade/.test(haystack)) return "trade";
    return "";
  };

  transactions.forEach((tx) => {
    const segmentKey = getGrossProfitSegmentKey(tx);
    if (!segmentKey) return;

    const segment = grossProfitBySegment.get(segmentKey);
    const amount = Number(tx.amount || 0);
    if (!Number.isFinite(amount) || amount === 0) return;

    const pnlType = tx.pnlGroup || getCategoryType(tx.category);
    if (segmentKey === "cashback") {
      if (pnlType === "otherIncome" || /кешбек|кешбэк|cashback/i.test(tx.category || "")) {
        segment.revenue += tx.type === "Expense" ? -Math.abs(amount) : amount;
      }
      return;
    }

    if (pnlType === "revenue") {
      segment.revenue += amount;
    }
    if (pnlType === "cogs") {
      segment.cogs += amount;
    }
  });
  const grossProfitRows = Array.from(grossProfitBySegment.values()).map((segment) => ({
    ...segment,
    gross: segment.revenue - segment.cogs
  }));
  const maxGrossProfit = Math.max(...grossProfitRows.map((segment) => Math.abs(segment.gross)), 1);

  // SVG Chart Preparation
  const chartWidth = 960;
  const chartHeight = 520;
  const chartTop = 44;
  const chartRight = 28;
  const chartBottom = 92;
  const chartLeft = 82;
  const plotWidth = chartWidth - chartLeft - chartRight;
  const plotHeight = chartHeight - chartTop - chartBottom;
  const chartData = months.map(m => {
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

      return {
        month: m,
        label: getMonthNameRU(m).split(" ")[0],
        year: m.substring(0, 4),
        revenue: rev,
        expenses: exp
      };
    });
  const maxMonthValue = Math.max(...chartData.map(item => Math.max(item.revenue, item.expenses)), 1);
  const axisMax = Math.max(1, Math.ceil(maxMonthValue / 100000) * 100000);
  const formatAxisValue = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M`;
    if (value >= 1000) return `${Math.round(value / 1000)}k`;
    return `${Math.round(value)}`;
  };

  return (
    <div className="animate-fade-in dashboard-page" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "32px", alignItems: "start" }}>
        
        {/* Left: Financial Chart (SVG) */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "22px", padding: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px", flexWrap: "wrap" }}>
            <div>
              <h3 style={{ fontSize: "22px", textWrap: "balance" }}>Динамика доходов и расходов</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px", textWrap: "pretty" }}>
                Ежемесячное сравнение выручки и затрат по данным Google Sheets.
              </p>
            </div>
            <div style={{ display: "flex", gap: "14px", fontSize: "12px", flexWrap: "wrap", paddingTop: "4px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "7px", color: "var(--text-primary)", fontWeight: 700 }}>
                <span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "4px", backgroundColor: "var(--primary)", boxShadow: "0 0 14px rgba(var(--primary-rgb), 0.35)" }}></span>
                Выручка
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "7px", color: "var(--text-primary)", fontWeight: 700 }}>
                <span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "4px", backgroundColor: "var(--error)", boxShadow: "0 0 14px rgba(var(--error-rgb), 0.28)" }}></span>
                Расходы
              </span>
            </div>
          </div>

          <div style={{
            position: "relative",
            width: "100%",
            height: "clamp(320px, 34vw, 390px)",
            padding: "12px",
            borderRadius: "14px",
            background: "linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01))",
            border: "1px solid rgba(255,255,255,0.06)"
          }}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="revenueBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
                <linearGradient id="expenseBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fb7185" />
                  <stop offset="100%" stopColor="#e11d48" />
                </linearGradient>
              </defs>

              {/* Horizontal grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = chartTop + plotHeight - (ratio * plotHeight);
                const axisValue = axisMax * ratio;
                return (
                  <g key={ratio}>
                    <line x1={chartLeft} y1={y} x2={chartWidth - chartRight} y2={y} stroke="rgba(255,255,255,0.075)" strokeWidth="1" strokeDasharray="6 8" />
                    <text x={chartLeft - 14} y={y + 4} fill="var(--text-muted)" fontSize="14" textAnchor="end" fontVariant="tabular-nums">
                      {formatAxisValue(axisValue)}
                    </text>
                  </g>
                );
              })}

              {/* Draw Bar groups for each month */}
              {chartData.map((item, idx) => {
                const groupWidth = plotWidth / Math.max(chartData.length, 1);
                const groupX = chartLeft + idx * groupWidth;
                const incHeight = (item.revenue / axisMax) * plotHeight;
                const expHeight = (item.expenses / axisMax) * plotHeight;
                const barWidth = Math.max(8, Math.min(24, groupWidth * 0.28));
                const gap = Math.max(4, Math.min(8, groupWidth * 0.08));
                const incX = groupX + (groupWidth - (barWidth * 2 + gap)) / 2;
                const expX = incX + barWidth + gap;
                const baseY = chartTop + plotHeight;
                const incY = baseY - incHeight;
                const expY = baseY - expHeight;
                const showMonthLabel = chartData.length <= 18 || idx % 2 === 0;
                const showYearLabel = idx === 0 || item.year !== chartData[idx - 1]?.year;

                return (
                  <g key={item.month}>
                    {/* Income Bar */}
                    <rect
                      x={incX}
                      y={incY}
                      width={barWidth}
                      height={incHeight}
                      fill="url(#revenueBarGradient)"
                      rx="5"
                      opacity="0.95"
                    />
                    {/* Expense Bar */}
                    <rect
                      x={expX}
                      y={expY}
                      width={barWidth}
                      height={expHeight}
                      fill="url(#expenseBarGradient)"
                      rx="5"
                      opacity="0.95"
                    />
                    {/* Month Label */}
                    {showMonthLabel && (
                      <text
                        x={groupX + groupWidth / 2}
                        y={baseY + 24}
                        fill="var(--text-secondary)"
                        fontSize="12"
                        textAnchor="middle"
                      >
                        {item.label}
                      </text>
                    )}
                    {showYearLabel && (
                      <text
                        x={groupX + groupWidth / 2}
                        y={baseY + 46}
                        fill="var(--text-muted)"
                        fontSize="12"
                        fontWeight="700"
                        textAnchor="middle"
                      >
                        {item.year}
                      </text>
                    )}
                  </g>
                );
              })}
              
              {/* Bottom axis line */}
              <line x1={chartLeft} y1={chartTop + plotHeight} x2={chartWidth - chartRight} y2={chartTop + plotHeight} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
            </svg>
          </div>
        </div>

        {/* Right: Balances & Alerts Summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Gross Profit by direction */}
          <div className="card">
            <div style={{ marginBottom: "18px" }}>
              <h3 style={{ fontSize: "18px", textWrap: "balance" }}>Валовая прибыль</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginTop: "4px", textWrap: "pretty" }}>
                По ключевым направлениям бизнеса.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {grossProfitRows.map((segment, idx) => {
                const widthPct = Math.max(3, Math.round((Math.abs(segment.gross) / maxGrossProfit) * 100));

                return (
                  <div key={segment.key} style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", fontSize: "13px" }}>
                      <span style={{ color: "var(--text-primary)", fontWeight: "700" }}>
                        {idx + 1}. {segment.label}
                      </span>
                      <span style={{
                        color: segment.gross < 0 ? "var(--error)" : "white",
                        fontWeight: "800",
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap"
                      }}>
                        {formatCurrency(segment.gross)}
                      </span>
                    </div>
                    <div style={{
                      height: "7px",
                      width: "100%",
                      backgroundColor: "rgba(255,255,255,0.055)",
                      borderRadius: "999px",
                      overflow: "hidden"
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${widthPct}%`,
                        backgroundColor: segment.gross < 0 ? "var(--error)" : segment.color,
                        borderRadius: "999px",
                        boxShadow: `0 0 16px ${segment.gross < 0 ? "rgba(var(--error-rgb), 0.35)" : segment.glow}`
                      }}></div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", color: "var(--text-muted)", fontSize: "11px", fontVariantNumeric: "tabular-nums" }}>
                      <span>Выручка: {formatCurrency(segment.revenue)}</span>
                      {segment.key !== "cashback" && <span>Себестоимость: {formatCurrency(segment.cogs)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
