import { CATEGORY_TYPES, INITIAL_BALANCES, CATEGORIES } from "./mockData";

// Formats a number as USD ($)
export const formatCurrency = (val) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(val);
};

// Auto-converts UZS to USD if amount looks like UZS (> 10,000)
export const convertToUSD = (val, rate = 12800) => {
  const num = Number(val || 0);
  if (num > 10000) {
    return num / rate;
  }
  return num;
};

// Gets sorted unique list of months YYYY-MM
export const getMonthsList = (transactions) => {
  const months = new Set();
  transactions.forEach((tx) => {
    if (tx.date) {
      months.add(tx.date.substring(0, 7));
    }
  });
  return Array.from(months).sort();
};

export const getMonthNameRU = (monthStr) => {
  const [year, month] = monthStr.split("-");
  const names = {
    "01": "Январь", "02": "Февраль", "03": "Март",
    "04": "Апрель", "05": "Май", "06": "Июнь",
    "07": "Июль", "08": "Август", "09": "Сентябрь",
    "10": "Октябрь", "11": "Ноябрь", "12": "Декабрь"
  };
  return `${names[month] || month} ${year}`;
};

// Helper to dynamically classify category name into custom P&L groups
export const getCategoryType = (catName) => {
  if (!catName) return "admin";
  const name = catName.trim();
  
  // 1. COGS. This must run before revenue because "Себестоимость продаж"
  // contains the word "продаж".
  if (/себестоимость|закупки|сырь|материал|cogs|изготовление|резка/i.test(name) || name === "Себестоимость продаж") {
    return "cogs";
  }

  // 2. Revenue
  if (/выручка|реализация|доход|sales|revenue|торговля|производство/i.test(name) || name === "Выручка, нетто без НДС") {
    return "revenue";
  }
  
  // 3. Distribution (Commercial)
  const distCats = ["Ответы агентам", "Бонусы", "Выплаты Ш. Миркомилов", "Выплаты Кичкина", "Бремя от Кичкина", "агент"];
  if (distCats.some(c => name.toLowerCase().includes(c.toLowerCase()))) {
    return "distribution";
  }
  
  // 4. Other Taxes
  const taxCats = ["НДФЛ", "Налог от процента", "ЕСП", "НДС", "ИНПС", "Налог на дивиденды", "Земельный налог", "налог"];
  if (taxCats.some(c => name.toLowerCase().includes(c.toLowerCase())) && !name.includes("Налог на прибыль")) {
    return "otherTax";
  }
  
  // 5. Financial Expenses
  if (name.includes("Маржа банка по кредиту") || /процент|выплата процентов|комиссия банка|кредит|finance/i.test(name)) {
    return "finance";
  }
  
  // 6. Income Tax
  if (name.includes("Налог на прибыль")) {
    return "incomeTax";
  }

  // 7. Other Income
  if (/кешбек|излишки|потери|cashback|refund/i.test(name)) {
    return "otherIncome";
  }
  
  // 8. Administrative (Default fallback for general costs)
  return "admin";
};

const getTransactionPnLType = (tx) => {
  return tx.pnlGroup || getCategoryType(tx.category);
};

// P&L (accrual base calculation) using Google Sheets LET formula classifications
export const calculatePnL = (transactions, months) => {
  const pnl = {
    revenue: {},      // category -> month -> amount
    cogs: {},
    distribution: {},
    admin: {},
    otherTax: {},
    otherIncome: {},
    finance: {},
    incomeTax: {}
  };

  // Initialize all categories in transactions
  transactions.forEach((tx) => {
    if (!tx.category) return;
    const type = getTransactionPnLType(tx);
    if (!pnl[type]) return;
    
    if (!pnl[type][tx.category]) {
      pnl[type][tx.category] = {};
      months.forEach((m) => {
        pnl[type][tx.category][m] = 0;
      });
    }
  });

  // Aggregate
  transactions.forEach((tx) => {
    if (!tx.date || !tx.category) return;
    const month = tx.date.substring(0, 7);
    if (!months.includes(month)) return;

    const type = getTransactionPnLType(tx);
    const amount = type === "otherIncome" && tx.type === "Expense"
      ? -Math.abs(Number(tx.amount || 0))
      : Number(tx.amount || 0);

    if (pnl[type] && pnl[type][tx.category]) {
      pnl[type][tx.category][month] += amount;
    }
  });

  return pnl;
};

const parseDateValue = (dateStr) => {
  if (!dateStr) return null;
  const raw = dateStr.toString().slice(0, 10);
  const [year, month, day] = raw.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
};

const toDateKey = (date) => date.toISOString().slice(0, 10);

const getMonthStart = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1));
};

const addMonths = (date, count) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1));

const buildPeriodBounds = (month, startDate, endDate) => {
  const monthStart = getMonthStart(month);
  const monthEndExclusive = addMonths(monthStart, 1);
  const start = parseDateValue(startDate) || monthStart;
  const endInclusive = parseDateValue(endDate) || new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
  const endExclusive = new Date(Date.UTC(endInclusive.getUTCFullYear(), endInclusive.getUTCMonth(), endInclusive.getUTCDate() + 1));
  const ms = monthStart > start ? monthStart : start;
  const me = monthEndExclusive < endExclusive ? monthEndExclusive : endExclusive;
  return { ms: toDateKey(ms), me: toDateKey(me) };
};

const regexAny = /.*/;
const regexNone = /a^/;
const regexBorrow = /займ|кредит|international islamic|trade finance|islamic trade|corpotion/i;
const regexCapital = /собственн.*капитал|уставн.*фонд|начало уч[её]та/i;
const regexDividend = /дивиденд|уменьшение уставного фонда/i;
const regexTax = /налог|ндфл|есп|инпс|ндс/i;
const regexInterest = /банк.*комисс|банковск.*комисс|маржа|процент|interest/i;
const regexCapex = /основн|оборуд|ноутбук|техника|камера|генератор|кондиционер|мебел|строител|проектирован|земл|объект|подрядн|кровл|капитал[ьн]|capex/i;
const regexCustomerExclusions = /за обнал|переброск|перевод между|перевод.*касс|пополнение касс|займ|кредит|international islamic|trade finance|islamic trade|corpotion|собственн.*капитал|уставн.*фонд|начало уч[её]та|дивиденд|уменьшение уставного фонда|курсов|долг налоговых|возврат.*займ|возврат долг/i;
const regexBorrowInExclusions = /собственн.*капитал|уставн.*фонд|начало уч[её]та|дивиденд|уменьшение уставного фонда|возврат.*займ|погаш/i;
const regexBorrowOut = /возврат.*займ|погаш.*займ|international islamic|trade finance|islamic trade|corpotion|кредит/i;
const regexSupplierExclusions = /за обнал|переброск|перевод между|перевод.*касс|пополнение касс|займ|кредит|international islamic|trade finance|islamic trade|corpotion|собственн.*капитал|уставн.*фонд|начало уч[её]та|дивиденд|уменьшение уставного фонда|налог|ндфл|есп|инпс|ндс|банк.*комисс|банковск.*комисс|маржа|процент|interest|основн|оборуд|ноутбук|техника|камера|генератор|кондиционер|мебел|строител|проектирован|земл|объект|подрядн|кровл|капитал[ьн]|capex/i;

// Cash Flow (cash basis) using the Google Sheets LET/MAP report logic when cash movements exist.
export const calculateCashFlow = (transactions, months, initialBalances = INITIAL_BALANCES, options = {}) => {
  const cashTx = transactions
    .filter((tx) => tx.cashFlowDirection === "in" || tx.cashFlowDirection === "out")
    .map((tx) => ({
      ...tx,
      amount: Math.abs(Number(tx.amount || 0)),
      detail: (tx.cashFlowDetail || tx.description || "").toString().toLowerCase()
    }))
    .filter((tx) => tx.date && Number.isFinite(tx.amount) && tx.amount !== 0);

  const cf = {
    operatingIn: {},
    operatingOut: {},
    investingIn: {},
    investingOut: {},
    financingIn: {},
    financingOut: {}
  };
  const monthlyBalances = {};
  const openingBalances = {};

  months.forEach((m) => {
    cf.operatingIn[m] = 0;
    cf.operatingOut[m] = 0;
    cf.investingIn[m] = 0;
    cf.investingOut[m] = 0;
    cf.financingIn[m] = 0;
    cf.financingOut[m] = 0;
    monthlyBalances[m] = 0;
    openingBalances[m] = 0;
  });

  if (cashTx.length > 0) {
    const rangeStart = options.startDate || `${months[0]}-01`;
    const rangeEnd = options.endDate || `${months[months.length - 1]}-31`;

    const inRange = (tx, ms, me) => tx.date >= ms && tx.date < me;
    const matches = (tx, pattern, exclusion = regexNone) => pattern.test(tx.detail) && !exclusion.test(tx.detail);
    const sumIn = (ms, me, pattern, exclusion) => cashTx
      .filter((tx) => tx.cashFlowDirection === "in" && inRange(tx, ms, me) && matches(tx, pattern, exclusion))
      .reduce((sum, tx) => sum + tx.amount, 0);
    const sumOut = (ms, me, pattern, exclusion) => -cashTx
      .filter((tx) => tx.cashFlowDirection === "out" && inRange(tx, ms, me) && matches(tx, pattern, exclusion))
      .reduce((sum, tx) => sum + tx.amount, 0);
    const openingBefore = (boundary) => {
      const inBefore = cashTx
        .filter((tx) => tx.cashFlowDirection === "in" && tx.date < boundary)
        .reduce((sum, tx) => sum + tx.amount, 0);
      const outBefore = cashTx
        .filter((tx) => tx.cashFlowDirection === "out" && tx.date < boundary)
        .reduce((sum, tx) => sum + tx.amount, 0);
      return inBefore - outBefore;
    };

    const calculatePeriod = (ms, me) => {
      const opening = openingBefore(ms);
      const closing = openingBefore(me);
      const rawNet = closing - opening;
      const customerReceipts = sumIn(ms, me, regexAny, regexCustomerExclusions);
      const taxesPaid = sumOut(ms, me, regexTax, regexNone);
      const interestPaid = sumOut(ms, me, regexInterest, regexTax);
      const capex = sumOut(ms, me, regexCapex, regexTax);
      const borrowingsIn = sumIn(ms, me, regexBorrow, regexBorrowInExclusions);
      const borrowingsOut = sumOut(ms, me, regexBorrowOut, new RegExp(`${regexInterest.source}|${regexTax.source}`, "i"));
      const capitalIn = sumIn(ms, me, regexCapital, regexNone);
      const dividends = sumOut(ms, me, regexDividend, regexTax);
      const suppliersAndEmployees = sumOut(ms, me, regexAny, regexSupplierExclusions);
      const otherOperating = rawNet - (
        customerReceipts
        + suppliersAndEmployees
        + taxesPaid
        + interestPaid
        + capex
        + borrowingsIn
        + borrowingsOut
        + capitalIn
        + dividends
      );
      const operatingNet = customerReceipts + suppliersAndEmployees + taxesPaid + interestPaid + otherOperating;
      const investingNet = capex;
      const financingNet = borrowingsIn + borrowingsOut + capitalIn + dividends;
      const netChange = operatingNet + investingNet + financingNet;

      return {
        opening,
        customerReceipts,
        suppliersAndEmployees,
        taxesPaid,
        interestPaid,
        otherOperating,
        operatingNet,
        capex,
        investingNet,
        borrowingsIn,
        borrowingsOut,
        capitalIn,
        dividends,
        financingNet,
        netChange,
        closing,
        check: closing - opening - netChange
      };
    };

    const rows = [
      { key: "opening", id: "1", ru: "Денежные средства и эквиваленты на начало периода", en: "Cash and cash equivalents at beginning of period" },
      { key: "operatingHeader", id: "", ru: "ОПЕРАЦИОННАЯ ДЕЯТЕЛЬНОСТЬ", en: "OPERATING ACTIVITIES", isHeader: true },
      { key: "customerReceipts", id: "3", ru: "Поступления от покупателей", en: "Cash receipts from customers" },
      { key: "suppliersAndEmployees", id: "4", ru: "Оплаты поставщикам и сотрудникам", en: "Cash paid to suppliers and employees" },
      { key: "taxesPaid", id: "5", ru: "Налоги уплаченные", en: "Taxes paid" },
      { key: "interestPaid", id: "6", ru: "Проценты и банковские комиссии уплаченные", en: "Interest and bank charges paid" },
      { key: "otherOperating", id: "7", ru: "Прочие операционные / неклассифицированные движения", en: "Other operating / unclassified cash movements" },
      { key: "operatingNet", id: "8", ru: "Чистый денежный поток от операционной деятельности", en: "Net cash flows from operating activities", isSubtotal: true },
      { key: "investingHeader", id: "", ru: "ИНВЕСТИЦИОННАЯ ДЕЯТЕЛЬНОСТЬ", en: "INVESTING ACTIVITIES", isHeader: true },
      { key: "capex", id: "10", ru: "Приобретение ОС / строительство / CAPEX", en: "Purchase of PPE / construction / CAPEX" },
      { key: "investingNet", id: "11", ru: "Чистый денежный поток от инвестиционной деятельности", en: "Net cash flows used in investing activities", isSubtotal: true },
      { key: "financingHeader", id: "", ru: "ФИНАНСОВАЯ ДЕЯТЕЛЬНОСТЬ", en: "FINANCING ACTIVITIES", isHeader: true },
      { key: "borrowingsIn", id: "13", ru: "Поступления по займам", en: "Proceeds from borrowings" },
      { key: "borrowingsOut", id: "14", ru: "Погашение займов", en: "Repayment of borrowings" },
      { key: "capitalIn", id: "15", ru: "Взносы капитала / начальное финансирование", en: "Capital contributions / initial funding" },
      { key: "dividends", id: "16", ru: "Дивиденды и возврат капитала", en: "Dividends and return of capital" },
      { key: "financingNet", id: "17", ru: "Чистый денежный поток от финансовой деятельности", en: "Net cash flows from financing activities", isSubtotal: true },
      { key: "netChange", id: "18", ru: "Чистое увеличение / (уменьшение) денежных средств", en: "Net increase / (decrease) in cash and cash equivalents", isSubtotal: true },
      { key: "closing", id: "19", ru: "Денежные средства и эквиваленты на конец периода", en: "Cash and cash equivalents at end of period", isTotal: true },
      { key: "check", id: "20", ru: "Проверка движения денежных средств", en: "Cash movement check" }
    ];

    const periodResults = {};
    months.forEach((m) => {
      const { ms, me } = buildPeriodBounds(m, rangeStart, rangeEnd);
      const result = calculatePeriod(ms, me);
      periodResults[m] = result;
      openingBalances[m] = result.opening;
      monthlyBalances[m] = result.closing;
      cf.operatingIn[m] = result.customerReceipts;
      cf.operatingOut[m] = -(result.suppliersAndEmployees + result.taxesPaid + result.interestPaid + result.otherOperating);
      cf.investingOut[m] = -result.capex;
      cf.financingIn[m] = result.borrowingsIn + result.capitalIn;
      cf.financingOut[m] = -(result.borrowingsOut + result.dividends);
    });

    const start = parseDateValue(rangeStart) || getMonthStart(months[0]);
    const end = parseDateValue(rangeEnd) || new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const totalResult = calculatePeriod(toDateKey(start), toDateKey(new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1))));
    const cashFlowRows = rows.map((row) => ({
      ...row,
      values: row.isHeader ? months.map(() => "") : months.map((m) => periodResults[m]?.[row.key] || 0),
      total: row.isHeader ? "" : totalResult[row.key] || 0
    }));

    return {
      cf,
      monthlyBalances,
      openingBalances,
      initialTotal: totalResult.opening,
      cashFlowRows,
      cashFlowMode: "formula"
    };
  }

  months.forEach((m) => {
    cf.operatingIn[m] = 0;
    cf.operatingOut[m] = 0;
    cf.investingIn[m] = 0;
    cf.investingOut[m] = 0;
    cf.financingIn[m] = 0;
    cf.financingOut[m] = 0;
  });

  transactions.forEach((tx) => {
    if (!tx.date) return;
    const month = tx.date.substring(0, 7);
    if (!months.includes(month)) return;

    const type = CATEGORY_TYPES[tx.category] || (tx.type === "Income" ? "Income" : "Expense");
    const amount = Number(tx.amount || 0);

    if (tx.type === "Income") {
      if (type === "Financing_In") {
        cf.financingIn[month] += amount;
      } else {
        cf.operatingIn[month] += amount;
      }
    } else if (type === "Investing_Out") {
      cf.investingOut[month] += amount;
    } else if (type === "Financing_Out") {
      cf.financingOut[month] += amount;
    } else {
      cf.operatingOut[month] += amount;
    }
  });

  const initialTotal = Object.values(initialBalances).reduce((a, b) => a + b, 0);
  let currentBalance = initialTotal;
  months.forEach((m) => {
    currentBalance += (
      cf.operatingIn[m] - cf.operatingOut[m]
      + cf.investingIn[m] - cf.investingOut[m]
      + cf.financingIn[m] - cf.financingOut[m]
    );
    monthlyBalances[m] = currentBalance;
  });

  return { cf, monthlyBalances, initialTotal };
};

// Balance Sheet (cumulative point-in-time calculation)
export const calculateBalanceSheet = (transactions, months, initialBalances = INITIAL_BALANCES) => {
  const balanceSheet = [];
  
  // Sort transactions chronologically
  const sortedTx = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  months.forEach((m) => {
    // End date of the month is represented by filtering transactions up to the end of this month
    const endOfMonthStr = `${m}-31`; // Simple lexical filter is enough
    const txUntilMonth = sortedTx.filter(tx => tx.date && tx.date <= endOfMonthStr);

    // Calculate cash balance per account up to this date
    const cash = { ...initialBalances };
    Object.keys(cash).forEach(acc => {
      // Calculate changes
      txUntilMonth.forEach(tx => {
        if (tx.account === acc) {
          const amt = Number(tx.amount || 0);
          if (tx.type === "Income") {
            cash[acc] += amt;
          } else {
            cash[acc] -= amt;
          }
        }
      });
    });

    const totalCash = Object.values(cash).reduce((a, b) => a + b, 0);

    // Calculate outstanding liabilities (credits received minus paid back)
    let outstandingLoan = 0;
    txUntilMonth.forEach(tx => {
      const type = CATEGORY_TYPES[tx.category];
      const amt = Number(tx.amount || 0);
      if (type === "Financing_In") {
        outstandingLoan += amt;
      } else if (type === "Financing_Out") {
        outstandingLoan -= amt;
      }
    });

    // Equipment Assets (accumulated investment purchases)
    let equipmentVal = 0;
    txUntilMonth.forEach(tx => {
      const type = CATEGORY_TYPES[tx.category];
      if (type === "Investing_Out") {
        equipmentVal += Number(tx.amount || 0);
      }
    });

    // Simulating Accounts Receivable / Payable based on transaction flow
    // (In reality, sheets would have invoice tracking; here we simulate 10% of last month's revenues and raw materials purchase unpaid)
    const monthRevenues = txUntilMonth
      .filter(tx => tx.date.substring(0, 7) === m && CATEGORY_TYPES[tx.category] === "Income")
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    
    const monthPurchases = txUntilMonth
      .filter(tx => tx.date.substring(0, 7) === m && CATEGORY_TYPES[tx.category] === "COGS")
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    const accountsReceivable = Math.round(monthRevenues * 0.15); // 15% unpaid
    const accountsPayable = Math.round(monthPurchases * 0.20); // 20% unpaid

    // Total Assets = Cash + Equipment + Accounts Receivable
    const totalAssets = totalCash + equipmentVal + accountsReceivable;
    
    // Total Liabilities = Outstanding Loans + Accounts Payable
    const totalLiabilities = outstandingLoan + accountsPayable;

    // Equity = Total Assets - Total Liabilities (Retained Earnings + Initial Capital)
    const equity = totalAssets - totalLiabilities;

    balanceSheet.push({
      month: m,
      cash,
      totalCash,
      equipment: equipmentVal,
      accountsReceivable,
      totalAssets,
      accountsPayable,
      outstandingLoan,
      totalLiabilities,
      equity,
      balanced: Math.abs(totalAssets - (totalLiabilities + equity)) < 1
    });
  });

  return balanceSheet;
};

// Auditing System
export const runAudits = (transactions, initialBalances = INITIAL_BALANCES) => {
  const warnings = [];
  const errors = [];

  // Sort chronologically
  const sortedTx = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  // 1. Audit Check: Negative Balances over time
  const cashBalances = { ...initialBalances };
  const accountsTimeline = {};
  Object.keys(cashBalances).forEach(acc => {
    accountsTimeline[acc] = [];
  });

  sortedTx.forEach((tx) => {
    if (!tx.account) return;
    const amount = Number(tx.amount || 0);
    const beforeBal = cashBalances[tx.account] || 0;
    
    if (tx.type === "Income") {
      cashBalances[tx.account] = beforeBal + amount;
    } else {
      cashBalances[tx.account] = beforeBal - amount;
    }

    const currentBal = cashBalances[tx.account];

    // If balance dips below 0
    if (currentBal < 0) {
      errors.push({
        id: `audit-neg-${tx.id}`,
        type: "negative_balance",
        severity: "error",
        title: "Отрицательный баланс по счету",
        message: `Баланс по счету "${tx.account}" ушел в минус (${formatCurrency(currentBal)}) после операции от ${tx.date} на сумму ${formatCurrency(tx.amount)}.`,
        txId: tx.id,
        date: tx.date
      });
    }
  });

  // 2. Audit Check: Duplicate Transactions
  const seenTx = new Map(); // key -> transaction
  sortedTx.forEach((tx) => {
    if (!tx.date || !tx.amount || !tx.counterparty) return;
    
    // We define duplicate as same date, amount, type, counterparty and category
    const key = `${tx.date}_${tx.amount}_${tx.type}_${tx.counterparty}_${tx.category}`;
    if (seenTx.has(key)) {
      const original = seenTx.get(key);
      warnings.push({
        id: `audit-dup-${tx.id}`,
        type: "duplicate_transaction",
        severity: "warning",
        title: "Подозрение на дубликат транзакции",
        message: `Транзакция от ${tx.date} на сумму ${formatCurrency(tx.amount)} для контрагента "${tx.counterparty}" полностью совпадает с транзакцией ${original.id}.`,
        txId: tx.id,
        date: tx.date,
        originalId: original.id
      });
    } else {
      seenTx.set(key, tx);
    }
  });

  // 3. Audit Check: Missing Category
  sortedTx.forEach((tx) => {
    if (!tx.category) {
      warnings.push({
        id: `audit-miss-cat-${tx.id}`,
        type: "missing_category",
        severity: "warning",
        title: "Пропущена финансовая статья",
        message: `У операции от ${tx.date} на сумму ${formatCurrency(tx.amount)} не указана категория доходов/расходов.`,
        txId: tx.id,
        date: tx.date
      });
    }
  });

  // 4. Audit Check: Missing Counterparty
  sortedTx.forEach((tx) => {
    // If category is not internal transfer/tax and counterparty is empty
    const isInternal = tx.category === CATEGORIES.FIN_LOAN_OUT || tx.category === CATEGORIES.FIN_LOAN_IN;
    if (!tx.counterparty && !isInternal) {
      warnings.push({
        id: `audit-miss-cpt-${tx.id}`,
        type: "missing_counterparty",
        severity: "warning",
        title: "Отсутствует контрагент",
        message: `Транзакция от ${tx.date} на сумму ${formatCurrency(tx.amount)} по статье "${tx.category || 'Не указана'}" проведена без указания контрагента.`,
        txId: tx.id,
        date: tx.date
      });
    }
  });

  // 5. Audit Check: Outliers (Abnormally large transaction amount)
  sortedTx.forEach((tx) => {
    const amt = Number(tx.amount || 0);
    // Alert on transactions > 1,000,000 RUB, unless it's a loan
    if (amt > 1000000 && tx.category !== CATEGORIES.FIN_LOAN_IN && tx.category !== CATEGORIES.FIN_LOAN_OUT) {
      warnings.push({
        id: `audit-outlier-${tx.id}`,
        type: "outlier_amount",
        severity: "info",
        title: "Аномально крупная транзакция",
        message: `Зафиксирована операция от ${tx.date} на сумму ${formatCurrency(tx.amount)} по статье "${tx.category}". Требуется дополнительное подтверждение.`,
        txId: tx.id,
        date: tx.date
      });
    }
  });

  return { warnings, errors, total: warnings.length + errors.length };
};

// Help helper
function SetOfCategories(transactions) {
  const cats = new Set();
  transactions.forEach((tx) => {
    if (tx.category) cats.add(tx.category);
  });
  return Array.from(cats);
}
