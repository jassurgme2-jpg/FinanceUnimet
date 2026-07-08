import React, { useMemo, useState } from "react";
import {
  calculateBalanceSheet,
  calculatePnL,
  formatCurrency,
  getBalanceSheetMonths
} from "../financialCalculations";
import { askGeminiAnalyst, hasGeminiProxy } from "../geminiClient";

const EXPENSE_SECTIONS = ["cogs", "distribution", "admin", "otherTax", "finance", "incomeTax"];

const sumCategoryMap = (categoryMap = {}) => Object.values(categoryMap)
  .reduce((sum, periodMap) => sum + Object.values(periodMap).reduce((a, b) => a + Number(b || 0), 0), 0);

const sumPeriod = (sectionMap = {}, period) => Object.values(sectionMap)
  .reduce((sum, periodMap) => sum + Number(periodMap[period] || 0), 0);

const formatPercent = (value) => `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`;

const getTopCategories = (pnl, sections, limit = 5) => sections
  .flatMap((section) => Object.entries(pnl[section] || {}).map(([name, periodMap]) => ({
    name,
    section,
    total: Object.values(periodMap).reduce((sum, value) => sum + Math.abs(Number(value || 0)), 0)
  })))
  .filter((item) => item.total > 0)
  .sort((a, b) => b.total - a.total)
  .slice(0, limit);

const getTone = (netProfit, margin) => {
  if (netProfit < 0) return "Компания в убытке: расходы и себестоимость сейчас перекрывают доходы.";
  if (margin >= 20) return "Картина сильная: прибыль положительная, маржа выглядит здоровой.";
  if (margin >= 5) return "Прибыль есть, но маржа умеренная: расходы стоит держать под контролем.";
  return "Прибыль почти на границе: даже небольшой рост расходов может быстро съесть результат.";
};

export default function AIAnalyst({ transactions, balanceSourceData }) {
  const [question, setQuestion] = useState("Что сейчас важно по финансам?");
  const [geminiAnswer, setGeminiAnswer] = useState("");
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState("");
  const analysis = useMemo(() => {
    const months = getBalanceSheetMonths(transactions, balanceSourceData);
    const pnl = calculatePnL(transactions, months);
    const balanceSheet = calculateBalanceSheet(transactions, months, undefined, balanceSourceData);
    const latestBalance = balanceSheet[balanceSheet.length - 1] || {};

    const revenue = sumCategoryMap(pnl.revenue);
    const cogs = sumCategoryMap(pnl.cogs);
    const distribution = sumCategoryMap(pnl.distribution);
    const admin = sumCategoryMap(pnl.admin);
    const otherTax = sumCategoryMap(pnl.otherTax);
    const finance = sumCategoryMap(pnl.finance);
    const incomeTax = sumCategoryMap(pnl.incomeTax);
    const otherIncome = sumCategoryMap(pnl.otherIncome);
    const expenses = cogs + distribution + admin + otherTax + finance + incomeTax;
    const grossProfit = revenue - cogs;
    const operatingProfit = grossProfit - distribution - admin - otherTax;
    const netProfit = operatingProfit + otherIncome - finance - incomeTax;
    const margin = revenue ? (netProfit / revenue) * 100 : 0;
    const grossMargin = revenue ? (grossProfit / revenue) * 100 : 0;
    const fixedAssets = Number(latestBalance.ppe || latestBalance.totalNonCurrentAssets || latestBalance.equipment || 0);
    const totalAssets = Number(latestBalance.totalAssets || 0);
    const fixedAssetsShare = totalAssets ? (fixedAssets / totalAssets) * 100 : 0;
    const latestMonth = months[months.length - 1] || "";
    const previousMonth = months[months.length - 2] || "";
    const latestNetProfit = latestMonth
      ? sumPeriod(pnl.revenue, latestMonth)
        - EXPENSE_SECTIONS.reduce((sum, section) => sum + sumPeriod(pnl[section], latestMonth), 0)
        + sumPeriod(pnl.otherIncome, latestMonth)
      : 0;
    const previousNetProfit = previousMonth
      ? sumPeriod(pnl.revenue, previousMonth)
        - EXPENSE_SECTIONS.reduce((sum, section) => sum + sumPeriod(pnl[section], previousMonth), 0)
        + sumPeriod(pnl.otherIncome, previousMonth)
      : 0;

    const topExpenses = getTopCategories(pnl, EXPENSE_SECTIONS);
    const topRevenue = getTopCategories(pnl, ["revenue"], 3);
    const balanceCheck = Number(latestBalance.check || 0);

    return {
      months,
      pnl,
      latestBalance,
      revenue,
      expenses,
      cogs,
      distribution,
      admin,
      otherTax,
      finance,
      incomeTax,
      otherIncome,
      grossProfit,
      operatingProfit,
      netProfit,
      margin,
      grossMargin,
      fixedAssets,
      totalAssets,
      fixedAssetsShare,
      cash: Number(latestBalance.cash || latestBalance.totalCash || 0),
      receivables: Number(latestBalance.receivables || latestBalance.accountsReceivable || 0),
      payables: Number(latestBalance.payables || latestBalance.accountsPayable || 0),
      equity: Number(latestBalance.equity || 0),
      latestMonth,
      previousMonth,
      latestNetProfit,
      previousNetProfit,
      topExpenses,
      topRevenue,
      balanceCheck
    };
  }, [transactions, balanceSourceData]);

  const buildAnswer = (rawQuestion) => {
    const q = rawQuestion.toLowerCase();
    const topExpense = analysis.topExpenses[0];
    const topRevenue = analysis.topRevenue[0];

    if (!transactions.length) {
      return "Данные пока не загружены. Сначала обновите базу или подключите Google Sheets, после этого я смогу разобрать расходы, прибыль и активы.";
    }

    if (/расход|затрат|себестоим|cost|expense/i.test(q)) {
      return `Всего расходов за период: ${formatCurrency(analysis.expenses)}. Самая крупная статья: ${topExpense ? `${topExpense.name} (${formatCurrency(topExpense.total)})` : "нет выраженной статьи"}. Себестоимость: ${formatCurrency(analysis.cogs)}, административные расходы: ${formatCurrency(analysis.admin)}, коммерческие расходы: ${formatCurrency(analysis.distribution)}.`;
    }

    if (/прибыл|марж|pnl|убыт/i.test(q)) {
      return `Выручка: ${formatCurrency(analysis.revenue)}. Валовая прибыль: ${formatCurrency(analysis.grossProfit)} (${formatPercent(analysis.grossMargin)}). Чистая прибыль: ${formatCurrency(analysis.netProfit)} (${formatPercent(analysis.margin)} от выручки). ${getTone(analysis.netProfit, analysis.margin)}`;
    }

    if (/основн|средств|актив|оборуд/i.test(q)) {
      return `Основные средства на последнюю дату: ${formatCurrency(analysis.fixedAssets)}. Это ${formatPercent(analysis.fixedAssetsShare)} от всех активов (${formatCurrency(analysis.totalAssets)}). Денежные средства: ${formatCurrency(analysis.cash)}, дебиторка: ${formatCurrency(analysis.receivables)}, кредиторка: ${formatCurrency(analysis.payables)}.`;
    }

    if (/выруч|доход|продаж|revenue/i.test(q)) {
      return `Выручка за период: ${formatCurrency(analysis.revenue)}. Основной источник: ${topRevenue ? `${topRevenue.name} (${formatCurrency(topRevenue.total)})` : "не найден"}. Прочие доходы/расходы: ${formatCurrency(analysis.otherIncome)}.`;
    }

    if (/налог|ндс|tax/i.test(q)) {
      return `Налоги и похожие платежи в PnL: ${formatCurrency(analysis.otherTax + analysis.incomeTax)}. Из них операционные налоги: ${formatCurrency(analysis.otherTax)}, налог на прибыль: ${formatCurrency(analysis.incomeTax)}.`;
    }

    if (/деньг|cash|касс|банк/i.test(q)) {
      return `Денежные средства на последнюю дату баланса: ${formatCurrency(analysis.cash)}. Чистая прибыль последнего периода: ${formatCurrency(analysis.latestNetProfit)}${analysis.previousMonth ? `, предыдущего периода: ${formatCurrency(analysis.previousNetProfit)}` : ""}.`;
    }

    return `${getTone(analysis.netProfit, analysis.margin)} Выручка ${formatCurrency(analysis.revenue)}, расходы ${formatCurrency(analysis.expenses)}, чистая прибыль ${formatCurrency(analysis.netProfit)}. Основные средства ${formatCurrency(analysis.fixedAssets)}, всего активов ${formatCurrency(analysis.totalAssets)}.`;
  };

  const answer = buildAnswer(question);
  const geminiContext = {
    period: {
      months: analysis.months,
      latestMonth: analysis.latestMonth,
      transactionCount: transactions.length
    },
    pnl: {
      revenue: analysis.revenue,
      expenses: analysis.expenses,
      cogs: analysis.cogs,
      distribution: analysis.distribution,
      admin: analysis.admin,
      otherTax: analysis.otherTax,
      finance: analysis.finance,
      incomeTax: analysis.incomeTax,
      otherIncome: analysis.otherIncome,
      grossProfit: analysis.grossProfit,
      operatingProfit: analysis.operatingProfit,
      netProfit: analysis.netProfit,
      margin: analysis.margin,
      grossMargin: analysis.grossMargin
    },
    balance: {
      totalAssets: analysis.totalAssets,
      fixedAssets: analysis.fixedAssets,
      fixedAssetsShare: analysis.fixedAssetsShare,
      cash: analysis.cash,
      receivables: analysis.receivables,
      payables: analysis.payables,
      equity: analysis.equity,
      balanceCheck: analysis.balanceCheck
    },
    topExpenses: analysis.topExpenses,
    topRevenue: analysis.topRevenue
  };
  const handleAskGemini = async () => {
    setGeminiLoading(true);
    setGeminiError("");
    try {
      const text = await askGeminiAnalyst({ question, context: geminiContext });
      setGeminiAnswer(text);
    } catch (err) {
      setGeminiError(err.message || "Не удалось получить ответ Gemini.");
    } finally {
      setGeminiLoading(false);
    }
  };
  const quickQuestions = [
    "Какие основные расходы?",
    "Какая прибыль и маржа?",
    "Что с основными средствами?",
    "Какая выручка?",
    "Что с деньгами?"
  ];

  const insightCards = [
    { label: "Выручка", value: formatCurrency(analysis.revenue), tone: "var(--primary)" },
    { label: "Расходы", value: formatCurrency(analysis.expenses), tone: "var(--error)" },
    { label: "Чистая прибыль", value: formatCurrency(analysis.netProfit), tone: analysis.netProfit >= 0 ? "var(--success)" : "var(--error)" },
    { label: "Основные средства", value: formatCurrency(analysis.fixedAssets), tone: "var(--info)" }
  ];

  const checks = [
    `Маржа чистой прибыли: ${formatPercent(analysis.margin)}.`,
    `Валовая маржа: ${formatPercent(analysis.grossMargin)}.`,
    analysis.topExpenses[0]
      ? `Крупнейшая статья расходов: ${analysis.topExpenses[0].name} (${formatCurrency(analysis.topExpenses[0].total)}).`
      : "Крупные статьи расходов не найдены.",
    `Основные средства занимают ${formatPercent(analysis.fixedAssetsShare)} активов.`,
    Math.abs(analysis.balanceCheck) > 1
      ? `Есть разница в проверке баланса: ${formatCurrency(analysis.balanceCheck)}.`
      : "Баланс по контрольной строке сходится."
  ];

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "18px", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: "24px", textWrap: "balance" }}>ИИ Аналитик</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: 1.6, marginTop: "6px", maxWidth: "720px" }}>
            Финансовый разбор по загруженным данным: PnL, расходы, прибыль, активы, основные средства и баланс.
          </p>
        </div>
        <span className="badge badge-info" style={{ minHeight: "32px", display: "inline-flex", alignItems: "center", fontVariantNumeric: "tabular-nums" }}>
          {hasGeminiProxy ? "Gemini подключен" : `${transactions.length} транзакций`}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "16px" }}>
        {insightCards.map((card) => (
          <div key={card.label} className="card card-hover" style={{ padding: "16px", minHeight: "104px" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>{card.label}</span>
            <div style={{ color: card.tone, fontSize: "22px", fontWeight: 800, marginTop: "10px", fontVariantNumeric: "tabular-nums" }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px" }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <span style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Ответ по данным</span>
            <p style={{ marginTop: "10px", color: "var(--text-primary)", fontSize: "15px", lineHeight: 1.7, textWrap: "pretty" }}>
              {answer}
            </p>
          </div>

          {geminiAnswer && (
            <div style={{ padding: "14px", borderRadius: "var(--radius-sm)", backgroundColor: "rgba(34, 211, 238, 0.08)", border: "1px solid rgba(34, 211, 238, 0.18)" }}>
              <span style={{ color: "var(--info)", fontSize: "11px", fontWeight: 800, textTransform: "uppercase" }}>Ответ Gemini</span>
              <p style={{ marginTop: "8px", color: "var(--text-primary)", fontSize: "14px", lineHeight: 1.7, whiteSpace: "pre-wrap", textWrap: "pretty" }}>
                {geminiAnswer}
              </p>
            </div>
          )}

          {geminiError && (
            <div style={{ padding: "12px", borderRadius: "var(--radius-sm)", backgroundColor: "var(--error-bg)", color: "#fecdd3", fontSize: "13px", lineHeight: 1.5 }}>
              {geminiError}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {quickQuestions.map((item) => (
              <button
                key={item}
                type="button"
                className="btn btn-secondary"
                onClick={() => setQuestion(item)}
                style={{ minHeight: "40px", padding: "8px 12px", fontSize: "12px" }}
              >
                {item}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              className="input-control"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Спросите про расходы, прибыль, основные средства..."
              style={{ minHeight: "44px", flex: 1 }}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAskGemini}
              disabled={!hasGeminiProxy || geminiLoading || !transactions.length}
              title={hasGeminiProxy ? "Спросить Gemini по финансовой сводке" : "Сначала настройте Gemini proxy URL"}
              style={{ minHeight: "44px", padding: "10px 14px", whiteSpace: "nowrap" }}
            >
              {geminiLoading ? "Думаю..." : "Спросить Gemini"}
            </button>
          </div>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Главные наблюдения</span>
          {checks.map((item) => (
            <div key={item} style={{ display: "flex", gap: "10px", padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--primary)", marginTop: "7px", flex: "0 0 auto" }} />
              <span style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: 1.55 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px" }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <h3 style={{ fontSize: "17px" }}>Топ расходов</h3>
          {analysis.topExpenses.length > 0 ? analysis.topExpenses.map((item, idx) => (
            <div key={item.name} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", gap: "10px", alignItems: "center" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "12px", fontVariantNumeric: "tabular-nums" }}>{idx + 1}</span>
              <span style={{ color: "var(--text-secondary)", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</span>
              <strong style={{ color: "var(--error)", fontSize: "13px", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(item.total)}</strong>
            </div>
          )) : (
            <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Расходы не найдены.</p>
          )}
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <h3 style={{ fontSize: "17px" }}>Активы и баланс</h3>
          {[
            ["Всего активов", analysis.totalAssets],
            ["Основные средства", analysis.fixedAssets],
            ["Денежные средства", analysis.cash],
            ["Дебиторская задолженность", analysis.receivables],
            ["Кредиторская задолженность", analysis.payables],
            ["Капитал", analysis.equity]
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "12px", borderBottom: "1px solid var(--border-light)", paddingBottom: "9px" }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>{label}</span>
              <strong style={{ color: "white", fontSize: "13px", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(value)}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
