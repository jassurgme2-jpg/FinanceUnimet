import React, { useState } from "react";
import { formatCurrency } from "../financialCalculations";

export default function TransactionManager({ 
  transactions, 
  sheetId, 
  apiKey, 
  appsScriptUrl, 
  appsScriptToken, 
  exchangeRate, 
  autoConvert, 
  onTransactionAdded 
}) {
  const today = new Date().toISOString().substring(0, 10);
  
  // Form States
  const [date, setDate] = useState(today);
  const [type, setType] = useState("Expense");
  const [category, setCategory] = useState("");
  const [account, setAccount] = useState("Р/С Альфа-Банк");
  const [amount, setAmount] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [description, setDescription] = useState("");
  
  // UI States
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Common Accounts & Categories List
  const accountsList = ["Р/С Альфа-Банк", "Р/С Сбербанк", "Касса Офис"];
  
  // Extract unique categories from current transactions
  const categoriesList = Array.from(new Set(transactions.map(tx => tx.category).filter(Boolean))).sort();

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount))) {
      setStatusMsg({ type: "error", text: "Укажите корректную сумму." });
      return;
    }

    setSubmitting(true);
    setStatusMsg(null);

    // Apply currency auto-conversion if active and token is set
    let finalAmount = parseFloat(amount);
    let conversionNote = "";
    
    if (autoConvert && finalAmount > 10000) {
      const rate = Number(exchangeRate) || 12800;
      finalAmount = finalAmount / rate;
      conversionNote = ` (автоконвертация из UZS: $${finalAmount.toFixed(2)})`;
    }

    const payload = {
      action: "add_transaction",
      token: appsScriptToken,
      type: type === "Income" ? "доход" : "расход",
      category,
      amount: finalAmount,
      comment: description + (conversionNote ? ` [UZS->USD conversion]` : ""),
      date,
      account,
      counterparty
    };

    if (!appsScriptUrl) {
      // Mock local addition if API not configured
      const mockTx = {
        id: `local-tx-${Date.now()}`,
        date,
        type,
        amount: finalAmount,
        category,
        account,
        counterparty,
        description: description + (conversionNote ? ` [Авто-конвертация]` : "")
      };
      
      onTransactionAdded([mockTx, ...transactions], `Локальный ввод (Mock Data)`);
      setStatusMsg({ type: "success", text: `Операция успешно добавлена локально!${conversionNote}` });
      setAmount("");
      setDescription("");
      setCounterparty("");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(appsScriptUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("HTTP error " + response.status);
      const resData = await response.json();

      if (resData.error) {
        throw new Error(resData.error);
      }

      setStatusMsg({ type: "success", text: `Операция успешно записана в Google Sheets!${conversionNote}` });
      setAmount("");
      setDescription("");
      setCounterparty("");
      
      // Trigger App.jsx data reload
      if (onTransactionAdded) {
        onTransactionAdded(); 
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: "error", text: `Не удалось записать операцию: ${err.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter recent transactions
  const filteredTransactions = transactions.filter(tx => {
    const q = searchQuery.toLowerCase();
    return (
      (tx.category && tx.category.toLowerCase().includes(q)) ||
      (tx.counterparty && tx.counterparty.toLowerCase().includes(q)) ||
      (tx.description && tx.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "1.1fr 1.9fr", gap: "32px", width: "100%" }}>
      {/* LEFT: Add Transaction Form */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <h3 style={{ fontSize: "18px", marginBottom: "4px" }}>Добавить операцию</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Запись операции напрямую в реестр базы данных</p>
        </div>

        {statusMsg && (
          <div className={`badge ${statusMsg.type === "success" ? "badge-success" : "badge-error"}`} style={{ padding: "12px", borderRadius: "8px", width: "100%", textAlign: "left", lineHeight: "1.4" }}>
            {statusMsg.text}
          </div>
        )}

        <form onSubmit={handleAddTransaction} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Income vs Expense Toggle buttons */}
          <div className="input-group">
            <label className="input-label">Тип операции</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "4px" }}>
              <button
                type="button"
                className={`btn ${type === "Income" ? "btn-primary" : "btn-secondary"}`}
                style={{ 
                  borderRadius: "8px", 
                  backgroundColor: type === "Income" ? "var(--success)" : "rgba(255,255,255,0.03)",
                  borderColor: type === "Income" ? "var(--success)" : "var(--border)",
                  color: type === "Income" ? "black" : "white",
                  fontWeight: "700",
                  transition: "transform 150ms ease-out, background-color 150ms ease-out",
                }}
                onClick={() => { setType("Income"); setCategory(categoriesList[0] || ""); }}
              >
                💰 Поступление
              </button>
              <button
                type="button"
                className={`btn ${type === "Expense" ? "btn-primary" : "btn-secondary"}`}
                style={{ 
                  borderRadius: "8px", 
                  backgroundColor: type === "Expense" ? "var(--error)" : "rgba(255,255,255,0.03)",
                  borderColor: type === "Expense" ? "var(--error)" : "var(--border)",
                  color: type === "Expense" ? "white" : "white",
                  fontWeight: "700",
                  transition: "transform 150ms ease-out, background-color 150ms ease-out",
                }}
                onClick={() => { setType("Expense"); setCategory(categoriesList[1] || ""); }}
              >
                💸 Расход
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "12px" }}>
            <div className="input-group">
              <label className="input-label">Дата</label>
              <input
                type="date"
                className="input-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Сумма {autoConvert && "(в UZS или USD)"}</label>
              <input
                type="text"
                className="input-control"
                placeholder="Например, 1500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Финансовая статья (Категория)</label>
            <select
              className="input-control"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">Выберите статью...</option>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Расчетный счет / Кошелек</label>
            <select
              className="input-control"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              required
            >
              {accountsList.map(acc => (
                <option key={acc} value={acc}>{acc}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Контрагент (Кому / От кого)</label>
            <input
              type="text"
              className="input-control"
              placeholder="Название компании или ФИО"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Назначение платежа (Описание)</label>
            <textarea
              className="input-control"
              style={{ minHeight: "60px", resize: "vertical" }}
              placeholder="Детали операции..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: "100%", padding: "12px", marginTop: "8px", fontWeight: "700" }}
            disabled={submitting}
          >
            {submitting ? "Запись операции..." : appsScriptUrl ? "🚀 Отправить в Google Sheets" : "➕ Добавить локально"}
          </button>
        </form>
      </div>

      {/* RIGHT: Transaction History Register */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: "18px", marginBottom: "4px" }}>Реестр операций</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Просмотр последних {filteredTransactions.length} транзакций в долларах</p>
          </div>
          <input
            type="text"
            className="input-control"
            style={{ maxWidth: "200px", padding: "8px 12px", fontSize: "12px" }}
            placeholder="🔍 Быстрый поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ overflowX: "auto", flexGrow: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", textAlign: "left" }}>
                <th style={{ padding: "12px 8px", fontWeight: "600" }}>Дата</th>
                <th style={{ padding: "12px 8px", fontWeight: "600" }}>Тип</th>
                <th style={{ padding: "12px 8px", fontWeight: "600" }}>Статья / Контрагент</th>
                <th style={{ padding: "12px 8px", fontWeight: "600" }}>Счет</th>
                <th style={{ padding: "12px 8px", fontWeight: "600", textAlign: "right" }}>Сумма</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.slice(0, 15).map((tx, idx) => (
                <tr key={tx.id || idx} style={{ borderBottom: "1px solid var(--border)", animation: "fadeIn 0.2s forwards" }}>
                  <td style={{ padding: "12px 8px", color: "var(--text-secondary)" }}>{tx.date}</td>
                  <td style={{ padding: "12px 8px" }}>
                    <span className={`badge ${tx.type === "Income" ? "badge-success" : "badge-error"}`} style={{ fontSize: "10px", padding: "2px 6px" }}>
                      {tx.type === "Income" ? "Поступление" : "Расход"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    <div style={{ fontWeight: "600", color: "white" }}>{tx.category || "Без категории"}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{tx.counterparty || "Нет контрагента"}</div>
                  </td>
                  <td style={{ padding: "12px 8px", color: "var(--text-secondary)" }}>{tx.account || "Не указан"}</td>
                  <td className="tabular-nums" style={{ padding: "12px 8px", textAlign: "right", fontWeight: "700", color: tx.type === "Income" ? "var(--success)" : "white" }}>
                    {tx.type === "Income" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
                    Нет транзакций, соответствующих поисковому запросу.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
