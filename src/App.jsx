import React, { useState, useEffect } from "react";
import { getTransactions } from "./mockData";
import { runAudits } from "./financialCalculations";
import DashboardOverview from "./components/DashboardOverview";
import PnLReport from "./components/PnLReport";
import CashFlowReport from "./components/CashFlowReport";
import BalanceSheet from "./components/BalanceSheet";
import ReconciliationAct from "./components/ReconciliationAct";
import AuditCenter from "./components/AuditCenter";
import DataGraphView from "./components/DataGraphView";
import DataImporter from "./components/DataImporter";
import GoogleSheetsTabs from "./components/GoogleSheetsTabs";
import TransactionManager from "./components/TransactionManager";
import BudgetGoalManager from "./components/BudgetGoalManager";
import { logout } from "./auth";
import {
  DEFAULT_APPS_SCRIPT_TOKEN,
  DEFAULT_APPS_SCRIPT_URL,
  DEFAULT_AUTO_CONVERT,
  DEFAULT_EXCHANGE_RATE,
  DEFAULT_GOOGLE_API_KEY,
  DEFAULT_GOOGLE_SHEET_ID,
  HAS_HOSTED_GOOGLE_CONFIG
} from "./config";

const FORMULA_PNL_GROUP_BY_CATEGORY = new Map([
  ["Выручка, нетто без НДС", "revenue"],
  ["Себестоимость продаж", "cogs"],
  ["Ответы агентам", "distribution"],
  ["Бонусы", "distribution"],
  ["Выплаты Ш. Миркомилов", "distribution"],
  ["Выплаты Кичкина", "distribution"],
  ["Бремя от Кичкина", "distribution"],
  ["Аренда земли", "admin"],
  ["Аренда нежилого помещения", "admin"],
  ["Зарплата", "admin"],
  ["Премии", "admin"],
  ["Инфраструктура", "admin"],
  ["Изыскательная работа", "admin"],
  ["Гос экспертиза", "admin"],
  ["Проектирование", "admin"],
  ["Государственная пошлина", "admin"],
  ["Расходные материалы", "admin"],
  ["Услуги страхования", "admin"],
  ["Банковская комиссия", "admin"],
  ["Командировки и встречи", "admin"],
  ["Профессиональные услуги", "admin"],
  ["Телекоммуникация и ИТ", "admin"],
  ["Корпоративные подарки", "admin"],
  ["Дорожные затраты", "admin"],
  ["Затраты ГСМ", "admin"],
  ["Маркетинг и реклама", "admin"],
  ["Транспортные затраты", "admin"],
  ["Канцелярские затраты", "admin"],
  ["Хозяйственные затраты", "admin"],
  ["Затраты питания", "admin"],
  ["Коммунальные затраты", "admin"],
  ["НДФЛ", "otherTax"],
  ["Налог от процента", "otherTax"],
  ["ЕСП", "otherTax"],
  ["НДС", "otherTax"],
  ["ИНПС", "otherTax"],
  ["Налог на дивиденды", "otherTax"],
  ["Земельный налог", "otherTax"],
  ["Кешбек", "otherIncome"],
  ["Излишки", "otherIncome"],
  ["Потери", "otherIncome"],
  ["Маржа банка по кредиту", "finance"],
  ["Налог на прибыль", "incomeTax"]
]);

const FORMULA_PNL_GROUP_BY_CATEGORY_LOWER = new Map(
  Array.from(FORMULA_PNL_GROUP_BY_CATEGORY, ([category, group]) => [category.toLowerCase(), group])
);

const getFormulaPnLGroup = (category) => {
  const name = (category || "").toString().trim();
  return FORMULA_PNL_GROUP_BY_CATEGORY.get(name)
    || FORMULA_PNL_GROUP_BY_CATEGORY_LOWER.get(name.toLowerCase())
    || "excluded";
};

export default function App() {
  const storedAutoConvert = localStorage.getItem("gs_auto_convert");
  const [transactions, setTransactions] = useState([]);
  const [balanceSourceData, setBalanceSourceData] = useState(null);
  const [sourceName, setSourceName] = useState("Демо-данные (Mock Data)");
  const [activeTab, setActiveTab] = useState("overview");
  const [audits, setAudits] = useState({ warnings: [], errors: [], total: 0 });

  // Google Sheets Metadata States
  const [sheetMetadata, setSheetMetadata] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(localStorage.getItem("gs_sheet_name") || "");
  const [sheetId, setSheetId] = useState(localStorage.getItem("gs_sheet_id") || DEFAULT_GOOGLE_SHEET_ID);
  const [apiKey, setApiKey] = useState(localStorage.getItem("gs_api_key") || DEFAULT_GOOGLE_API_KEY);

  // Apps Script & Conversion States
  const [appsScriptUrl, setAppsScriptUrl] = useState(localStorage.getItem("gs_apps_script_url") || DEFAULT_APPS_SCRIPT_URL);
  const [appsScriptToken, setAppsScriptToken] = useState(localStorage.getItem("gs_apps_script_token") || DEFAULT_APPS_SCRIPT_TOKEN);
  const [exchangeRate, setExchangeRate] = useState(localStorage.getItem("gs_exchange_rate") || DEFAULT_EXCHANGE_RATE);
  const [autoConvert, setAutoConvert] = useState(storedAutoConvert === null ? DEFAULT_AUTO_CONVERT : storedAutoConvert !== "false");

  // Load spreadsheet metadata and data if saved in localStorage
  useEffect(() => {
    const savedId = localStorage.getItem("gs_sheet_id") || DEFAULT_GOOGLE_SHEET_ID;
    const savedKey = localStorage.getItem("gs_api_key") || DEFAULT_GOOGLE_API_KEY;

    if (savedId && savedKey) {
      setSheetId(savedId);
      setApiKey(savedKey);
      setSelectedSheet("Все листы (Консолидировано)");
      if (HAS_HOSTED_GOOGLE_CONFIG) {
        localStorage.setItem("gs_sheet_id", savedId);
        localStorage.setItem("gs_api_key", savedKey);
        localStorage.setItem("gs_sheet_name", "Все листы (Консолидировано)");
      }

      // Silently fetch sheets metadata
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${savedId}?key=${savedKey}`)
        .then((res) => {
          if (!res.ok) throw new Error("Metadata fetch failed");
          return res.json();
        })
        .then((data) => {
          if (data.sheets) {
            setSheetMetadata(data.sheets);
            loadConsolidatedData(savedId, savedKey);
          }
        })
        .catch((err) => {
          console.error("Авто-подключение не удалось:", err);
          loadMockData();
        });
    } else {
      loadMockData();
    }
  }, []);

  // Update audits whenever transactions change
  useEffect(() => {
    if (transactions.length > 0) {
      setAudits(runAudits(transactions));
    }
  }, [transactions]);

  useEffect(() => {
    if (HAS_HOSTED_GOOGLE_CONFIG && activeTab === "import") {
      setActiveTab("overview");
    }
  }, [activeTab]);

  const loadMockData = () => {
    // Process initial mock transactions and auto-convert if enabled
    const baseTx = getTransactions();
    const rate = Number(exchangeRate) || 12800;
    
    const convertedTx = baseTx.map(tx => {
      let amount = tx.amount;
      if (autoConvert && amount > 10000) {
        amount = amount / rate;
      }
      return { ...tx, amount };
    });

    setTransactions(convertedTx);
    setSourceName("Демо-данные (Mock Data)");
    setSheetMetadata([]);
    setSelectedSheet("");
    setSheetId("");
    setApiKey("");
    setAppsScriptUrl("");
    setBalanceSourceData(null);
  };

  const handleDataLoaded = (
    newTx, 
    source, 
    metadata = [], 
    activeSheet = "", 
    sId = "", 
    key = "",
    scriptUrl = "",
    scriptToken = "",
    rate = 12800,
    convert = true
  ) => {
    if (Array.isArray(newTx) && newTx.length > 0) {
      setTransactions(newTx);
    }
    setSourceName(source);
    if (metadata.length > 0) {
      const formattedMetadata = typeof metadata[0] === "string" 
        ? metadata.map(title => ({ properties: { title } }))
        : metadata;
      setSheetMetadata(formattedMetadata);
    }
    setSelectedSheet(activeSheet || "Все листы (Консолидировано)");
    if (sId) setSheetId(sId);
    if (key) setApiKey(key);
    if (scriptUrl) setAppsScriptUrl(scriptUrl);
    if (scriptToken) setAppsScriptToken(scriptToken);
    if (rate) setExchangeRate(rate);
    setAutoConvert(convert);
    setBalanceSourceData(null);
    setActiveTab("overview"); // redirect to dashboard overview
  };

  // Load consolidated data from P&L source sheets plus cash movement sheets.
  const loadConsolidatedData = async (sId, key) => {
    try {
      const balanceReportGid = 1842335923;
      let balanceReportSheetName = "";
      try {
        const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sId}?fields=sheets.properties(sheetId,title)&key=${key}`;
        const metaRes = await fetch(metaUrl);
        if (metaRes.ok) {
          const meta = await metaRes.json();
          balanceReportSheetName = meta.sheets
            ?.find((sheet) => sheet.properties?.sheetId === balanceReportGid)
            ?.properties?.title || "";
        }
      } catch (err) {
        console.warn("Не удалось определить лист балансового отчета по gid:", err);
      }

      const sheetConfigs = [
        { key: "trade", name: "Реализация (торговля)", range: "A3:P10389" },
        { key: "production", name: "Реализация (производство)", range: "A3:AF1000" },
        { key: "plasma", name: "Реализация (плазморез)", range: "A4:AA5000", balanceKey: "plasma" },
        { key: "cashback", name: "Реализация (кешбек)", range: "A3:K1000" },
        { key: "expenses", name: "Затраты", range: "A3:I4297" },
        { key: "salary", name: "Зарплата", range: "A3:F5002" },
        { key: "otherIncome", name: "Излишки/потери", range: "A4:I1000" },
        { key: "bankCash", name: "Деньги р/с", range: "A4:J5029", balanceKey: "bankCash" },
        { key: "cashBox", name: "Касса", range: "A4:G128", balanceKey: "cashBox" },
        { key: "ppe", name: "Основное средство", range: "A3:J168", balanceKey: "ppe" },
        { key: "inventoryTrade", name: "ТМЗ", range: "A4:AG10000", balanceKey: "inventoryTrade" },
        { key: "inventoryProduction", name: "ТМЗ (производство)", range: "A4:AD1000", balanceKey: "inventoryProduction" },
        { key: "waste", name: "Деловые отходы", range: "A4:Y1000", balanceKey: "waste" },
        { key: "wasteAccounting", name: "Учёт деловых отходов", range: "A3:O2000", balanceKey: "wasteAccounting" },
        { key: "scrap", name: "Лом", range: "A4:T1000", balanceKey: "scrap" },
        { key: "debtorRegister", name: "Единый реестр дебиторов", range: "A2:D20000", balanceKey: "debtorRegister" },
        { key: "creditorRegister", name: "Единый реестр кредиторов", range: "A3:C20000", balanceKey: "creditorRegister" },
        { key: "equity", name: "Собственный капитал", range: "A4:G1000", balanceKey: "equity" },
        { key: "loans", name: "Долгсрочный займ", range: "A4:K1000", balanceKey: "loans" },
        { key: "relatedSherzod", name: "Выплаты Шерзод Миркомилов", range: "A4:H152", balanceKey: "relatedSherzod" },
        { key: "relatedKichkina", name: "Выплаты Кичкина", range: "A4:H1000", balanceKey: "relatedKichkina" },
        { key: "insightInventoryFinal", name: "Склад Insight", range: "I2:I2", balanceKey: "insightInventoryFinal" },
        { key: "currentBalance", name: "Текущий баланс", range: "F12:F12", balanceKey: "currentBalance" },
        ...(balanceReportSheetName
          ? [{ key: "balanceReportDates", name: balanceReportSheetName, range: "B1:B2", balanceKey: "balanceReportDates" }]
          : [])
      ];
      const targetSheets = sheetConfigs.map(({ name }) => name);
      
      const rangesParams = sheetConfigs
        .map(({ name, range }) => `ranges=${encodeURIComponent(`${name}!${range}`)}`)
        .join('&');
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sId}/values:batchGet?${rangesParams}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER&key=${key}`;
      
      const res = await fetch(url);
      if (!res.ok) {
        let errMsg = "Не удалось загрузить консолидированные данные.";
        try {
          const errData = await res.json();
          if (errData.error && errData.error.message) {
            errMsg = `Google API: ${errData.error.message}`;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (!data.valueRanges) {
        throw new Error("Не удалось прочитать диапазоны листов.");
      }

      const rate = Number(exchangeRate) || 12800;
      let consolidatedTx = [];
      let txIdCounter = 1;
      const balanceRows = {};
      const normalizeSourceDate = (val) => {
        if (val === undefined || val === null || val === "") return "";
        const raw = val.toString().trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
        const serial = Number(raw);
        if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
          const date = new Date(Date.UTC(1899, 11, 30 + Math.floor(serial)));
          return date.toISOString().slice(0, 10);
        }
        let match = raw.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
        if (match) {
          const [, y, m, d] = match;
          return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        }
        match = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
        if (match) {
          const [, d, m, yRaw] = match;
          const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
          return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        }
        return "";
      };
      const parseSourceAmount = (val) => {
        if (typeof val === "number" && Number.isFinite(val)) return val;
        if (val === undefined || val === null || val === "") return 0;
        const normalized = val.toString().replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, "");
        const num = Number(normalized);
        return Number.isFinite(num) ? num : 0;
      };

      // Map sheet data by sheet name
      data.valueRanges.forEach((vr) => {
        const rangeStr = vr.range || "";
        const config = sheetConfigs.find(({ name }) => rangeStr.includes(name));
        const matchName = config?.name || targetSheets.find(s => rangeStr.includes(s));
        if (config?.balanceKey) {
          balanceRows[config.balanceKey] = vr.values || [];
        }
        if (!matchName || !vr.values || vr.values.length === 0) {
          console.warn(`Пропущен или пуст лист: ${rangeStr}`);
          return;
        }

        if (config) {
          const rows = vr.values;
          const getCell = (row, idx) => row[idx] || "";
          const text = (row, idx, fallback = "") => {
            const value = getCell(row, idx);
            return value === "" ? fallback : value.toString().trim();
          };
          const parseAmount = (val) => {
            return typeof val === "number" && Number.isFinite(val) ? val : 0;
          };
          const normalizeDate = (val) => {
            if (val === undefined || val === null || val === "") return "";
            const raw = val.toString().trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

            const serial = Number(raw);
            if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
              const date = new Date(Date.UTC(1899, 11, 30 + serial));
              return date.toISOString().slice(0, 10);
            }

            let match = raw.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
            if (match) {
              const [, y, m, d] = match;
              return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
            }

            match = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
            if (match) {
              const [, d, m, yRaw] = match;
              const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
              return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
            }

            return raw;
          };
          const addTransaction = ({
            date,
            type,
            amount,
            category,
            account,
            counterparty = "",
            description = "",
            pnlGroup = "",
            cashFlowDirection = "",
            cashFlowDetail = ""
          }) => {
            const normalizedDate = normalizeDate(date);
            const finalAmount = Number(amount || 0);
            if (!normalizedDate || !Number.isFinite(finalAmount) || finalAmount === 0) return;
            consolidatedTx.push({
              id: `gs-tx-${config.key}-${txIdCounter++}`,
              date: normalizedDate,
              type,
              amount: finalAmount,
              category,
              account,
              counterparty,
              description,
              pnlGroup,
              cashFlowDirection,
              cashFlowDetail
            });
          };

          rows.forEach((row) => {
            if (config.key === "trade") {
              const date = text(row, 0);
              const salesVal = parseAmount(getCell(row, 11));
              const vatVal = parseAmount(getCell(row, 13));
              const cogsVal = parseAmount(getCell(row, 15));
              addTransaction({
                date,
                type: "Income",
                amount: salesVal - vatVal,
                category: "Выручка, нетто без НДС",
                account: "Р/С Торговля",
                description: `Торговля: выручка нетто (${salesVal} - НДС ${vatVal})`,
                pnlGroup: "revenue"
              });
              addTransaction({
                date,
                type: "Expense",
                amount: cogsVal,
                category: "Себестоимость продаж",
                account: "Р/С Торговля",
                description: "Торговля: себестоимость продаж",
                pnlGroup: "cogs"
              });
            }

            if (config.key === "production") {
              const date = text(row, 0);
              const sales1Val = parseAmount(getCell(row, 8));
              const sales2Val = parseAmount(getCell(row, 12));
              const rawVal = parseAmount(getCell(row, 16));
              const makeVal = parseAmount(getCell(row, 20));
              const transportVal = parseAmount(getCell(row, 23));
              const scrapVal = parseAmount(getCell(row, 26));
              const lomVal = parseAmount(getCell(row, 29));
              const vatVal = parseAmount(getCell(row, 31));
              addTransaction({
                date,
                type: "Income",
                amount: sales1Val + sales2Val - vatVal,
                category: "Выручка, нетто без НДС",
                account: "Р/С Производство",
                description: `Производство: выручка нетто (${sales1Val} + ${sales2Val} - НДС ${vatVal})`,
                pnlGroup: "revenue"
              });
              addTransaction({
                date,
                type: "Expense",
                amount: rawVal + makeVal + transportVal - scrapVal - lomVal,
                category: "Себестоимость продаж",
                account: "Р/С Производство",
                description: "Производство: себестоимость продаж",
                pnlGroup: "cogs"
              });
            }

            if (config.key === "plasma") {
              const date = text(row, 25);
              const salesVal = parseAmount(getCell(row, 19));
              const cuttingVal = parseAmount(getCell(row, 20));
              const scrapVal = parseAmount(getCell(row, 21));
              const lomVal = parseAmount(getCell(row, 22));
              const rawVal = parseAmount(getCell(row, 26));
              addTransaction({
                date,
                type: "Income",
                amount: salesVal,
                category: "Выручка, нетто без НДС",
                account: "Р/С Плазморез",
                description: "Плазморез: выручка",
                pnlGroup: "revenue"
              });
              addTransaction({
                date,
                type: "Expense",
                amount: cuttingVal + rawVal - scrapVal - lomVal,
                category: "Себестоимость продаж",
                account: "Р/С Плазморез",
                description: "Плазморез: себестоимость продаж",
                pnlGroup: "cogs"
              });
            }

            if (config.key === "cashback") {
              addTransaction({
                date: text(row, 0),
                type: "Income",
                amount: parseAmount(getCell(row, 10)),
                category: "Кешбек",
                account: "Кешбек",
                counterparty: "Банк",
                description: "Кешбек",
                pnlGroup: "otherIncome"
              });
            }

            if (config.key === "expenses") {
              const date = text(row, 0);
              const category = text(row, 1, "Административные расходы");
              const payMethod = text(row, 2, "Не указан");
              const amount = parseAmount(getCell(row, 4));
              const vat = parseAmount(getCell(row, 8));
              addTransaction({
                date,
                type: "Expense",
                amount: amount - vat,
                category,
                account: payMethod,
                description: `Затраты: ${category}`,
                pnlGroup: getFormulaPnLGroup(category)
              });
            }

            if (config.key === "salary") {
              const category = text(row, 1, "Зарплата");
              addTransaction({
                date: text(row, 0),
                type: "Expense",
                amount: parseAmount(getCell(row, 5)),
                category,
                account: text(row, 3, "Не указан"),
                counterparty: "Сотрудники",
                description: `Зарплата: ${category}`,
                pnlGroup: getFormulaPnLGroup(category)
              });
            }

            if (config.key === "otherIncome") {
              addTransaction({
                date: text(row, 0),
                type: "Income",
                amount: parseAmount(getCell(row, 3)),
                category: "Излишки",
                account: "Склад",
                counterparty: "Склад",
                description: "Складские излишки",
                pnlGroup: "otherIncome"
              });
              addTransaction({
                date: text(row, 5),
                type: "Expense",
                amount: parseAmount(getCell(row, 8)),
                category: "Потери",
                account: "Склад",
                counterparty: "Склад",
                description: "Складские потери",
                pnlGroup: "otherIncome"
              });
            }

            if (config.key === "bankCash") {
              addTransaction({
                date: getCell(row, 2),
                type: "Income",
                amount: parseAmount(getCell(row, 4)),
                category: "Движение денег",
                account: "Деньги р/с",
                description: text(row, 3),
                pnlGroup: "excluded",
                cashFlowDirection: "in",
                cashFlowDetail: text(row, 3)
              });
              addTransaction({
                date: getCell(row, 7),
                type: "Expense",
                amount: parseAmount(getCell(row, 9)),
                category: "Движение денег",
                account: "Деньги р/с",
                description: text(row, 8),
                pnlGroup: "excluded",
                cashFlowDirection: "out",
                cashFlowDetail: text(row, 8)
              });
            }

            if (config.key === "cashBox") {
              addTransaction({
                date: getCell(row, 0),
                type: "Income",
                amount: parseAmount(getCell(row, 2)),
                category: "Движение денег",
                account: "Касса",
                description: text(row, 1),
                pnlGroup: "excluded",
                cashFlowDirection: "in",
                cashFlowDetail: text(row, 1)
              });
              addTransaction({
                date: getCell(row, 4),
                type: "Expense",
                amount: parseAmount(getCell(row, 6)),
                category: "Движение денег",
                account: "Касса",
                description: text(row, 5),
                pnlGroup: "excluded",
                cashFlowDirection: "out",
                cashFlowDetail: text(row, 5)
              });
            }
          });
          return;
        }

        if (vr.values.length < 2) {
          console.warn(`Пропущен или пуст лист: ${rangeStr}`);
          return;
        }

        const [headers, ...rows] = vr.values;
        
        // Helper to find column index case-insensitive
        const findCol = (regex) => headers.findIndex(h => regex.test(h));
        
        // Helper to parse cell amounts (supports UZS to USD conversion)
        const parseAmount = (val) => {
          if (!val) return 0;
          let num = parseFloat(val.toString().replace(/[^\d.-]/g, "")) || 0;
          if (autoConvert && Math.abs(num) > 10000) {
            num = num / rate;
          }
          return num;
        };

        const dateIdx = findCol(/дата|date|день|число/i);
        if (dateIdx === -1) {
          console.warn(`Лист ${matchName} пропущен, так как не найдена колонка "Дата"`);
          return;
        }

        // Custom mappers per sheet based on formulas
        if (matchName === "Реализация (торговля)") {
          const salesIdx = findCol(/продажи|выручка|sales|revenue/i);
          const vatIdx = findCol(/ндс|vat/i);
          const cogsIdx = findCol(/cogs|себестоимость|закупки/i);
          const accIdx = findCol(/счет|кошелек|касса|account/i);
          const cptIdx = findCol(/контрагент|партнер|получатель|клиент|counterparty/i);
          const descIdx = findCol(/описание|комментарий|детали|description/i);

          rows.forEach((row, rIdx) => {
            const date = row[dateIdx];
            if (!date) return;

            const salesVal = parseAmount(row[salesIdx]);
            const vatVal = vatIdx !== -1 ? parseAmount(row[vatIdx]) : 0;
            const cogsVal = cogsIdx !== -1 ? parseAmount(row[cogsIdx]) : 0;
            const account = accIdx !== -1 ? row[accIdx] || "Р/С Торговля" : "Р/С Торговля";
            const counterparty = cptIdx !== -1 ? row[cptIdx] || "" : "";
            const desc = descIdx !== -1 ? row[descIdx] || "" : "";

            const revenueAmount = salesVal - vatVal;
            
            // 1. Revenue transaction
            if (revenueAmount > 0) {
              consolidatedTx.push({
                id: `gs-tx-${matchName}-${rIdx}-rev-${txIdCounter++}`,
                date,
                type: "Income",
                amount: revenueAmount,
                category: "Выручка: Продажи товаров",
                account,
                counterparty,
                description: `Торговля: Выручка нетто (Продажи ${salesVal} - НДС ${vatVal}). ${desc}`
              });
            }

            // 2. VAT tax transaction
            if (vatVal > 0) {
              consolidatedTx.push({
                id: `gs-tx-${matchName}-${rIdx}-vat-${txIdCounter++}`,
                date,
                type: "Expense",
                amount: vatVal,
                category: "НДС",
                account,
                counterparty: "ФНС",
                description: `Торговля: НДС с продаж. ${desc}`
              });
            }

            // 3. COGS transaction
            if (cogsVal > 0) {
              consolidatedTx.push({
                id: `gs-tx-${matchName}-${rIdx}-cogs-${txIdCounter++}`,
                date,
                type: "Expense",
                amount: cogsVal,
                category: "Себестоимость: Закупки сырья",
                account,
                counterparty,
                description: `Торговля: Себестоимость (COGS). ${desc}`
              });
            }
          });
        } 
        
        else if (matchName === "Реализация (производство)") {
          const sales1Idx = findCol(/продажи1|sales1/i);
          const sales2Idx = findCol(/продажи2|sales2/i);
          const vatIdx = findCol(/ндс|vat/i);
          const rawIdx = findCol(/сырье|сырё|сырьё|материал/i);
          const mfgIdx = findCol(/изготовление|производство|работа/i);
          const transpIdx = findCol(/транспорт|доставка/i);
          const defectIdx = findCol(/брак/i);
          const scrapIdx = findCol(/лом/i);
          const accIdx = findCol(/счет|кошелек|касса|account/i);
          const cptIdx = findCol(/контрагент|партнер|получатель|клиент|counterparty/i);
          const descIdx = findCol(/описание|комментарий|детали|description/i);

          rows.forEach((row, rIdx) => {
            const date = row[dateIdx];
            if (!date) return;

            const sales1Val = sales1Idx !== -1 ? parseAmount(row[sales1Idx]) : 0;
            const sales2Val = sales2Idx !== -1 ? parseAmount(row[sales2Idx]) : 0;
            const vatVal = vatIdx !== -1 ? parseAmount(row[vatIdx]) : 0;
            
            const rawVal = rawIdx !== -1 ? parseAmount(row[rawIdx]) : 0;
            const mfgVal = mfgIdx !== -1 ? parseAmount(row[mfgIdx]) : 0;
            const transpVal = transpIdx !== -1 ? parseAmount(row[transpIdx]) : 0;
            const defectVal = defectIdx !== -1 ? parseAmount(row[defectIdx]) : 0;
            const scrapVal = scrapIdx !== -1 ? parseAmount(row[scrapIdx]) : 0;

            const account = accIdx !== -1 ? row[accIdx] || "Р/С Производство" : "Р/С Производство";
            const counterparty = cptIdx !== -1 ? row[cptIdx] || "" : "";
            const desc = descIdx !== -1 ? row[descIdx] || "" : "";

            const revenueAmount = sales1Val + sales2Val - vatVal;
            const cogsAmount = rawVal + mfgVal + transpVal - defectVal - scrapVal;

            // 1. Revenue
            if (revenueAmount > 0) {
              consolidatedTx.push({
                id: `gs-tx-${matchName}-${rIdx}-rev-${txIdCounter++}`,
                date,
                type: "Income",
                amount: revenueAmount,
                category: "Выручка: Продажи товаров",
                account,
                counterparty,
                description: `Производство: Выручка (Пр1 ${sales1Val} + Пр2 ${sales2Val} - НДС ${vatVal}). ${desc}`
              });
            }

            // 2. VAT tax
            if (vatVal > 0) {
              consolidatedTx.push({
                id: `gs-tx-${matchName}-${rIdx}-vat-${txIdCounter++}`,
                date,
                type: "Expense",
                amount: vatVal,
                category: "НДС",
                account,
                counterparty: "ФНС",
                description: `Производство: НДС с продаж. ${desc}`
              });
            }

            // 3. COGS
            if (cogsAmount > 0) {
              consolidatedTx.push({
                id: `gs-tx-${matchName}-${rIdx}-cogs-${txIdCounter++}`,
                date,
                type: "Expense",
                amount: cogsAmount,
                category: "Себестоимость: Закупки сырья",
                account,
                counterparty,
                description: `Производство: Себестоимость (Сырье ${rawVal} + Изготовление ${mfgVal} + Трансп ${transpVal} - Брак ${defectVal} - Лом ${scrapVal}). ${desc}`
              });
            }
          });
        } 
        
        else if (matchName === "Реализация (плазморез)") {
          const salesIdx = findCol(/продажи|выручка|sales|revenue/i);
          const cuttingIdx = findCol(/резка|плазма/i);
          const rawIdx = findCol(/сырье|сырё|сырьё|материал/i);
          const defectIdx = findCol(/брак/i);
          const scrapIdx = findCol(/лом/i);
          const accIdx = findCol(/счет|кошелек|касса|account/i);
          const cptIdx = findCol(/контрагент|партнер|получатель|клиент|counterparty/i);
          const descIdx = findCol(/описание|комментарий|детали|description/i);

          rows.forEach((row, rIdx) => {
            const date = row[dateIdx];
            if (!date) return;

            const salesVal = salesIdx !== -1 ? parseAmount(row[salesIdx]) : 0;
            const cuttingVal = cuttingIdx !== -1 ? parseAmount(row[cuttingIdx]) : 0;
            const rawVal = rawIdx !== -1 ? parseAmount(row[rawIdx]) : 0;
            const defectVal = defectIdx !== -1 ? parseAmount(row[defectIdx]) : 0;
            const scrapVal = scrapIdx !== -1 ? parseAmount(row[scrapIdx]) : 0;

            const account = accIdx !== -1 ? row[accIdx] || "Р/С Плазморез" : "Р/С Плазморез";
            const counterparty = cptIdx !== -1 ? row[cptIdx] || "" : "";
            const desc = descIdx !== -1 ? row[descIdx] || "" : "";

            const cogsAmount = cuttingVal + rawVal - defectVal - scrapVal;

            // 1. Revenue
            if (salesVal > 0) {
              consolidatedTx.push({
                id: `gs-tx-${matchName}-${rIdx}-rev-${txIdCounter++}`,
                date,
                type: "Income",
                amount: salesVal,
                category: "Выручка: Услуги консалтинга",
                account,
                counterparty,
                description: `Плазморез: Выручка от резки. ${desc}`
              });
            }

            // 2. COGS
            if (cogsAmount > 0) {
              consolidatedTx.push({
                id: `gs-tx-${matchName}-${rIdx}-cogs-${txIdCounter++}`,
                date,
                type: "Expense",
                amount: cogsAmount,
                category: "Себестоимость: Закупки сырья",
                account,
                counterparty,
                description: `Плазморез: Себестоимость (Резка ${cuttingVal} + Сырье ${rawVal} - Брак ${defectVal} - Лом ${scrapVal}). ${desc}`
              });
            }
          });
        } 
        
        else if (matchName === "Реализация (кешбек)") {
          const cashbackIdx = findCol(/кешбек|кешбэк|сумма|выплата/i);
          const accIdx = findCol(/счет|кошелек|касса|account/i);
          const descIdx = findCol(/описание|комментарий|детали|description/i);

          rows.forEach((row, rIdx) => {
            const date = row[dateIdx];
            if (!date) return;

            const cashbackVal = cashbackIdx !== -1 ? parseAmount(row[cashbackIdx]) : 0;
            const account = accIdx !== -1 ? row[accIdx] || "Кешбэк-счет" : "Кешбэк-счет";
            const desc = descIdx !== -1 ? row[descIdx] || "" : "";

            if (cashbackVal > 0) {
              consolidatedTx.push({
                id: `gs-tx-${matchName}-${rIdx}-rev-${txIdCounter++}`,
                date,
                type: "Income",
                amount: cashbackVal,
                category: "Выручка: Лицензии ПО",
                account,
                counterparty: "Банк Кешбэк",
                description: `Кешбэк по карте. ${desc}`
              });
            }
          });
        } 
        
        else if (matchName === "Затраты") {
          const catIdx = findCol(/категория|статья|направление/i);
          const sumIdx = findCol(/сумма|amount/i);
          const vatIdx = findCol(/ндс|vat/i);
          const accIdx = findCol(/счет|форма|оплат/i);
          const cptIdx = findCol(/контрагент|получатель/i);
          const descIdx = findCol(/описание|комментарий/i);

          rows.forEach((row, rIdx) => {
            const date = row[dateIdx];
            if (!date) return;

            const category = catIdx !== -1 ? row[catIdx] || "ОПЕКС: Софт и облако" : "ОПЕКС: Софт и облако";
            const sumVal = sumIdx !== -1 ? parseAmount(row[sumIdx]) : 0;
            const vatVal = vatIdx !== -1 ? parseAmount(row[vatIdx]) : 0;
            const account = accIdx !== -1 ? row[accIdx] || "Касса Офис" : "Касса Офис";
            const counterparty = cptIdx !== -1 ? row[cptIdx] || "" : "";
            const desc = descIdx !== -1 ? row[descIdx] || "" : "";

            const expenseAmount = sumVal - vatVal;

            if (expenseAmount > 0) {
              consolidatedTx.push({
                id: `gs-tx-${matchName}-${rIdx}-exp-${txIdCounter++}`,
                date,
                type: "Expense",
                amount: expenseAmount,
                category,
                account,
                counterparty,
                description: desc
              });
            }

            if (vatVal > 0) {
              consolidatedTx.push({
                id: `gs-tx-${matchName}-${rIdx}-vat-${txIdCounter++}`,
                date,
                type: "Expense",
                amount: vatVal,
                category: "НДС",
                account,
                counterparty: "ФНС",
                description: `НДС от расходов (${category}). ${desc}`
              });
            }
          });
        } 
        
        else if (matchName === "Зарплата") {
          const sumIdx = findCol(/сумма|amount/i);
          const employeeIdx = findCol(/сотрудник|фио|получатель/i);
          const accIdx = findCol(/счет|форма|оплат/i);
          const descIdx = findCol(/описание|комментарий/i);

          rows.forEach((row, rIdx) => {
            const date = row[dateIdx];
            if (!date) return;

            const sumVal = sumIdx !== -1 ? parseAmount(row[sumIdx]) : 0;
            const employee = employeeIdx !== -1 ? row[employeeIdx] || "" : "";
            const account = accIdx !== -1 ? row[accIdx] || "Касса Офис" : "Касса Офис";
            const desc = descIdx !== -1 ? row[descIdx] || "" : "";

            if (sumVal > 0) {
              consolidatedTx.push({
                id: `gs-tx-${matchName}-${rIdx}-sal-${txIdCounter++}`,
                date,
                type: "Expense",
                amount: sumVal,
                category: "ОПЕКС: Заработная плата",
                account,
                counterparty: employee || "Сотрудники",
                description: `Выплата ЗП сотруднику ${employee}. ${desc}`
              });
            }
          });
        } 
        
        else if (matchName === "Излишки/потери") {
          const surplusIdx = findCol(/излишки|доход/i);
          const lossIdx = findCol(/потери|убыток|расход/i);
          const accIdx = findCol(/счет|кошелек|касса|account/i);
          const descIdx = findCol(/описание|комментарий/i);

          rows.forEach((row, rIdx) => {
            const date = row[dateIdx];
            if (!date) return;

            const surplusVal = surplusIdx !== -1 ? parseAmount(row[surplusIdx]) : 0;
            const lossVal = lossIdx !== -1 ? parseAmount(row[lossIdx]) : 0;
            const account = accIdx !== -1 ? row[accIdx] || "Касса Офис" : "Касса Офис";
            const desc = descIdx !== -1 ? row[descIdx] || "" : "";

            if (surplusVal > 0) {
              consolidatedTx.push({
                id: `gs-tx-${matchName}-${rIdx}-sur-${txIdCounter++}`,
                date,
                type: "Income",
                amount: surplusVal,
                category: "Выручка: Продажи товаров",
                account,
                counterparty: "Склад",
                description: `Складские излишки. ${desc}`
              });
            }

            if (lossVal > 0) {
              consolidatedTx.push({
                id: `gs-tx-${matchName}-${rIdx}-los-${txIdCounter++}`,
                date,
                type: "Expense",
                amount: lossVal,
                category: "Себестоимость: Логистика и доставка",
                account,
                counterparty: "Склад",
                description: `Складские потери/брак. ${desc}`
              });
            }
          });
        }
      });

      if (consolidatedTx.length === 0) {
        throw new Error("Не найдено корректных транзакций на всех 7 листах Google Таблицы.");
      }

      setTransactions(consolidatedTx);
      setBalanceSourceData({
        mode: "formula",
        rows: balanceRows,
        insightInventoryFinal: parseSourceAmount(balanceRows.insightInventoryFinal?.[0]?.[0]),
        registerStartDate: normalizeSourceDate(balanceRows.currentBalance?.[0]?.[0]),
        reportStartDate: normalizeSourceDate(balanceRows.balanceReportDates?.[0]?.[0]),
        reportEndDate: normalizeSourceDate(balanceRows.balanceReportDates?.[1]?.[0])
      });
      setSelectedSheet("Все листы (Консолидировано)");
      setSourceName(`Google Sheets (Консолидация PnL + Cash Flow)`);
      localStorage.setItem("gs_sheet_name", "Все листы (Консолидировано)");
      return true;
    } catch (err) {
      alert(`Ошибка при консолидации листов: ${err.message}`);
      return false;
    }
  };

  // Re-fetch transactions for a specific sheet or all sheets consolidated
  const loadSheetData = async (sId, key, targetSheetName) => {
    if (!targetSheetName || targetSheetName === "Все листы (Консолидировано)") {
      return loadConsolidatedData(sId, key);
    }
    
    try {
      const range = `${targetSheetName}!A1:G2000`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sId}/values/${encodeURIComponent(range)}?key=${key}`;
      
      const res = await fetch(url);
      if (!res.ok) {
        let errMsg = `Не удалось загрузить данные с листа "${targetSheetName}".`;
        try {
          const errData = await res.json();
          if (errData.error && errData.error.message) {
            errMsg = `Google API: ${errData.error.message}`;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (!data.values || data.values.length < 2) {
        throw new Error(`Лист "${targetSheetName}" пуст или не содержит транзакций.`);
      }

      const [headers, ...rows] = data.values;
      const mapping = {
        dateIdx: headers.findIndex(h => /дата|date|день|число/i.test(h)),
        typeIdx: headers.findIndex(h => /тип|type|движение|д\/р/i.test(h)),
        amountIdx: headers.findIndex(h => /сумма|amount|расход|доход|платеж|величина|цена|итого|total/i.test(h)),
        categoryIdx: headers.findIndex(h => /категория|статья|category/i.test(h)),
        accountIdx: headers.findIndex(h => /счет|кошелек|касса|account|форма|оплат/i.test(h)),
        counterpartyIdx: headers.findIndex(h => /контрагент|партнер|кому|от кого|получатель|отправитель|counterparty/i.test(h)),
        descIdx: headers.findIndex(h => /описание|назначение|детали|комментарий|description/i.test(h)),
      };

      if (mapping.dateIdx === -1 || mapping.amountIdx === -1) {
        const missing = [];
        if (mapping.dateIdx === -1) missing.push('"Дата" (или Date/День)');
        if (mapping.amountIdx === -1) missing.push('"Сумма" (или Amount/Расход)');
        throw new Error(`В шапке листа "${targetSheetName}" отсутствуют обязательные колонки: ${missing.join(", ")}. Найденные колонки: ${headers.filter(Boolean).join(", ")}`);
      }

      const rate = Number(exchangeRate) || 12800;

      const parsedTransactions = rows.map((row, idx) => {
        const getVal = (idx) => idx !== -1 ? row[idx] || "" : "";
        let amount = parseFloat(getVal(mapping.amountIdx).toString().replace(/[^\d.-]/g, "")) || 0;
        
        // Auto-convert UZS to USD if enabled and amount is > 10,000
        if (autoConvert && Math.abs(amount) > 10000) {
          amount = amount / rate;
        }

        const rawType = getVal(mapping.typeIdx);
        let type = "Expense";
        if (/доход|поступление|income|plus|in/i.test(rawType)) {
          type = "Income";
        }

        return {
          id: `gs-tx-${idx + 1}`,
          date: getVal(mapping.dateIdx),
          type: type,
          amount: Math.abs(amount),
          category: getVal(mapping.categoryIdx),
          account: getVal(mapping.accountIdx),
          counterparty: getVal(mapping.counterpartyIdx),
          description: getVal(mapping.descIdx)
        };
      }).filter(tx => tx.date && tx.amount);

      if (parsedTransactions.length === 0) {
        throw new Error(`На листе "${targetSheetName}" найдено 0 транзакций с заполненной датой и ненулевой суммой.`);
      }

      setTransactions(parsedTransactions);
      setBalanceSourceData(null);
      setSelectedSheet(targetSheetName);
      setSourceName(`Google Sheets (Лист: ${targetSheetName})`);
      localStorage.setItem("gs_sheet_name", targetSheetName);
      return true;
    } catch (err) {
      alert(`Ошибка при смене листа: ${err.message}`);
      return false;
    }
  };

  const refreshDefaultData = async () => {
    const defaultSheetId = sheetId || localStorage.getItem("gs_sheet_id") || DEFAULT_GOOGLE_SHEET_ID;
    const defaultApiKey = apiKey || localStorage.getItem("gs_api_key") || DEFAULT_GOOGLE_API_KEY;

    if (!defaultSheetId || !defaultApiKey) {
      loadMockData();
      return;
    }

    setSheetId(defaultSheetId);
    setApiKey(defaultApiKey);
    setSelectedSheet("Все листы (Консолидировано)");
    localStorage.setItem("gs_sheet_id", defaultSheetId);
    localStorage.setItem("gs_api_key", defaultApiKey);
    localStorage.setItem("gs_sheet_name", "Все листы (Консолидировано)");

    try {
      const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${defaultSheetId}?key=${defaultApiKey}`;
      const metadataRes = await fetch(metadataUrl);
      if (metadataRes.ok) {
        const metadata = await metadataRes.json();
        if (metadata.sheets) setSheetMetadata(metadata.sheets);
      }
    } catch (err) {
      console.warn("Не удалось обновить metadata Google Sheets:", err);
    }

    const success = await loadConsolidatedData(defaultSheetId, defaultApiKey);
    if (!success) loadMockData();
  };

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  return (
    <div className="app-container">
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="sidebar-brand" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "36px", paddingLeft: "8px" }}>
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, var(--primary), var(--info))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--glow-primary)"
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: "800", letterSpacing: "-0.03em", margin: 0, color: "white" }}>
              FINANCE.FLOW
            </h1>
            <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>
              USD Dashboard
            </span>
          </div>
        </div>

        {/* NAV ITEMS */}
        <nav className="sidebar-nav" style={{ display: "flex", flexDirection: "column", gap: "6px", flexGrow: 1 }}>
          
          <button
            className={`btn btn-secondary ${activeTab === "overview" ? "btn-primary" : ""}`}
            style={{ justifyContent: "flex-start", width: "100%", border: "none", backgroundColor: activeTab === "overview" ? "var(--primary)" : "transparent" }}
            onClick={() => setActiveTab("overview")}
          >
            📊 Обзор Дашборда
          </button>

          <button
            className={`btn btn-secondary ${activeTab === "transaction-manager" ? "btn-primary" : ""}`}
            style={{ justifyContent: "flex-start", width: "100%", border: "none", backgroundColor: activeTab === "transaction-manager" ? "var(--primary)" : "transparent" }}
            onClick={() => setActiveTab("transaction-manager")}
          >
            📝 Ввод операций
          </button>

          <button
            className={`btn btn-secondary ${activeTab === "budget-goals" ? "btn-primary" : ""}`}
            style={{ justifyContent: "flex-start", width: "100%", border: "none", backgroundColor: activeTab === "budget-goals" ? "var(--primary)" : "transparent" }}
            onClick={() => setActiveTab("budget-goals")}
          >
            🎯 Бюджеты и Цели
          </button>

          <button
            className={`btn btn-secondary ${activeTab === "pnl" ? "btn-primary" : ""}`}
            style={{ justifyContent: "flex-start", width: "100%", border: "none", backgroundColor: activeTab === "pnl" ? "var(--primary)" : "transparent" }}
            onClick={() => setActiveTab("pnl")}
          >
            📈 Отчет PnL
          </button>

          <button
            className={`btn btn-secondary ${activeTab === "cashflow" ? "btn-primary" : ""}`}
            style={{ justifyContent: "flex-start", width: "100%", border: "none", backgroundColor: activeTab === "cashflow" ? "var(--primary)" : "transparent" }}
            onClick={() => setActiveTab("cashflow")}
          >
            💵 Cash Flow
          </button>

          <button
            className={`btn btn-secondary ${activeTab === "balance" ? "btn-primary" : ""}`}
            style={{ justifyContent: "flex-start", width: "100%", border: "none", backgroundColor: activeTab === "balance" ? "var(--primary)" : "transparent" }}
            onClick={() => setActiveTab("balance")}
          >
            ⚖️ Балансовый отчет
          </button>

          <button
            className={`btn btn-secondary ${activeTab === "reconciliation" ? "btn-primary" : ""}`}
            style={{ justifyContent: "flex-start", width: "100%", border: "none", backgroundColor: activeTab === "reconciliation" ? "var(--primary)" : "transparent" }}
            onClick={() => setActiveTab("reconciliation")}
          >
            🤝 Акт сверки
          </button>

          <button
            className={`btn btn-secondary ${activeTab === "audits" ? "btn-primary" : ""}`}
            style={{ 
              justifyContent: "space-between", 
              width: "100%", 
              border: "none", 
              backgroundColor: activeTab === "audits" ? "var(--primary)" : "transparent" 
            }}
            onClick={() => setActiveTab("audits")}
          >
            <span>🛡️ Центр аудита</span>
            {audits.total > 0 && (
              <span className={`badge ${audits.errors.length > 0 ? 'badge-error' : 'badge-warning'}`} style={{ padding: "2px 6px", fontSize: "10px" }}>
                {audits.total}
              </span>
            )}
          </button>

          <button
            className={`btn btn-secondary ${activeTab === "graph" ? "btn-primary" : ""}`}
            style={{ justifyContent: "flex-start", width: "100%", border: "none", backgroundColor: activeTab === "graph" ? "var(--primary)" : "transparent" }}
            onClick={() => setActiveTab("graph")}
          >
            🕸️ Схема данных (Graph)
          </button>

          {sheetMetadata.length > 0 && (
            <button
              className={`btn btn-secondary ${activeTab === "sheets" ? "btn-primary" : ""}`}
              style={{ 
                justifyContent: "flex-start", 
                width: "100%", 
                border: "none", 
                backgroundColor: activeTab === "sheets" ? "var(--primary)" : "transparent",
                animation: "fadeIn 0.3s forwards"
              }}
              onClick={() => setActiveTab("sheets")}
            >
              📁 Листы таблицы ({sheetMetadata.length})
            </button>
          )}

        </nav>

        {!HAS_HOSTED_GOOGLE_CONFIG && (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
            <button
              className={`btn btn-secondary ${activeTab === "import" ? "btn-primary" : ""}`}
              style={{ justifyContent: "flex-start", width: "100%", border: "none", backgroundColor: activeTab === "import" ? "var(--primary)" : "transparent" }}
              onClick={() => setActiveTab("import")}
            >
              ⚙️ Подключение Sheets
            </button>
          </div>
        )}
      </aside>

      {/* RIGHT CONTENT WORKSPACE */}
      <main className="main-content">
        
        {/* HEADER */}
        <header className="header">
          <div className="header-source" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: sourceName.includes("Mock") ? "var(--warning)" : "var(--success)",
              boxShadow: sourceName.includes("Mock") ? "0 0 8px var(--warning)" : "0 0 8px var(--success)"
            }}></div>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Источник: <strong style={{ color: "white" }}>{sourceName}</strong>
            </span>
          </div>

          <div className="header-actions" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
              Загружено транзакций: <strong style={{ color: "white" }}>{transactions.length}</strong>
            </span>
            <button className="btn btn-secondary" style={{ padding: "8px 12px", fontSize: "12px" }} onClick={refreshDefaultData}>
              🔄 {sheetId && apiKey ? "Обновить базу" : "Сбросить данные"}
            </button>
            <button className="btn btn-secondary" style={{ padding: "8px 12px", fontSize: "12px" }} onClick={handleLogout}>
              Выйти
            </button>
          </div>
        </header>

        {/* CONTENT VIEWPORT */}
        <div className="content-body">
          {activeTab === "overview" && (
            <DashboardOverview 
              transactions={transactions} 
              audits={audits}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "transaction-manager" && (
            <TransactionManager 
              transactions={transactions} 
              sheetId={sheetId}
              apiKey={apiKey}
              appsScriptUrl={appsScriptUrl}
              appsScriptToken={appsScriptToken}
              exchangeRate={exchangeRate}
              autoConvert={autoConvert}
              onTransactionAdded={(updatedTx, source) => {
                if (updatedTx) {
                  setTransactions(updatedTx);
                  if (source) setSourceName(source);
                } else {
                  loadSheetData(sheetId, apiKey, selectedSheet);
                }
              }}
            />
          )}

          {activeTab === "budget-goals" && (
            <BudgetGoalManager 
              transactions={transactions}
              sheetId={sheetId}
              apiKey={apiKey}
              appsScriptUrl={appsScriptUrl}
              appsScriptToken={appsScriptToken}
              exchangeRate={exchangeRate}
              autoConvert={autoConvert}
              onBudgetOrGoalUpdated={() => {
                loadSheetData(sheetId, apiKey, selectedSheet);
              }}
            />
          )}

          {activeTab === "pnl" && (
            <PnLReport transactions={transactions} />
          )}

          {activeTab === "cashflow" && (
            <CashFlowReport transactions={transactions} />
          )}

          {activeTab === "balance" && (
            <BalanceSheet transactions={transactions} balanceSourceData={balanceSourceData} />
          )}

          {activeTab === "reconciliation" && (
            <ReconciliationAct transactions={transactions} />
          )}

          {activeTab === "audits" && (
            <AuditCenter transactions={transactions} />
          )}

          {activeTab === "graph" && (
            <DataGraphView sheetMetadata={sheetMetadata} />
          )}

          {activeTab === "sheets" && (
            <GoogleSheetsTabs 
              sheetMetadata={sheetMetadata}
              selectedSheet={selectedSheet}
              sheetId={sheetId}
              apiKey={apiKey}
              onSelectSheet={(name) => loadSheetData(sheetId, apiKey, name)}
            />
          )}

          {!HAS_HOSTED_GOOGLE_CONFIG && activeTab === "import" && (
            <DataImporter 
              onDataLoaded={handleDataLoaded} 
              currentSource={sourceName} 
              onLoadMockData={refreshDefaultData}
              loadConsolidatedData={loadConsolidatedData}
            />
          )}
        </div>

      </main>
    </div>
  );
}
