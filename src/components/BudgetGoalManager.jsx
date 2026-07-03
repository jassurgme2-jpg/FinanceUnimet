import React, { useState, useEffect } from "react";
import { formatCurrency } from "../financialCalculations";

export default function BudgetGoalManager({ 
  transactions, 
  sheetId, 
  apiKey, 
  appsScriptUrl, 
  appsScriptToken, 
  exchangeRate, 
  autoConvert,
  onBudgetOrGoalUpdated 
}) {
  
  // Local states for loaded metadata
  const [budgetList, setBudgetList] = useState({});
  const [goalsList, setGoalsList] = useState([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  // Form States - Goal Addition
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalAmount, setNewGoalAmount] = useState("");
  const [newGoalDeadline, setNewGoalDeadline] = useState("");

  // Form States - Goal Deposit
  const [activeDepositGoalId, setActiveDepositGoalId] = useState(null);
  const [depositAmount, setDepositAmount] = useState("");

  // Form States - Edit Budget
  const [activeEditCategory, setActiveEditCategory] = useState(null);
  const [newBudgetLimit, setNewBudgetLimit] = useState("");

  // Status/Error messages
  const [statusMsg, setStatusMsg] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Extract unique categories from current transactions
  const categoriesList = Array.from(new Set(transactions.map(tx => tx.category).filter(Boolean))).sort();

  // Load budgets and goals from API if connected, or fallback to mock defaults
  const loadMetadata = async () => {
    if (!appsScriptUrl) {
      // Mock defaults
      setBudgetList({
        "ОПЕКС: Заработная плата": 400000,
        "ОПЕКС: Аренда офиса": 85000,
        "ОПЕКС: Маркетинг и реклама": 150000,
        "ОПЕКС: Софт и облако": 20000
      });
      setGoalsList([
        { id: "G-1", название: "Резервный фонд", целевая_сумма: 50000, накоплено: 18500, дедлайн: "31.12.2026" },
        { id: "G-2", название: "Обновление серверов", целевая_сумма: 15000, накоплено: 12000, дедлайн: "01.10.2026" }
      ]);
      return;
    }

    setLoadingMetadata(true);
    try {
      const response = await fetch(appsScriptUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_metadata",
          token: appsScriptToken
        })
      });

      if (!response.ok) throw new Error("HTTP error " + response.status);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setBudgetList(data.budget || {});
      setGoalsList(data.goals || []);
    } catch (err) {
      console.error("Не удалось получить бюджеты/цели:", err);
      // fallback to mock defaults
      setBudgetList({
        "ОПЕКС: Заработная плата": 400000,
        "ОПЕКС: Аренда офиса": 85000,
        "ОПЕКС: Маркетинг и реклама": 150000
      });
    } finally {
      setLoadingMetadata(false);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, [appsScriptUrl, transactions]);

  // Calculate actual spending for current month
  const getExpensesForCurrentMonth = () => {
    const expenses = {};
    const now = new Date();
    transactions.forEach(tx => {
      if (tx.type === "Expense" && tx.date) {
        const txDate = new Date(tx.date);
        if (txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear()) {
          const cat = tx.category || "Без категории";
          expenses[cat] = (expenses[cat] || 0) + tx.amount;
        }
      }
    });
    return expenses;
  };

  const actualExpenses = getExpensesForCurrentMonth();

  // Add Savings Goal
  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!newGoalName || !newGoalAmount || isNaN(parseFloat(newGoalAmount))) {
      setStatusMsg({ type: "error", text: "Укажите имя цели и корректную сумму." });
      return;
    }

    setActionLoading(true);
    setStatusMsg(null);

    let finalAmount = parseFloat(newGoalAmount);
    if (autoConvert && finalAmount > 10000) {
      finalAmount = finalAmount / (Number(exchangeRate) || 12800);
    }

    if (!appsScriptUrl) {
      // Local Mock Addition
      const mockGoal = {
        id: `mock-goal-${Date.now()}`,
        название: newGoalName,
        целевая_сумма: finalAmount,
        накоплено: 0,
        дедлайн: newGoalDeadline || "Не указан"
      };
      setGoalsList([...goalsList, mockGoal]);
      setStatusMsg({ type: "success", text: "Цель добавлена локально!" });
      setNewGoalName("");
      setNewGoalAmount("");
      setNewGoalDeadline("");
      setActionLoading(false);
      return;
    }

    try {
      const response = await fetch(appsScriptUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_goal",
          token: appsScriptToken,
          name: newGoalName,
          amount: finalAmount,
          deadline: newGoalDeadline
        })
      });

      if (!response.ok) throw new Error("HTTP error " + response.status);
      const res = await response.json();
      if (res.error) throw new Error(res.error);

      setStatusMsg({ type: "success", text: "Финансовая цель успешно сохранена в Google Sheets!" });
      setNewGoalName("");
      setNewGoalAmount("");
      setNewGoalDeadline("");
      loadMetadata();
    } catch (err) {
      setStatusMsg({ type: "error", text: `Ошибка при создании цели: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  // Add Goal Deposit
  const handleAddDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount || isNaN(parseFloat(depositAmount))) {
      setStatusMsg({ type: "error", text: "Укажите корректную сумму пополнения." });
      return;
    }

    setActionLoading(true);
    setStatusMsg(null);

    let finalAmount = parseFloat(depositAmount);
    if (autoConvert && finalAmount > 10000) {
      finalAmount = finalAmount / (Number(exchangeRate) || 12800);
    }

    if (!appsScriptUrl) {
      // Local Mock Deposit
      setGoalsList(goalsList.map(g => {
        if (g.id === activeDepositGoalId) {
          return { ...g, накоплено: g.накоплено + finalAmount };
        }
        return g;
      }));
      setStatusMsg({ type: "success", text: "Цель пополнена локально!" });
      setDepositAmount("");
      setActiveDepositGoalId(null);
      setActionLoading(false);
      return;
    }

    try {
      const response = await fetch(appsScriptUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_deposit",
          token: appsScriptToken,
          goal_id: activeDepositGoalId,
          amount: finalAmount
        })
      });

      if (!response.ok) throw new Error("HTTP error " + response.status);
      const res = await response.json();
      if (res.error) throw new Error(res.error);

      setStatusMsg({ type: "success", text: "Пополнение успешно записано в Google Sheets!" });
      setDepositAmount("");
      setActiveDepositGoalId(null);
      loadMetadata();
    } catch (err) {
      setStatusMsg({ type: "error", text: `Ошибка пополнения: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  // Save/Update Budget Limit
  const handleSaveBudget = async (category) => {
    if (newBudgetLimit === "" || isNaN(parseFloat(newBudgetLimit))) {
      return;
    }

    setActionLoading(true);
    setStatusMsg(null);

    let finalLimit = parseFloat(newBudgetLimit);
    if (autoConvert && finalLimit > 10000) {
      finalLimit = finalLimit / (Number(exchangeRate) || 12800);
    }

    if (!appsScriptUrl) {
      // Local Mock Update
      setBudgetList({ ...budgetList, [category]: finalLimit });
      setStatusMsg({ type: "success", text: `Бюджет для "${category}" обновлен локально!` });
      setActiveEditCategory(null);
      setNewBudgetLimit("");
      setActionLoading(false);
      return;
    }

    try {
      const response = await fetch(appsScriptUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_budget",
          token: appsScriptToken,
          category: category,
          limit: finalLimit
        })
      });

      if (!response.ok) throw new Error("HTTP error " + response.status);
      const res = await response.json();
      if (res.error) throw new Error(res.error);

      setStatusMsg({ type: "success", text: `Бюджет для "${category}" успешно обновлен в Google Sheets!` });
      setActiveEditCategory(null);
      setNewBudgetLimit("");
      loadMetadata();
    } catch (err) {
      setStatusMsg({ type: "error", text: `Ошибка обновления бюджета: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "32px", width: "100%" }}>
      
      {/* Alert Banner */}
      {statusMsg && (
        <div className={`badge ${statusMsg.type === "success" ? "badge-success" : "badge-error"}`} style={{ padding: "12px", borderRadius: "8px", width: "100%", textAlign: "left", lineHeight: "1.4" }}>
          {statusMsg.text}
        </div>
      )}

      {/* Grid: Budgets vs Goals */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
        
        {/* LEFT COLUMN: Monthly Budgets */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <h3 style={{ fontSize: "18px", marginBottom: "4px" }}>Бюджеты на месяц</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Лимиты расходов по категориям на текущий месяц</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {categoriesList.filter(cat => !cat.includes("Выручка")).map(cat => {
              const limit = budgetList[cat] || 0;
              const spent = actualExpenses[cat] || 0;
              const remaining = limit - spent;
              const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
              
              const isOverBudget = spent > limit && limit > 0;
              const isWarningBudget = spent / limit >= 0.85 && spent <= limit && limit > 0;

              return (
                <div key={cat} style={{ display: "flex", flexDirection: "column", gap: "6px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ fontWeight: "600", color: "white" }}>{cat}</span>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <span className="tabular-nums" style={{ color: isOverBudget ? "var(--error)" : "var(--text-secondary)" }}>
                        {formatCurrency(spent)} из {limit > 0 ? formatCurrency(limit) : "(не установлен)"}
                      </span>
                      
                      {activeEditCategory === cat ? (
                        <div style={{ display: "flex", gap: "4px" }}>
                          <input
                            type="text"
                            className="input-control"
                            style={{ width: "80px", padding: "4px 8px", fontSize: "11px" }}
                            placeholder="Новый лимит"
                            value={newBudgetLimit}
                            onChange={(e) => setNewBudgetLimit(e.target.value)}
                          />
                          <button onClick={() => handleSaveBudget(cat)} className="btn btn-primary" style={{ padding: "4px 8px", fontSize: "11px" }} disabled={actionLoading}>✓</button>
                          <button onClick={() => setActiveEditCategory(null)} className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "11px" }}>✗</button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => { setActiveEditCategory(cat); setNewBudgetLimit(limit > 0 ? limit.toString() : ""); }} 
                          className="btn btn-secondary" 
                          style={{ padding: "2px 8px", fontSize: "10px" }}
                        >
                          ✏️ Изменить
                        </button>
                      )}
                    </div>
                  </div>

                  {limit > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ height: "6px", width: "100%", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${pct}%`,
                          backgroundColor: isOverBudget ? "var(--error)" : isWarningBudget ? "var(--warning)" : "var(--success)",
                          borderRadius: "3px"
                        }}></div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: isOverBudget ? "var(--error)" : "var(--text-muted)" }}>
                        <span>Использовано: {pct}%</span>
                        <span>{isOverBudget ? `Превышение на ${formatCurrency(Math.abs(remaining))}` : `Осталось: ${formatCurrency(remaining)}`}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Financial Savings Goals */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Goals Dashboard Card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <h3 style={{ fontSize: "18px", marginBottom: "4px" }}>Копилка & Цели</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Накопление на крупные инвестиционные проекты и резервы</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {goalsList.map(goal => {
                const pct = Math.min(100, Math.round((goal.накоплено / goal.целевая_сумма) * 100));
                const isComplete = goal.накоплено >= goal.целевая_сумма;

                return (
                  <div key={goal.id} style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "16px", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid var(--border)", position: "relative" }}>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h4 style={{ fontSize: "15px", fontWeight: "700", color: "white" }}>
                          {goal.название}
                          {isComplete && <span style={{ marginLeft: "8px", fontSize: "11px", color: "var(--success)" }}>✓ Выполнено</span>}
                        </h4>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Срок: {goal.дедлайн}</span>
                      </div>
                      
                      <div className="tabular-nums" style={{ textAlign: "right" }}>
                        <span style={{ fontWeight: "700", fontSize: "14px" }}>{formatCurrency(goal.накоплено)}</span>
                        <span style={{ color: "var(--text-muted)", fontSize: "11px" }}> из {formatCurrency(goal.целевая_сумма)}</span>
                      </div>
                    </div>

                    <div style={{ height: "8px", width: "100%", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${pct}%`,
                        backgroundColor: isComplete ? "var(--success)" : "var(--primary)",
                        borderRadius: "4px"
                      }}></div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Накоплено: {pct}%</span>
                      
                      {activeDepositGoalId === goal.id ? (
                        <form onSubmit={handleAddDeposit} style={{ display: "flex", gap: "6px" }}>
                          <input
                            type="text"
                            className="input-control"
                            style={{ width: "90px", padding: "4px 8px", fontSize: "11px" }}
                            placeholder="Сумма пополнения"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            required
                          />
                          <button type="submit" className="btn btn-primary" style={{ padding: "4px 8px", fontSize: "11px" }} disabled={actionLoading}>Пополнить</button>
                          <button type="button" onClick={() => setActiveDepositGoalId(null)} className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "11px" }}>Отмена</button>
                        </form>
                      ) : (
                        <button 
                          onClick={() => { setActiveDepositGoalId(goal.id); setDepositAmount(""); }} 
                          className="btn btn-primary" 
                          style={{ padding: "4px 12px", fontSize: "11px", backgroundColor: "var(--info)", color: "black", border: "none" }}
                        >
                          🎯 Пополнить
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}

              {goalsList.length === 0 && (
                <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "16px" }}>
                  Активных целей не обнаружено. Создайте новую цель ниже.
                </p>
              )}
            </div>
          </div>

          {/* Add Goal Card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h4 style={{ fontSize: "16px" }}>Создать новую цель</h4>
            <form onSubmit={handleAddGoal} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="input-group">
                <label className="input-label">Имя цели</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Например, Покупка нового авто"
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="input-group">
                  <label className="input-label">Сумма (в USD)</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="50000"
                    value={newGoalAmount}
                    onChange={(e) => setNewGoalAmount(e.target.value)}
                    required
                  />
                </div>
                
                <div className="input-group">
                  <label className="input-label">Срок (ДД.ММ.ГГГГ)</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="31.12.2026"
                    value={newGoalDeadline}
                    onChange={(e) => setNewGoalDeadline(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: "100%", padding: "10px", marginTop: "4px" }}
                disabled={actionLoading}
              >
                {actionLoading ? "Создание..." : "➕ Создать цель"}
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
