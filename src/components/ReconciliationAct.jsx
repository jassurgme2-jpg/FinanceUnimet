import React, { useState, useEffect } from "react";
import { getRomashkaExternalStatement } from "../mockData";
import { formatCurrency } from "../financialCalculations";

export default function ReconciliationAct({ transactions }) {
  const [selectedCounterparty, setSelectedCounterparty] = useState("");
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-06-30");
  const [externalStatement, setExternalStatement] = useState([]);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [reconciled, setReconciled] = useState(false);

  // Get unique list of counterparties from transactions
  const counterpartiesList = Array.from(
    new Set(transactions.map((tx) => tx.counterparty).filter(Boolean))
  ).sort();

  // Set default counterparty
  useEffect(() => {
    if (counterpartiesList.length > 0 && !selectedCounterparty) {
      setSelectedCounterparty(counterpartiesList[0]);
    }
  }, [counterpartiesList]);

  // Filter internal transactions for this counterparty and date range
  const internalTx = transactions
    .filter((tx) => {
      const matchCpt = tx.counterparty === selectedCounterparty;
      const matchDate = (!dateFrom || tx.date >= dateFrom) && (!dateTo || tx.date <= dateTo);
      return matchCpt && matchDate;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Determine if counterparty is Client or Supplier to assign Debit/Credit correctly
  // (Usually: Client Debit = services/goods provided, Client Credit = cash received)
  // (Supplier Debit = payments made, Supplier Credit = raw materials received)
  const isClient = selectedCounterparty.toLowerCase().includes("клиент") || 
                   selectedCounterparty.includes("Ромашка") || 
                   selectedCounterparty.includes("Вектор");

  // Format internal transactions as Debit/Credit
  let runningBalance = 0;
  const ledgerRows = internalTx.map((tx) => {
    const amt = Number(tx.amount || 0);
    let debit = 0; // providing asset (receivable increases or liability decreases)
    let credit = 0; // cash received/payable increases

    if (isClient) {
      // For Client: providing products/services = debit (they owe us); payment received = credit (debt decreases)
      const isSales = tx.category.includes("Выручка");
      debit = isSales ? amt : 0;
      credit = !isSales ? amt : 0;
      runningBalance += (debit - credit);
    } else {
      // For Supplier: paying them = debit (prepayment/debt settled); receiving goods = credit (we owe them)
      const isPayment = tx.type === "Expense";
      debit = isPayment ? amt : 0;
      credit = !isPayment ? amt : 0;
      runningBalance += (debit - credit);
    }

    return {
      id: tx.id,
      date: tx.date,
      description: tx.description || tx.category,
      debit,
      credit,
      balance: runningBalance
    };
  });

  const totals = ledgerRows.reduce(
    (acc, row) => {
      acc.debit += row.debit;
      acc.credit += row.credit;
      return acc;
    },
    { debit: 0, credit: 0 }
  );

  // Load Mock Romashka Ledger
  const handleLoadMockRomashka = () => {
    const stmt = getRomashkaExternalStatement();
    setExternalStatement(stmt);
    setSelectedCounterparty("ООО Ромашка (Клиент)");
    setReconciled(false);
    setDiscrepancies([]);
  };

  // Run audit reconciliation comparison between internal and external log
  const handleReconcile = () => {
    if (externalStatement.length === 0) {
      alert("Сначала загрузите выписку от контрагента!");
      return;
    }

    const diffs = [];
    
    // Track matched keys to find missing items
    const matchedInternal = new Set();
    const matchedExternal = new Set();

    // Loop through internal transactions and try to match with external
    ledgerRows.forEach((row) => {
      // Find matching transaction in external statement on same date with corresponding debit/credit
      // (Note: in counterparty's ledger, debit/credit are mirrored! Our Debit is their Credit, and vice versa)
      const matches = externalStatement.filter((ext, idx) => {
        if (matchedExternal.has(idx)) return false;
        
        const dateMatch = ext.date === row.date;
        // Check mirrored amounts
        const extDebitMatchesInternalCredit = ext.debit === row.credit && row.credit > 0;
        const extCreditMatchesInternalDebit = ext.credit === row.debit && row.debit > 0;
        
        return dateMatch && (extDebitMatchesInternalCredit || extCreditMatchesInternalDebit);
      });

      if (matches.length > 0) {
        // Matched!
        const matchIdx = externalStatement.indexOf(matches[0]);
        matchedInternal.add(row.id);
        matchedExternal.add(matchIdx);
      } else {
        // Check for partial match: same date, but different amount
        const partialMatches = externalStatement.filter((ext, idx) => {
          if (matchedExternal.has(idx)) return false;
          const dateMatch = ext.date === row.date;
          // Check description keyword match or just date
          return dateMatch;
        });

        if (partialMatches.length > 0) {
          const match = partialMatches[0];
          const matchIdx = externalStatement.indexOf(match);
          matchedInternal.add(row.id);
          matchedExternal.add(matchIdx);
          
          const internalAmt = row.debit || row.credit;
          const externalAmt = match.debit || match.credit;

          diffs.push({
            type: "amount_mismatch",
            date: row.date,
            message: `Разошлись суммы операции от ${row.date}. В наших Sheets: ${formatCurrency(internalAmt)}. У контрагента: ${formatCurrency(externalAmt)}.`,
            internalVal: internalAmt,
            externalVal: externalAmt
          });
        } else {
          // Missing in their ledger completely
          diffs.push({
            type: "missing_in_external",
            date: row.date,
            message: `Операция от ${row.date} на сумму ${formatCurrency(row.debit || row.credit)} ("${row.description}") есть в наших Sheets, но отсутствует в отчете контрагента.`
          });
        }
      }
    });

    // Find external transactions missing in our Sheets
    externalStatement.forEach((ext, idx) => {
      if (!matchedExternal.has(idx)) {
        diffs.push({
          type: "missing_in_internal",
          date: ext.date,
          message: `В реестре контрагента от ${ext.date} есть операция на сумму ${formatCurrency(ext.debit || ext.credit)} ("${ext.description}"), которой нет в наших Sheets.`
        });
      }
    });

    setDiscrepancies(diffs);
    setReconciled(true);
  };

  const handleClearExternal = () => {
    setExternalStatement([]);
    setDiscrepancies([]);
    setReconciled(false);
  };

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      
      {/* Filtering & Actions Panel */}
      <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "20px", alignItems: "end" }}>
        
        <div className="input-group">
          <label className="input-label">Выберите контрагента</label>
          <select 
            className="input-control" 
            value={selectedCounterparty} 
            onChange={(e) => {
              setSelectedCounterparty(e.target.value);
              setReconciled(false);
              setDiscrepancies([]);
            }}
          >
            {counterpartiesList.map((cpt) => (
              <option key={cpt} value={cpt}>{cpt || "Без имени"}</option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Дата с</label>
          <input 
            type="date" 
            className="input-control" 
            value={dateFrom} 
            onChange={(e) => setDateFrom(e.target.value)} 
          />
        </div>

        <div className="input-group">
          <label className="input-label">Дата по</label>
          <input 
            type="date" 
            className="input-control" 
            value={dateTo} 
            onChange={(e) => setDateTo(e.target.value)} 
          />
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {externalStatement.length === 0 ? (
            <button className="btn btn-primary" onClick={handleLoadMockRomashka} style={{ width: "100%", fontSize: "13px" }}>
              Загрузить тест. Ромашку
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={handleClearExternal} style={{ width: "100%", fontSize: "13px" }}>
              Сбросить выписку
            </button>
          )}
        </div>

      </div>

      {/* Grid: Our Ledger vs Reconciliation Audit Results */}
      <div style={{ display: "grid", gridTemplateColumns: externalStatement.length > 0 ? "1.2fr 1fr" : "1fr", gap: "32px" }}>
        
        {/* Left: Our internal Ledger card */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ fontSize: "18px" }}>Реестр операций по данным Sheets</h3>
          
          <div className="table-container">
            <table className="fin-table">
              <thead>
                <tr>
                  <th style={{ width: "90px" }}>Дата</th>
                  <th>Документ / Описание</th>
                  <th className="text-right" style={{ width: "110px" }}>Дебет (Дт)</th>
                  <th className="text-right" style={{ width: "110px" }}>Кредит (Кт)</th>
                  <th className="text-right" style={{ width: "120px" }}>Сальдо</th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.length > 0 ? (
                  ledgerRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.date}</td>
                      <td>{row.description}</td>
                      <td className="text-right amount-positive">{row.debit > 0 ? formatCurrency(row.debit) : "-"}</td>
                      <td className="text-right amount-negative">{row.credit > 0 ? formatCurrency(row.credit) : "-"}</td>
                      <td className="text-right" style={{ fontWeight: "600" }}>{formatCurrency(row.balance)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px" }}>
                      Нет операций с данным контрагентом за указанный период.
                    </td>
                  </tr>
                )}
                
                {ledgerRows.length > 0 && (
                  <tr className="total-row">
                    <td>Итого оборотов</td>
                    <td></td>
                    <td className="text-right amount-positive">{formatCurrency(totals.debit)}</td>
                    <td className="text-right amount-negative">{formatCurrency(totals.credit)}</td>
                    <td className="text-right">{formatCurrency(runningBalance)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: External reconciliation audit comparison */}
        {externalStatement.length > 0 && (
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "18px" }}>Реестр контрагента ({externalStatement.length} зап.)</h3>
              {!reconciled ? (
                <button className="btn btn-primary" onClick={handleReconcile} style={{ padding: "6px 12px", fontSize: "12px" }}>
                  Сверить с Sheets
                </button>
              ) : (
                <span className={`badge ${discrepancies.length > 0 ? "badge-error" : "badge-success"}`}>
                  {discrepancies.length > 0 ? `Найдено расхождений: ${discrepancies.length}` : "Полное соответствие!"}
                </span>
              )}
            </div>

            {/* Reconciliation Comparison Results */}
            {reconciled && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "300px", overflowY: "auto", paddingRight: "4px" }}>
                {discrepancies.length > 0 ? (
                  discrepancies.map((diff, idx) => {
                    const isError = diff.type === "amount_mismatch" || diff.type === "missing_in_internal";
                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          fontSize: "13px", 
                          padding: "12px", 
                          backgroundColor: isError ? "rgba(244, 63, 94, 0.08)" : "rgba(245, 158, 11, 0.08)", 
                          borderRadius: "8px", 
                          borderLeft: `3px solid ${isError ? 'var(--error)' : 'var(--warning)'}`,
                          lineHeight: "1.4"
                        }}
                      >
                        <div style={{ fontWeight: "600", color: "white", marginBottom: "4px" }}>
                          {diff.type === "amount_mismatch" ? "❌ Ошибка в сумме" : 
                           diff.type === "missing_in_internal" ? "⚠️ Отсутствует в нашей базе" : 
                           "⚠️ Отсутствует у контрагента"}
                        </div>
                        {diff.message}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: "20px", textAlign: "center", backgroundColor: "rgba(16, 185, 129, 0.08)", borderRadius: "8px", color: "var(--success)", fontWeight: "500" }}>
                    Все операции сошлись идеально! Суммы, даты и проводки по Дебету/Кредиту совпадают с Sheets.
                  </div>
                )}
              </div>
            )}

            {/* External Ledger Raw Rows Display */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
              <h4 style={{ fontSize: "14px", marginBottom: "8px" }}>Исходные данные контрагента</h4>
              <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "6px" }}>
                <table className="fin-table" style={{ fontSize: "12px" }}>
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Описание</th>
                      <th className="text-right">Дебет (Дт)</th>
                      <th className="text-right">Кредит (Кт)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {externalStatement.map((ext, idx) => (
                      <tr key={idx}>
                        <td>{ext.date}</td>
                        <td>{ext.description}</td>
                        <td className="text-right">{ext.debit > 0 ? formatCurrency(ext.debit) : "-"}</td>
                        <td className="text-right">{ext.credit > 0 ? formatCurrency(ext.credit) : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
