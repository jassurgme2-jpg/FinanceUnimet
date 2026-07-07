import React, { useState } from "react";
import {
  DEFAULT_APPS_SCRIPT_TOKEN,
  DEFAULT_APPS_SCRIPT_URL,
  DEFAULT_AUTO_CONVERT,
  DEFAULT_EXCHANGE_RATE,
  DEFAULT_GOOGLE_API_KEY,
  DEFAULT_GOOGLE_SHEET_ID,
  HAS_HOSTED_GOOGLE_CONFIG
} from "../config";

export default function DataImporter({ onDataLoaded, currentSource, onLoadMockData, loadConsolidatedData }) {
  const storedAutoConvert = localStorage.getItem("gs_auto_convert");
  const [sheetId, setSheetId] = useState(localStorage.getItem("gs_sheet_id") || DEFAULT_GOOGLE_SHEET_ID);
  const [apiKey, setApiKey] = useState(localStorage.getItem("gs_api_key") || DEFAULT_GOOGLE_API_KEY);
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(localStorage.getItem("gs_sheet_name") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Apps Script API Config States
  const [appsScriptUrl, setAppsScriptUrl] = useState(localStorage.getItem("gs_apps_script_url") || DEFAULT_APPS_SCRIPT_URL);
  const [appsScriptToken, setAppsScriptToken] = useState(localStorage.getItem("gs_apps_script_token") || DEFAULT_APPS_SCRIPT_TOKEN);
  const [exchangeRate, setExchangeRate] = useState(localStorage.getItem("gs_exchange_rate") || DEFAULT_EXCHANGE_RATE);
  const [autoConvert, setAutoConvert] = useState(storedAutoConvert === null ? DEFAULT_AUTO_CONVERT : storedAutoConvert !== "false");

  const loadDataForSheet = async (cleanSheetId, targetSheetName, titlesList = []) => {
    setLoading(true);
    setError(null);
    try {
      const range = `${targetSheetName}!A1:G2000`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanSheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
      
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

      localStorage.setItem("gs_sheet_id", cleanSheetId);
      localStorage.setItem("gs_api_key", apiKey);
      localStorage.setItem("gs_sheet_name", targetSheetName);
      localStorage.setItem("gs_apps_script_url", appsScriptUrl);
      localStorage.setItem("gs_apps_script_token", appsScriptToken);
      localStorage.setItem("gs_exchange_rate", exchangeRate);
      localStorage.setItem("gs_auto_convert", autoConvert ? "true" : "false");

      onDataLoaded(
        parsedTransactions, 
        `Google Sheets (Лист: ${targetSheetName})`, 
        titlesList.length > 0 ? titlesList : availableSheets, 
        targetSheetName, 
        cleanSheetId, 
        apiKey,
        appsScriptUrl,
        appsScriptToken,
        rate,
        autoConvert
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectAPI = async (e) => {
    if (e) e.preventDefault();
    if (!sheetId || !apiKey) {
      setError("Пожалуйста, заполните ID таблицы и API Ключ");
      return;
    }

    let cleanSheetId = sheetId.trim();
    if (cleanSheetId.startsWith("http://") || cleanSheetId.startsWith("https://")) {
      const match = cleanSheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        cleanSheetId = match[1];
      } else {
        const projectMatch = cleanSheetId.match(/\/projects\/([a-zA-Z0-9-_]+)/) || cleanSheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (projectMatch && projectMatch[1]) {
          cleanSheetId = projectMatch[1];
        }
      }
    }

    setLoading(true);
    setError(null);

    try {
      const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanSheetId}?key=${apiKey}`;
      const metaRes = await fetch(metadataUrl);
      if (!metaRes.ok) {
        let errMsg = "Не удалось подключиться к Google Sheets. Проверьте ID таблицы и API Ключ.";
        try {
          const errData = await metaRes.json();
          if (errData.error && errData.error.message) {
            errMsg = `Google API: ${errData.error.message}`;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const metaData = await metaRes.json();
      const sheetTitles = metaData.sheets.map(s => s.properties.title);
      setAvailableSheets(sheetTitles);

      // Save credentials first in localStorage so that loadConsolidatedData can access them!
      localStorage.setItem("gs_sheet_id", cleanSheetId);
      localStorage.setItem("gs_api_key", apiKey);
      localStorage.setItem("gs_sheet_name", "Все листы (Консолидировано)");
      localStorage.setItem("gs_apps_script_url", appsScriptUrl);
      localStorage.setItem("gs_apps_script_token", appsScriptToken);
      localStorage.setItem("gs_exchange_rate", exchangeRate);
      localStorage.setItem("gs_auto_convert", autoConvert ? "true" : "false");

      // Call consolidated loader
      const success = await loadConsolidatedData(cleanSheetId, apiKey);
      if (success) {
        onDataLoaded(
          null, // App.jsx loaded consolidated transactions directly to state
          "Google Sheets (Консолидация 7 листов)",
          metaData.sheets,
          "Все листы (Консолидировано)",
          cleanSheetId,
          apiKey,
          appsScriptUrl,
          appsScriptToken,
          Number(exchangeRate) || 12800,
          autoConvert
        );
        setError(null);
      } else {
        throw new Error("Не удалось извлечь транзакции из 7 листов таблицы.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const parseCSV = (text) => {
    try {
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) return [];

      const splitCSVLine = (line) => {
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        return matches.map(val => val.replace(/^"|"$/g, "").trim());
      };

      let delimiter = ",";
      if (lines[0].includes(";")) delimiter = ";";
      
      const headers = lines[0].split(delimiter).map(h => h.replace(/^"|"$/g, "").trim());
      
      const dateIdx = headers.findIndex(h => /дата|date/i.test(h));
      const typeIdx = headers.findIndex(h => /тип|type/i.test(h));
      const amountIdx = headers.findIndex(h => /сумма|amount|итого|total/i.test(h));
      const categoryIdx = headers.findIndex(h => /категория|статья|category/i.test(h));
      const accountIdx = headers.findIndex(h => /счет|account|форма|оплат/i.test(h));
      const counterpartyIdx = headers.findIndex(h => /контрагент|counterparty/i.test(h));
      const descIdx = headers.findIndex(h => /описание|description/i.test(h));

      const list = [];
      const rate = Number(exchangeRate) || 12800;

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const row = lines[i].split(delimiter).map(v => v.replace(/^"|"$/g, "").trim());
        
        const getVal = (idx) => idx !== -1 ? row[idx] || "" : "";
        let amount = parseFloat(getVal(amountIdx).replace(/[^\d.-]/g, "")) || 0;
        
        // Auto-convert UZS to USD if enabled and amount is > 10,000
        if (autoConvert && Math.abs(amount) > 10000) {
          amount = amount / rate;
        }

        const rawType = getVal(typeIdx);
        let type = "Expense";
        if (/доход|поступление|income|plus|in/i.test(rawType)) {
          type = "Income";
        }

        if (getVal(dateIdx)) {
          list.push({
            id: `csv-tx-${i}`,
            date: getVal(dateIdx),
            type: type,
            amount: Math.abs(amount),
            category: getVal(categoryIdx),
            account: getVal(accountIdx),
            counterparty: getVal(counterpartyIdx),
            description: getVal(descIdx)
          });
        }
      }
      return list;
    } catch (e) {
      console.error(e);
      throw new Error("Не удалось распознать формат CSV файла. Убедитесь в корректности разделителей.");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setError("Файл не содержит валидных данных о транзакциях.");
        } else {
          onDataLoaded(parsed, `Файл (${file.name})`);
          setError(null);
        }
      } catch (err) {
        setError(err.message);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  return (
    <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "32px", width: "100%" }}>
      {/* API Connection Panel */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <h3 style={{ fontSize: "20px", marginBottom: "4px" }}>Подключение Google Sheets & Apps Script</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.5" }}>
          Укажите ID вашей Google таблицы и API-ключи. Настройте URL-скрипта Apps Script для автоматической записи новых операций и бюджетов.
        </p>
        {HAS_HOSTED_GOOGLE_CONFIG && (
          <div className="badge badge-success" style={{ padding: "12px", borderRadius: "8px", display: "block", textAlign: "left", lineHeight: "1.4" }}>
            Автоподключение включено: база Google Sheets уже задана в конфиге веб-версии.
          </div>
        )}

        {error && (
          <div className="badge badge-error" style={{ padding: "12px", borderRadius: "8px", display: "block", textAlign: "left", lineHeight: "1.4" }}>
            <strong>Ошибка: </strong>{error}
          </div>
        )}

        <form onSubmit={handleConnectAPI} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="input-group">
            <label className="input-label">ID Google Таблицы (Spreadsheet ID)</label>
            <input
              type="text"
              className="input-control"
              placeholder="1fHwYmN4v9B3o-K-d3g8L_f4H_jR8K5s..."
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Google Sheets API Key</label>
            <input
              type="password"
              className="input-control"
              placeholder="AIzaSyA..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          {availableSheets.length > 0 && (
            <div className="input-group" style={{ animation: "fadeIn 0.3s forwards", backgroundColor: "rgba(16, 185, 129, 0.05)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
              <label className="input-label" style={{ color: "var(--success)", fontWeight: "700" }}>
                📁 Подключение успешно установлено!
              </label>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                Обнаружено листов: {availableSheets.length}. Данные автоматически консолидируются из 7 операционных вкладок.
              </p>
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", marginTop: "4px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>Настройки записи и валюты</span>
          </div>

          <div className="input-group">
            <label className="input-label">Google Apps Script Web App URL (для записи)</label>
            <input
              type="text"
              className="input-control"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={appsScriptUrl}
              onChange={(e) => setAppsScriptUrl(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Apps Script Security Token (Пароль)</label>
            <input
              type="password"
              className="input-control"
              placeholder="Введите секретный пароль..."
              value={appsScriptToken}
              onChange={(e) => setAppsScriptToken(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "16px" }}>
            <div className="input-group">
              <label className="input-label">Курс Сума к Доллару (UZS / USD)</label>
              <input
                type="number"
                className="input-control"
                placeholder="12800"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
              />
            </div>
            
            <div className="input-group" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <label className="input-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginTop: "20px" }}>
                <input
                  type="checkbox"
                  checked={autoConvert}
                  onChange={(e) => setAutoConvert(e.target.checked)}
                  style={{ width: "16px", height: "16px" }}
                />
                Конвертировать UZS в USD
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? "Подключение..." : "Сохранить и подключить"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onLoadMockData}
              disabled={loading}
            >
              Сбросить
            </button>
          </div>
        </form>
      </div>

      {/* Instructions & File Upload Panel */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Apps Script Guide */}
        <div className="card" style={{ fontSize: "14px", lineHeight: "1.5" }}>
          <h4 style={{ fontSize: "16px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>📝 Настройка записи в Google Sheets</span>
          </h4>
          <p style={{ color: "var(--text-secondary)", marginBottom: "12px" }}>
            Мы обновили код вашего Apps Script. Скопируйте обновленный код из файла <strong>Текстовый документ.gs.txt</strong> на вашем Рабочем столе в редактор скриптов вашей таблицы (Расширения &rarr; Apps Script) и нажмите <strong>«Развернуть» &rarr; «Новое развертывание»</strong> как веб-приложение (Доступ: «Все»).
          </p>
          <div style={{ backgroundColor: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "12px" }}>
            <strong>Убедитесь, что настроили свойства скрипта:</strong>
            <ul style={{ paddingLeft: "16px", marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <li><code>API_TOKEN</code> = ваш секретный пароль</li>
              <li><code>TELEGRAM_TOKEN</code> = токен Telegram-бота</li>
              <li><code>GEMINI_API_KEY</code> = ваш ключ Gemini</li>
            </ul>
          </div>
        </div>

        {/* Drag & Drop File Upload */}
        <div
          className={`card ${dragActive ? "drag-active" : ""}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: dragActive ? "2px dashed var(--primary)" : "1px dashed var(--border)",
            backgroundColor: dragActive ? "rgba(0,186,196,0.05)" : "var(--bg-card)",
            textAlign: "center",
            padding: "32px 24px",
            cursor: "pointer"
          }}
          onClick={() => document.getElementById("file-upload").click()}
        >
          <input
            type="file"
            id="file-upload"
            style={{ display: "none" }}
            accept=".csv,.txt"
            onChange={handleFileChange}
          />
          
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" style={{ marginBottom: "12px" }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>

          <h3 style={{ fontSize: "16px", marginBottom: "6px" }}>Загрузить выгрузку CSV</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", maxWidth: "260px", marginBottom: "16px" }}>
            Перетащите сюда CSV файл с транзакциями, или нажмите для выбора.
          </p>

          <div className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: "12px" }}>Выбрать файл CSV</div>
        </div>
      </div>
    </div>
  );
}
