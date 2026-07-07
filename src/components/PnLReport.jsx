import React, { useState } from "react";
import { formatCurrency, getMonthNameRU } from "../financialCalculations";

const DEFAULT_PNL_START_DATE = "2024-10-01";
const DEFAULT_PNL_END_DATE = "2026-05-31";

export default function PnLReport({ transactions }) {
  // Get date bounds
  const txDates = transactions.map(t => t.date).filter(Boolean).sort();
  const minTxDate = txDates[0] || "2026-01-01";
  const maxTxDate = txDates[txDates.length - 1] || "2026-06-30";

  // Filter and input states
  const [filterMode, setFilterMode] = useState("all"); // "all", "asOf", "month", "day", "range"
  const [targetDate, setTargetDate] = useState(DEFAULT_PNL_END_DATE);
  const [startDate, setStartDate] = useState(DEFAULT_PNL_START_DATE || minTxDate);
  const [endDate, setEndDate] = useState(DEFAULT_PNL_END_DATE || maxTxDate);
  const [typedDate, setTypedDate] = useState("");
  const [periodMode, setPeriodMode] = useState("year");

  const [expanded, setExpanded] = useState({
    revenue: true,
    cogs: true,
    distribution: false,
    admin: true,
    otherTax: false,
    otherIncome: false,
    finance: false,
    incomeTax: false
  });

  const toggleSection = (section) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Smart date parsing
  const parseAnyDate = (inputStr, defaultDate = "") => {
    if (!inputStr) return defaultDate;
    
    // Clean string: replace slashes and dashes with dots
    let clean = inputStr.trim().replace(/\//g, ".").replace(/-/g, ".");
    
    // Match YYYY.MM.DD
    let match = clean.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
    if (match) {
      const [_, y, m, d] = match;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    
    // Match DD.MM.YYYY
    match = clean.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (match) {
      const [_, d, m, y] = match;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    
    // Match DD.MM (assume year from defaultDate)
    match = clean.match(/^(\d{1,2})\.(\d{1,2})$/);
    if (match) {
      const [_, d, m] = match;
      const year = defaultDate ? defaultDate.substring(0, 4) : "2026";
      return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // Match YYYY-MM
    match = clean.match(/^(\d{4})\.(\d{1,2})$/);
    if (match) {
      const [_, y, m] = match;
      return `${y}-${m.padStart(2, '0')}-01`;
    }
    
    // Standard YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(inputStr)) {
      return inputStr;
    }
    
    return defaultDate;
  };

  // Russian date formatting
  const formatRussianDate = (dateStr) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || "";
    const [y, m, d] = dateStr.split("-");
    const monthsRU = [
      "января", "февраля", "марта", "апреля", "мая", "июня",
      "июля", "августа", "сентября", "октября", "ноября", "декабря"
    ];
    const monthIdx = parseInt(m, 10) - 1;
    return `${parseInt(d, 10)} ${monthsRU[monthIdx]} ${y} г.`;
  };

  // Day Counter helper
  const getDayCount = (start, end) => {
    if (!start || !end) return 0;
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diff = Math.abs(d2 - d1);
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  // Filter transactions
  const getFilteredTransactions = () => {
    if (!transactions.length) return [];
    
    return transactions.filter(tx => {
      if (!tx.date) return false;
      
      if (filterMode === "asOf") {
        return tx.date <= targetDate;
      }
      if (filterMode === "month") {
        const targetMonth = targetDate.substring(0, 7);
        return tx.date.substring(0, 7) === targetMonth;
      }
      if (filterMode === "day") {
        return tx.date === targetDate;
      }
      if (filterMode === "range") {
        return tx.date >= startDate && tx.date <= endDate;
      }
      return true;
    });
  };

  const filteredTransactions = getFilteredTransactions();
  const filteredTxCount = filteredTransactions.length;

  const getPeriodKey = (dateStr) => {
    if (periodMode === "year") {
      return dateStr.substring(0, 4);
    }
    if (periodMode === "quarter") {
      const quarter = Math.ceil(Number(dateStr.substring(5, 7)) / 3);
      return `${dateStr.substring(0, 4)}-Q${quarter}`;
    }
    return dateStr.substring(0, 7);
  };

  const getPeriodName = (periodKey) => {
    if (periodMode === "year") {
      return periodKey;
    }
    if (periodMode === "quarter") {
      return periodKey.replace("-Q", " Q");
    }
    return getMonthNameRU(periodKey);
  };
  const selectedPeriodLabel = {
    year: "По годам",
    quarter: "По кварталам",
    month: "По месяцам"
  }[periodMode];

  const showFullHistory = () => {
    setFilterMode("all");
    setStartDate(minTxDate);
    setEndDate(maxTxDate);
    setTargetDate(maxTxDate);
    setTypedDate("");
  };

  const handlePeriodModeChange = (nextMode) => {
    setPeriodMode(nextMode);
    showFullHistory();
  };

  // Generate periods
  const periods = (() => {
    const pSet = new Set();
    filteredTransactions.forEach((tx) => {
      if (tx.date) {
        pSet.add(getPeriodKey(tx.date));
      }
    });
    return Array.from(pSet).sort();
  })();

  // Helper to dynamically classify category name into custom P&L groups
  const getCategoryType = (catName) => {
    if (!catName) return "admin";
    const name = catName.trim();
    
    // COGS must run before revenue because "Себестоимость продаж" includes "продаж".
    if (/себестоимость|закупки|сырь|материал|cogs|изготовление|резка/i.test(name) || name === "Себестоимость продаж") {
      return "cogs";
    }
    if (/выручка|реализация|доход|sales|revenue|торговля|производство/i.test(name) || name === "Выручка, нетто без НДС") {
      return "revenue";
    }
    const distCats = ["Ответы агентам", "Бонусы", "Выплаты Ш. Миркомилов", "Выплаты Кичкина", "Бремя от Кичкина", "агент"];
    if (distCats.some(c => name.toLowerCase().includes(c.toLowerCase()))) {
      return "distribution";
    }
    const taxCats = ["НДФЛ", "Налог от процента", "ЕСП", "НДС", "ИНПС", "Налог на дивиденды", "Земельный налог", "налог"];
    if (taxCats.some(c => name.toLowerCase().includes(c.toLowerCase())) && !name.includes("Налог на прибыль")) {
      return "otherTax";
    }
    if (name.includes("Маржа банка по кредиту") || /процент|выплата процентов|комиссия банка|кредит|finance/i.test(name)) {
      return "finance";
    }
    if (name.includes("Налог на прибыль")) {
      return "incomeTax";
    }
    if (/кешбек|излишки|потери|cashback|refund/i.test(name)) {
      return "otherIncome";
    }
    return "admin";
  };

  const getTransactionPnLType = (tx) => {
    return tx.pnlGroup || getCategoryType(tx.category);
  };

  // Aggregate P&L
  const pnl = (() => {
    const data = {
      revenue: {},
      cogs: {},
      distribution: {},
      admin: {},
      otherTax: {},
      otherIncome: {},
      finance: {},
      incomeTax: {}
    };

    // Initialize categories
    transactions.forEach((tx) => {
      if (!tx.category) return;
      const type = getTransactionPnLType(tx);
      if (!data[type]) return;
      
      if (!data[type][tx.category]) {
        data[type][tx.category] = {};
        periods.forEach((p) => {
          data[type][tx.category][p] = 0;
        });
      }
    });

    // Aggregate
    filteredTransactions.forEach((tx) => {
      if (!tx.date || !tx.category) return;
      const period = getPeriodKey(tx.date);
      if (!periods.includes(period)) return;

      const type = getTransactionPnLType(tx);
      const amount = type === "otherIncome" && tx.type === "Expense"
        ? -Math.abs(Number(tx.amount || 0))
        : Number(tx.amount || 0);

      if (data[type] && data[type][tx.category]) {
        data[type][tx.category][period] += amount;
      }
    });

    return data;
  })();

  // Aggregation helpers
  const getCategoryTotal = (catMap) => {
    return Object.values(catMap).reduce((sum, val) => sum + val, 0);
  };

  const getMonthlyTotal = (sectionMap, month) => {
    let total = 0;
    if (!sectionMap) return 0;
    Object.values(sectionMap).forEach((catMap) => {
      total += catMap[month] || 0;
    });
    return total;
  };

  const getSectionTotalAllMonths = (sectionMap) => {
    let total = 0;
    if (!sectionMap) return 0;
    Object.values(sectionMap).forEach((catMap) => {
      total += Object.values(catMap).reduce((a, b) => a + b, 0);
    });
    return total;
  };

  // Sparkline Generator
  const renderSparkline = (points, maxVal) => {
    if (points.length < 2) return null;
    const width = 60;
    const height = 16;
    const padding = 2;
    
    const limit = maxVal || Math.max(...points.map(Math.abs), 1);
    const coordinates = points.map((p, idx) => {
      const x = padding + (idx * (width - padding * 2)) / (points.length - 1);
      const y = height - padding - (Math.abs(p) / limit) * (height - padding * 2);
      return `${x},${y}`;
    }).join(" ");

    return (
      <svg width={width} height={height} style={{ overflow: "visible" }}>
        <polyline
          fill="none"
          stroke="var(--primary)"
          strokeWidth="1.5"
          points={coordinates}
        />
        {points.map((p, idx) => {
          const x = padding + (idx * (width - padding * 2)) / (points.length - 1);
          const y = height - padding - (Math.abs(p) / limit) * (height - padding * 2);
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r="2"
              fill={idx === points.length - 1 ? "var(--primary)" : "transparent"}
            />
          );
        })}
      </svg>
    );
  };

  const formatExpenseValue = (val) => {
    return val > 0 ? `-${formatCurrency(val)}` : formatCurrency(val);
  };

  // Row aggregations
  const monthlyRevenue = periods.map(m => getMonthlyTotal(pnl.revenue, m));
  const totalRevenue = getSectionTotalAllMonths(pnl.revenue);

  const monthlyCOGS = periods.map(m => getMonthlyTotal(pnl.cogs, m));
  const totalCOGS = getSectionTotalAllMonths(pnl.cogs);

  const monthlyGrossProfit = periods.map((m, idx) => monthlyRevenue[idx] - monthlyCOGS[idx]);
  const totalGrossProfit = totalRevenue - totalCOGS;

  const monthlyDistribution = periods.map(m => getMonthlyTotal(pnl.distribution, m));
  const totalDistribution = getSectionTotalAllMonths(pnl.distribution);

  const monthlyAdmin = periods.map(m => getMonthlyTotal(pnl.admin, m));
  const totalAdmin = getSectionTotalAllMonths(pnl.admin);

  const monthlyOtherTax = periods.map(m => getMonthlyTotal(pnl.otherTax, m));
  const totalOtherTax = getSectionTotalAllMonths(pnl.otherTax);

  const monthlyOperatingProfit = periods.map((m, idx) => 
    monthlyGrossProfit[idx] - monthlyDistribution[idx] - monthlyAdmin[idx] - monthlyOtherTax[idx]
  );
  const totalOperatingProfit = totalGrossProfit - totalDistribution - totalAdmin - totalOtherTax;

  const monthlyOtherIncome = periods.map(m => getMonthlyTotal(pnl.otherIncome, m));
  const totalOtherIncome = getSectionTotalAllMonths(pnl.otherIncome);

  const monthlyFinance = periods.map(m => getMonthlyTotal(pnl.finance, m));
  const totalFinance = getSectionTotalAllMonths(pnl.finance);

  const monthlyPBT = periods.map((m, idx) => 
    monthlyOperatingProfit[idx] + monthlyOtherIncome[idx] - monthlyFinance[idx]
  );
  const totalPBT = totalOperatingProfit + totalOtherIncome - totalFinance;

  const monthlyIncomeTax = periods.map(m => getMonthlyTotal(pnl.incomeTax, m));
  const totalIncomeTax = getSectionTotalAllMonths(pnl.incomeTax);

  const monthlyNetProfit = periods.map((m, idx) => monthlyPBT[idx] - monthlyIncomeTax[idx]);
  const totalNetProfit = totalPBT - totalIncomeTax;
  const pnlTableMinWidth = `${Math.max(980, 260 + 80 + periods.length * 118 + 130 + 90)}px`;

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* FILTER PANEL */}
      <div className="card" style={{
        background: "rgba(20, 22, 33, 0.4)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        boxShadow: "var(--glass-shadow)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "700" }}>🛡️ Динамический фильтр PnL по дате</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginTop: "2px" }}>
              Задайте любую дату или диапазон. Система автоматически перестроит структуру отчета.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {[
              { id: "all", label: "Все время" },
              { id: "asOf", label: "На дату (YTD)" },
              { id: "month", label: "За месяц" },
              { id: "day", label: "За день" },
              { id: "range", label: "Интервал" }
            ].map(mode => (
              <button
                key={mode.id}
                className="btn"
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  color: filterMode === mode.id ? "white" : "var(--text-secondary)",
                  backgroundColor: filterMode === mode.id ? "var(--primary)" : "rgba(255, 255, 255, 0.03)",
                  boxShadow: filterMode === mode.id ? "var(--glow-primary)" : "none",
                  cursor: "pointer"
                }}
                onClick={() => setFilterMode(mode.id)}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", paddingTop: "14px", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
          
          {/* Quick manual typing field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>БЫСТРЫЙ ВВОД ДАТЫ</span>
            <input
              type="text"
              placeholder="ДД.ММ.ГГГГ или ДД.ММ"
              className="input-control"
              style={{ padding: "6px 12px", fontSize: "12px", width: "180px", backgroundColor: "rgba(0, 0, 0, 0.25)" }}
              value={typedDate}
              onChange={(e) => {
                setTypedDate(e.target.value);
                const parsed = parseAnyDate(e.target.value, targetDate);
                if (parsed && parsed !== targetDate) {
                  setTargetDate(parsed);
                }
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>РАЗРЕЗ КОЛОНОК</span>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {[
                { id: "year", label: "Год" },
                { id: "quarter", label: "Квартал" },
                { id: "month", label: "Месяц" }
              ].map(mode => (
                <button
                  key={mode.id}
                  className="btn"
                  style={{
                    minHeight: "40px",
                    padding: "8px 14px",
                    fontSize: "12px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: periodMode === mode.id ? "white" : "var(--text-secondary)",
                    backgroundColor: periodMode === mode.id ? "rgba(34, 211, 238, 0.16)" : "rgba(255, 255, 255, 0.03)",
                    boxShadow: periodMode === mode.id ? "0 0 0 1px rgba(34, 211, 238, 0.35)" : "none",
                    cursor: "pointer",
                    transition: "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease"
                  }}
                  onClick={() => handlePeriodModeChange(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {filterMode === "asOf" && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", animation: "fadeIn 0.25s forwards" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>ДАТА ДО</span>
                <input
                  type="date"
                  className="input-control"
                  style={{ padding: "6px 12px", fontSize: "12px", colorScheme: "dark" }}
                  value={targetDate}
                  onChange={(e) => {
                    setTargetDate(e.target.value);
                    setTypedDate(e.target.value.split("-").reverse().join("."));
                  }}
                />
              </div>
              <span className="badge badge-info" style={{ marginTop: "16px" }}>
                📅 До {formatRussianDate(targetDate)}
              </span>
            </div>
          )}

          {filterMode === "month" && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", animation: "fadeIn 0.25s forwards" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>ДАТА В МЕСЯЦЕ</span>
                <input
                  type="date"
                  className="input-control"
                  style={{ padding: "6px 12px", fontSize: "12px", colorScheme: "dark" }}
                  value={targetDate}
                  onChange={(e) => {
                    setTargetDate(e.target.value);
                    setTypedDate(e.target.value.split("-").reverse().join("."));
                  }}
                />
              </div>
              <span className="badge badge-info" style={{ marginTop: "16px" }}>
                📅 Месяц: {getMonthNameRU(targetDate.substring(0, 7))}
              </span>
            </div>
          )}

          {filterMode === "day" && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", animation: "fadeIn 0.25s forwards" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>ДЕНЬ</span>
                <input
                  type="date"
                  className="input-control"
                  style={{ padding: "6px 12px", fontSize: "12px", colorScheme: "dark" }}
                  value={targetDate}
                  onChange={(e) => {
                    setTargetDate(e.target.value);
                    setTypedDate(e.target.value.split("-").reverse().join("."));
                  }}
                />
              </div>
              <span className="badge badge-info" style={{ marginTop: "16px" }}>
                📅 День: {formatRussianDate(targetDate)}
              </span>
            </div>
          )}

          {filterMode === "range" && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", animation: "fadeIn 0.25s forwards" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>НАЧАЛО</span>
                <input
                  type="date"
                  className="input-control"
                  style={{ padding: "6px 12px", fontSize: "12px", colorScheme: "dark" }}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>КОНЕЦ</span>
                <input
                  type="date"
                  className="input-control"
                  style={{ padding: "6px 12px", fontSize: "12px", colorScheme: "dark" }}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <span className="badge badge-info" style={{ marginTop: "16px" }}>
                📊 {getDayCount(startDate, endDate)} дн. ({selectedPeriodLabel})
              </span>
            </div>
          )}

          <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Задействовано транзакций: <strong style={{ color: "var(--primary)" }}>{filteredTxCount}</strong>
            </span>
            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
              Всего в базе: {transactions.length}
            </span>
          </div>

        </div>
      </div>

      {/* KPI SUMMARIES */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
        
        <div className="card card-hover" style={{ display: "flex", gap: "16px", alignItems: "center", padding: "16px 20px" }}>
          <div style={{
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--primary)"
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div>
            <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>Выручка за период</span>
            <h4 style={{ fontSize: "20px", fontWeight: "700", color: "white", marginTop: "4px" }}>{formatCurrency(totalRevenue)}</h4>
          </div>
        </div>

        <div className="card card-hover" style={{ display: "flex", gap: "16px", alignItems: "center", padding: "16px 20px" }}>
          <div style={{
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            backgroundColor: "rgba(6, 182, 212, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--info)"
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div>
            <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>Валовая прибыль</span>
            <h4 style={{ fontSize: "20px", fontWeight: "700", color: "var(--info)", marginTop: "4px" }}>{formatCurrency(totalGrossProfit)}</h4>
          </div>
        </div>

        <div className="card card-hover" style={{ display: "flex", gap: "16px", alignItems: "center", padding: "16px 20px" }}>
          <div style={{
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--success)"
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div>
            <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>Чистая прибыль</span>
            <h4 style={{ fontSize: "20px", fontWeight: "700", color: "var(--success)", marginTop: "4px" }}>{formatCurrency(totalNetProfit)}</h4>
          </div>
        </div>

        <div className="card card-hover" style={{ display: "flex", gap: "16px", alignItems: "center", padding: "16px 20px" }}>
          <div style={{
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--warning)"
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div>
            <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>Рентабельность</span>
            <h4 style={{ fontSize: "20px", fontWeight: "700", color: "var(--warning)", marginTop: "4px" }}>
              {totalRevenue > 0 ? ((totalNetProfit / totalRevenue) * 100).toFixed(1) + "%" : "0.0%"}
            </h4>
          </div>
        </div>

      </div>

      {/* P&L TABLE CARD */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "22px" }}>Отчет о прибылях и убытках (PnL)</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>
              Построен в соответствии с алгоритмом расчета ваших Google таблиц. Отображает доходы, расходы и прибыль по периодам.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setExpanded({
                revenue: true, cogs: true, distribution: true, admin: true,
                otherTax: true, otherIncome: true, finance: true, incomeTax: true
              })}
              style={{ padding: "6px 12px", fontSize: "12px" }}
            >
              Развернуть все
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setExpanded({
                revenue: false, cogs: false, distribution: false, admin: false,
                otherTax: false, otherIncome: false, finance: false, incomeTax: false
              })}
              style={{ padding: "6px 12px", fontSize: "12px" }}
            >
              Свернуть все
            </button>
          </div>
        </div>

        {periods.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            <h3>Нет данных за выбранный период</h3>
            <p style={{ fontSize: "14px", marginTop: "8px" }}>Попробуйте изменить параметры фильтра дат.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="fin-table" style={{ minWidth: pnlTableMinWidth }}>
              <thead>
                <tr>
                  <th style={{ width: "260px" }}>Финансовая статья</th>
                  <th style={{ width: "80px", textAlign: "center" }}>Тренд</th>
                  {periods.map((m) => (
                    <th key={m} className="text-right" style={{ minWidth: "110px" }}>
                      {getPeriodName(m)}
                    </th>
                  ))}
                  <th className="text-right" style={{ minWidth: "130px", borderLeft: "1px solid var(--border)" }}>Итого</th>
                  <th className="text-right" style={{ minWidth: "90px" }}>% Выр.</th>
                </tr>
              </thead>
              <tbody>
                
                {/* Row 1: Выручка */}
                <tr className="header-row" onClick={() => toggleSection("revenue")} style={{ cursor: "pointer" }}>
                  <td>
                    <span style={{ marginRight: "8px", color: "var(--text-muted)", fontSize: "10px" }}>
                      {expanded.revenue ? "▼" : "▶"}
                    </span>
                    Выручка, нетто без НДС
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {renderSparkline(monthlyRevenue)}
                  </td>
                  {monthlyRevenue.map((val, idx) => (
                    <td key={idx} className="text-right amount-positive" style={{ fontWeight: "600" }}>
                      {formatCurrency(val)}
                    </td>
                  ))}
                  <td className="text-right amount-positive" style={{ fontWeight: "700", borderLeft: "1px solid var(--border)" }}>
                    {formatCurrency(totalRevenue)}
                  </td>
                  <td className="text-right" style={{ fontWeight: "600" }}>100%</td>
                </tr>

                {expanded.revenue && Object.entries(pnl.revenue).map(([cat, catMap]) => {
                  const catTotal = getCategoryTotal(catMap);
                  const points = periods.map(m => catMap[m] || 0);
                  return (
                    <tr key={cat}>
                      <td style={{ paddingLeft: "32px", color: "var(--text-secondary)" }}>{cat}</td>
                      <td style={{ textAlign: "center" }}>{renderSparkline(points)}</td>
                      {periods.map(m => (
                        <td key={m} className="text-right">{formatCurrency(catMap[m] || 0)}</td>
                      ))}
                      <td className="text-right" style={{ borderLeft: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                        {formatCurrency(catTotal)}
                      </td>
                      <td className="text-right" style={{ color: "var(--text-muted)" }}>
                        {((catTotal / (totalRevenue || 1)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}

                {/* Row 2: Себестоимость */}
                <tr className="header-row" onClick={() => toggleSection("cogs")} style={{ cursor: "pointer" }}>
                  <td>
                    <span style={{ marginRight: "8px", color: "var(--text-muted)", fontSize: "10px" }}>
                      {expanded.cogs ? "▼" : "▶"}
                    </span>
                    Себестоимость продаж
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {renderSparkline(monthlyCOGS)}
                  </td>
                  {monthlyCOGS.map((val, idx) => (
                    <td key={idx} className="text-right" style={{ fontWeight: "600", color: "var(--error)" }}>
                      {val > 0 ? `-${formatCurrency(val)}` : formatCurrency(val)}
                    </td>
                  ))}
                  <td className="text-right" style={{ fontWeight: "700", borderLeft: "1px solid var(--border)", color: "var(--error)" }}>
                    {totalCOGS > 0 ? `-${formatCurrency(totalCOGS)}` : formatCurrency(totalCOGS)}
                  </td>
                  <td className="text-right" style={{ fontWeight: "600" }}>
                    {((totalCOGS / (totalRevenue || 1)) * 100).toFixed(1)}%
                  </td>
                </tr>

                {expanded.cogs && Object.entries(pnl.cogs).map(([cat, catMap]) => {
                  const catTotal = getCategoryTotal(catMap);
                  const points = periods.map(m => catMap[m] || 0);
                  return (
                    <tr key={cat}>
                      <td style={{ paddingLeft: "32px", color: "var(--text-secondary)" }}>{cat}</td>
                      <td style={{ textAlign: "center" }}>{renderSparkline(points)}</td>
                      {periods.map(m => (
                        <td key={m} className="text-right">{formatExpenseValue(catMap[m] || 0)}</td>
                      ))}
                      <td className="text-right" style={{ borderLeft: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                        {formatExpenseValue(catTotal)}
                      </td>
                      <td className="text-right" style={{ color: "var(--text-muted)" }}>
                        {((catTotal / (totalRevenue || 1)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}

                {/* Row 3: Валовая прибыль */}
                <tr className="subtotal-row" style={{ backgroundColor: "rgba(255, 255, 255, 0.04)" }}>
                  <td style={{ fontWeight: "700" }}>Валовая прибыль</td>
                  <td style={{ textAlign: "center" }}>
                    {renderSparkline(monthlyGrossProfit)}
                  </td>
                  {monthlyGrossProfit.map((val, idx) => (
                    <td key={idx} className={`text-right ${val >= 0 ? "amount-positive" : "amount-negative"}`} style={{ fontWeight: "700" }}>
                      {formatCurrency(val)}
                    </td>
                  ))}
                  <td className={`text-right ${totalGrossProfit >= 0 ? "amount-positive" : "amount-negative"}`} style={{ fontWeight: "800", borderLeft: "1px solid var(--border)" }}>
                    {formatCurrency(totalGrossProfit)}
                  </td>
                  <td className="text-right" style={{ fontWeight: "700" }}>
                    {((totalGrossProfit / (totalRevenue || 1)) * 100).toFixed(1)}%
                  </td>
                </tr>

                {/* Row 4: Коммерческие расходы */}
                <tr className="header-row" onClick={() => toggleSection("distribution")} style={{ cursor: "pointer" }}>
                  <td>
                    <span style={{ marginRight: "8px", color: "var(--text-muted)", fontSize: "10px" }}>
                      {expanded.distribution ? "▼" : "▶"}
                    </span>
                    Коммерческие расходы
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {renderSparkline(monthlyDistribution)}
                  </td>
                  {monthlyDistribution.map((val, idx) => (
                    <td key={idx} className="text-right" style={{ fontWeight: "600", color: "var(--error)" }}>
                      {val > 0 ? `-${formatCurrency(val)}` : formatCurrency(val)}
                    </td>
                  ))}
                  <td className="text-right" style={{ fontWeight: "700", borderLeft: "1px solid var(--border)", color: "var(--error)" }}>
                    {totalDistribution > 0 ? `-${formatCurrency(totalDistribution)}` : formatCurrency(totalDistribution)}
                  </td>
                  <td className="text-right" style={{ fontWeight: "600" }}>
                    {((totalDistribution / (totalRevenue || 1)) * 100).toFixed(1)}%
                  </td>
                </tr>

                {expanded.distribution && Object.entries(pnl.distribution).map(([cat, catMap]) => {
                  const catTotal = getCategoryTotal(catMap);
                  const points = periods.map(m => catMap[m] || 0);
                  return (
                    <tr key={cat}>
                      <td style={{ paddingLeft: "32px", color: "var(--text-secondary)" }}>{cat}</td>
                      <td style={{ textAlign: "center" }}>{renderSparkline(points)}</td>
                      {periods.map(m => (
                        <td key={m} className="text-right">{formatExpenseValue(catMap[m] || 0)}</td>
                      ))}
                      <td className="text-right" style={{ borderLeft: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                        {formatExpenseValue(catTotal)}
                      </td>
                      <td className="text-right" style={{ color: "var(--text-muted)" }}>
                        {((catTotal / (totalRevenue || 1)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}

                {/* Row 5: Административные расходы */}
                <tr className="header-row" onClick={() => toggleSection("admin")} style={{ cursor: "pointer" }}>
                  <td>
                    <span style={{ marginRight: "8px", color: "var(--text-muted)", fontSize: "10px" }}>
                      {expanded.admin ? "▼" : "▶"}
                    </span>
                    Административные расходы
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {renderSparkline(monthlyAdmin)}
                  </td>
                  {monthlyAdmin.map((val, idx) => (
                    <td key={idx} className="text-right" style={{ fontWeight: "600", color: "var(--error)" }}>
                      {val > 0 ? `-${formatCurrency(val)}` : formatCurrency(val)}
                    </td>
                  ))}
                  <td className="text-right" style={{ fontWeight: "700", borderLeft: "1px solid var(--border)", color: "var(--error)" }}>
                    {totalAdmin > 0 ? `-${formatCurrency(totalAdmin)}` : formatCurrency(totalAdmin)}
                  </td>
                  <td className="text-right" style={{ fontWeight: "600" }}>
                    {((totalAdmin / (totalRevenue || 1)) * 100).toFixed(1)}%
                  </td>
                </tr>

                {expanded.admin && Object.entries(pnl.admin).map(([cat, catMap]) => {
                  const catTotal = getCategoryTotal(catMap);
                  const points = periods.map(m => catMap[m] || 0);
                  return (
                    <tr key={cat}>
                      <td style={{ paddingLeft: "32px", color: "var(--text-secondary)" }}>{cat}</td>
                      <td style={{ textAlign: "center" }}>{renderSparkline(points)}</td>
                      {periods.map(m => (
                        <td key={m} className="text-right">{formatExpenseValue(catMap[m] || 0)}</td>
                      ))}
                      <td className="text-right" style={{ borderLeft: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                        {formatExpenseValue(catTotal)}
                      </td>
                      <td className="text-right" style={{ color: "var(--text-muted)" }}>
                        {((catTotal / (totalRevenue || 1)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}

                {/* Row 6: Прочие операционные расходы */}
                <tr className="header-row" onClick={() => toggleSection("otherTax")} style={{ cursor: "pointer" }}>
                  <td>
                    <span style={{ marginRight: "8px", color: "var(--text-muted)", fontSize: "10px" }}>
                      {expanded.otherTax ? "▼" : "▶"}
                    </span>
                    Прочие операционные расходы (налоги)
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {renderSparkline(monthlyOtherTax)}
                  </td>
                  {monthlyOtherTax.map((val, idx) => (
                    <td key={idx} className="text-right" style={{ fontWeight: "600", color: "var(--error)" }}>
                      {val > 0 ? `-${formatCurrency(val)}` : formatCurrency(val)}
                    </td>
                  ))}
                  <td className="text-right" style={{ fontWeight: "700", borderLeft: "1px solid var(--border)", color: "var(--error)" }}>
                    {totalOtherTax > 0 ? `-${formatCurrency(totalOtherTax)}` : formatCurrency(totalOtherTax)}
                  </td>
                  <td className="text-right" style={{ fontWeight: "600" }}>
                    {((totalOtherTax / (totalRevenue || 1)) * 100).toFixed(1)}%
                  </td>
                </tr>

                {expanded.otherTax && Object.entries(pnl.otherTax).map(([cat, catMap]) => {
                  const catTotal = getCategoryTotal(catMap);
                  const points = periods.map(m => catMap[m] || 0);
                  return (
                    <tr key={cat}>
                      <td style={{ paddingLeft: "32px", color: "var(--text-secondary)" }}>{cat}</td>
                      <td style={{ textAlign: "center" }}>{renderSparkline(points)}</td>
                      {periods.map(m => (
                        <td key={m} className="text-right">{formatExpenseValue(catMap[m] || 0)}</td>
                      ))}
                      <td className="text-right" style={{ borderLeft: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                        {formatExpenseValue(catTotal)}
                      </td>
                      <td className="text-right" style={{ color: "var(--text-muted)" }}>
                        {((catTotal / (totalRevenue || 1)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}

                {/* Row 7: Операционная прибыль */}
                <tr className="subtotal-row" style={{ backgroundColor: "rgba(255, 255, 255, 0.04)" }}>
                  <td style={{ fontWeight: "700" }}>Операционная прибыль / (убыток)</td>
                  <td style={{ textAlign: "center" }}>
                    {renderSparkline(monthlyOperatingProfit)}
                  </td>
                  {monthlyOperatingProfit.map((val, idx) => (
                    <td key={idx} className={`text-right ${val >= 0 ? "amount-positive" : "amount-negative"}`} style={{ fontWeight: "700" }}>
                      {formatCurrency(val)}
                    </td>
                  ))}
                  <td className={`text-right ${totalOperatingProfit >= 0 ? "amount-positive" : "amount-negative"}`} style={{ fontWeight: "800", borderLeft: "1px solid var(--border)" }}>
                    {formatCurrency(totalOperatingProfit)}
                  </td>
                  <td className="text-right" style={{ fontWeight: "700" }}>
                    {((totalOperatingProfit / (totalRevenue || 1)) * 100).toFixed(1)}%
                  </td>
                </tr>

                {/* Row 8: Прочие доходы */}
                <tr className="header-row" onClick={() => toggleSection("otherIncome")} style={{ cursor: "pointer" }}>
                  <td>
                    <span style={{ marginRight: "8px", color: "var(--text-muted)", fontSize: "10px" }}>
                      {expanded.otherIncome ? "▼" : "▶"}
                    </span>
                    Прочие доходы / (расходы)
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {renderSparkline(monthlyOtherIncome)}
                  </td>
                  {monthlyOtherIncome.map((val, idx) => (
                    <td key={idx} className={`text-right ${val >= 0 ? "amount-positive" : "amount-negative"}`} style={{ fontWeight: "600" }}>
                      {formatCurrency(val)}
                    </td>
                  ))}
                  <td className={`text-right ${totalOtherIncome >= 0 ? "amount-positive" : "amount-negative"}`} style={{ fontWeight: "700", borderLeft: "1px solid var(--border)" }}>
                    {formatCurrency(totalOtherIncome)}
                  </td>
                  <td className="text-right" style={{ fontWeight: "600" }}>
                    {((totalOtherIncome / (totalRevenue || 1)) * 100).toFixed(1)}%
                  </td>
                </tr>

                {expanded.otherIncome && Object.entries(pnl.otherIncome).map(([cat, catMap]) => {
                  const catTotal = getCategoryTotal(catMap);
                  const points = periods.map(m => catMap[m] || 0);
                  return (
                    <tr key={cat}>
                      <td style={{ paddingLeft: "32px", color: "var(--text-secondary)" }}>{cat}</td>
                      <td style={{ textAlign: "center" }}>{renderSparkline(points)}</td>
                      {periods.map(m => (
                        <td key={m} className="text-right">{formatCurrency(catMap[m] || 0)}</td>
                      ))}
                      <td className="text-right" style={{ borderLeft: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                        {formatCurrency(catTotal)}
                      </td>
                      <td className="text-right" style={{ color: "var(--text-muted)" }}>
                        {((catTotal / (totalRevenue || 1)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}

                {/* Row 9: Финансовые расходы */}
                <tr className="header-row" onClick={() => toggleSection("finance")} style={{ cursor: "pointer" }}>
                  <td>
                    <span style={{ marginRight: "8px", color: "var(--text-muted)", fontSize: "10px" }}>
                      {expanded.finance ? "▼" : "▶"}
                    </span>
                    Финансовые расходы
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {renderSparkline(monthlyFinance)}
                  </td>
                  {monthlyFinance.map((val, idx) => (
                    <td key={idx} className="text-right" style={{ fontWeight: "600", color: "var(--error)" }}>
                      {val > 0 ? `-${formatCurrency(val)}` : formatCurrency(val)}
                    </td>
                  ))}
                  <td className="text-right" style={{ fontWeight: "700", borderLeft: "1px solid var(--border)", color: "var(--error)" }}>
                    {totalFinance > 0 ? `-${formatCurrency(totalFinance)}` : formatCurrency(totalFinance)}
                  </td>
                  <td className="text-right" style={{ fontWeight: "600" }}>
                    {((totalFinance / (totalRevenue || 1)) * 100).toFixed(1)}%
                  </td>
                </tr>

                {expanded.finance && Object.entries(pnl.finance).map(([cat, catMap]) => {
                  const catTotal = getCategoryTotal(catMap);
                  const points = periods.map(m => catMap[m] || 0);
                  return (
                    <tr key={cat}>
                      <td style={{ paddingLeft: "32px", color: "var(--text-secondary)" }}>{cat}</td>
                      <td style={{ textAlign: "center" }}>{renderSparkline(points)}</td>
                      {periods.map(m => (
                        <td key={m} className="text-right">{formatExpenseValue(catMap[m] || 0)}</td>
                      ))}
                      <td className="text-right" style={{ borderLeft: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                        {formatExpenseValue(catTotal)}
                      </td>
                      <td className="text-right" style={{ color: "var(--text-muted)" }}>
                        {((catTotal / (totalRevenue || 1)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}

                {/* Row 10: Прибыль до налогов */}
                <tr className="subtotal-row" style={{ backgroundColor: "rgba(255, 255, 255, 0.04)" }}>
                  <td style={{ fontWeight: "700" }}>Прибыль / (убыток) до налогообложения</td>
                  <td style={{ textAlign: "center" }}>
                    {renderSparkline(monthlyPBT)}
                  </td>
                  {monthlyPBT.map((val, idx) => (
                    <td key={idx} className={`text-right ${val >= 0 ? "amount-positive" : "amount-negative"}`} style={{ fontWeight: "700" }}>
                      {formatCurrency(val)}
                    </td>
                  ))}
                  <td className={`text-right ${totalPBT >= 0 ? "amount-positive" : "amount-negative"}`} style={{ fontWeight: "800", borderLeft: "1px solid var(--border)" }}>
                    {formatCurrency(totalPBT)}
                  </td>
                  <td className="text-right" style={{ fontWeight: "700" }}>
                    {((totalPBT / (totalRevenue || 1)) * 100).toFixed(1)}%
                  </td>
                </tr>

                {/* Row 11: Налог на прибыль */}
                <tr className="header-row" onClick={() => toggleSection("incomeTax")} style={{ cursor: "pointer" }}>
                  <td>
                    <span style={{ marginRight: "8px", color: "var(--text-muted)", fontSize: "10px" }}>
                      {expanded.incomeTax ? "▼" : "▶"}
                    </span>
                    Расход по налогу на прибыль
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {renderSparkline(monthlyIncomeTax)}
                  </td>
                  {monthlyIncomeTax.map((val, idx) => (
                    <td key={idx} className="text-right" style={{ fontWeight: "600", color: "var(--error)" }}>
                      {val > 0 ? `-${formatCurrency(val)}` : formatCurrency(val)}
                    </td>
                  ))}
                  <td className="text-right" style={{ fontWeight: "700", borderLeft: "1px solid var(--border)", color: "var(--error)" }}>
                    {totalIncomeTax > 0 ? `-${formatCurrency(totalIncomeTax)}` : formatCurrency(totalIncomeTax)}
                  </td>
                  <td className="text-right" style={{ fontWeight: "600" }}>
                    {((totalIncomeTax / (totalRevenue || 1)) * 100).toFixed(1)}%
                  </td>
                </tr>

                {expanded.incomeTax && Object.entries(pnl.incomeTax).map(([cat, catMap]) => {
                  const catTotal = getCategoryTotal(catMap);
                  const points = periods.map(m => catMap[m] || 0);
                  return (
                    <tr key={cat}>
                      <td style={{ paddingLeft: "32px", color: "var(--text-secondary)" }}>{cat}</td>
                      <td style={{ textAlign: "center" }}>{renderSparkline(points)}</td>
                      {periods.map(m => (
                        <td key={m} className="text-right">{formatExpenseValue(catMap[m] || 0)}</td>
                      ))}
                      <td className="text-right" style={{ borderLeft: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                        {formatExpenseValue(catTotal)}
                      </td>
                      <td className="text-right" style={{ color: "var(--text-muted)" }}>
                        {((catTotal / (totalRevenue || 1)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}

                {/* Row 12: Чистая прибыль */}
                <tr className="total-row" style={{ backgroundColor: "rgba(16, 185, 129, 0.05)" }}>
                  <td style={{ fontWeight: "800", color: "white" }}>Прибыль / (убыток) за период</td>
                  <td style={{ textAlign: "center" }}>
                    {renderSparkline(monthlyNetProfit)}
                  </td>
                  {monthlyNetProfit.map((val, idx) => (
                    <td key={idx} className={`text-right ${val >= 0 ? "amount-positive" : "amount-negative"}`} style={{ fontWeight: "800", fontSize: "15px" }}>
                      {formatCurrency(val)}
                    </td>
                  ))}
                  <td className={`text-right ${totalNetProfit >= 0 ? "amount-positive" : "amount-negative"}`} style={{ fontWeight: "900", fontSize: "16px", borderLeft: "1px solid var(--border)" }}>
                    {formatCurrency(totalNetProfit)}
                  </td>
                  <td className="text-right" style={{ fontWeight: "800", color: "white" }}>
                    {((totalNetProfit / (totalRevenue || 1)) * 100).toFixed(1)}%
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
