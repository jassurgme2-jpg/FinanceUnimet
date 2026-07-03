import React, { useState, useEffect } from "react";
import { formatCurrency } from "../financialCalculations";

export default function GoogleSheetsTabs({ sheetMetadata, selectedSheet, sheetId, apiKey, onSelectSheet }) {
  const [previewSheet, setPreviewSheet] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // Set default preview sheet to the currently active selected sheet
  useEffect(() => {
    if (selectedSheet) {
      setPreviewSheet(selectedSheet);
    } else if (sheetMetadata.length > 0) {
      setPreviewSheet(sheetMetadata[0].properties.title);
    }
  }, [selectedSheet, sheetMetadata]);

  // Load preview data whenever previewSheet changes
  useEffect(() => {
    if (previewSheet && sheetId && apiKey) {
      fetchPreview(previewSheet);
    }
  }, [previewSheet, sheetId, apiKey]);

  const fetchPreview = async (title) => {
    setLoadingPreview(true);
    setPreviewError(null);
    setPreviewData(null);
    try {
      // Fetch first 6 rows, columns A-J
      const range = `${title}!A1:J6`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Ошибка Google API: не удалось получить превью листа "${title}"`);
      }
      
      const data = await res.json();
      if (!data.values || data.values.length === 0) {
        setPreviewData([]);
      } else {
        setPreviewData(data.values);
      }
    } catch (err) {
      setPreviewError(err.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Generate Excel-like column headers (A, B, C, D...)
  const getColHeader = (index) => {
    return String.fromCharCode(65 + index);
  };

  if (!sheetId || !apiKey || sheetMetadata.length === 0) {
    return (
      <div className="card animate-fade-in" style={{ padding: "40px", textAlign: "center" }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: "16px" }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
        <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>Листы Google Sheets не загружены</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", maxWidth: "400px", margin: "0 auto 20px" }}>
          Пожалуйста, сначала подключите вашу Google Таблицу на вкладке **«Подключение Sheets»**, введя ссылку и API-ключ.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "1.1fr 1.3fr", gap: "32px", width: "100%" }}>
      
      {/* Left: List of all sheets (tabs) */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <h2 style={{ fontSize: "20px" }}>Листы в Google Sheets ({sheetMetadata.length} шт.)</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "4px" }}>
            Список всех вкладок в вашей таблице. Кликните по названию, чтобы открыть предпросмотр первых строк.
          </p>
        </div>

        <div className="table-container" style={{ maxHeight: "400px", overflowY: "auto" }}>
          <table className="fin-table">
            <thead>
              <tr>
                <th>Имя листа</th>
                <th className="text-right">Размер (Строк х Кол.)</th>
                <th style={{ width: "90px" }}>Статус</th>
              </tr>
            </thead>
            <tbody>
              {sheetMetadata.map((sheet) => {
                const title = sheet.properties.title;
                const rows = sheet.properties.gridProperties?.rowCount || 0;
                const cols = sheet.properties.gridProperties?.columnCount || 0;
                const isActive = title === selectedSheet;
                const isViewing = title === previewSheet;

                return (
                  <tr 
                    key={title} 
                    onClick={() => setPreviewSheet(title)}
                    style={{ 
                      cursor: "pointer", 
                      backgroundColor: isViewing ? "rgba(59, 130, 246, 0.08)" : "transparent",
                      borderLeft: isViewing ? "3px solid var(--primary)" : "3px solid transparent"
                    }}
                  >
                    <td style={{ fontWeight: isActive ? "700" : "400", color: isActive ? "white" : "var(--text-primary)" }}>
                      📁 {title}
                    </td>
                    <td className="text-right" style={{ color: "var(--text-secondary)" }}>
                      {rows} x {cols}
                    </td>
                    <td>
                      {isActive ? (
                        <span className="badge badge-success" style={{ fontSize: "10px", padding: "2px 6px" }}>Активен</span>
                      ) : (
                        <span className="badge badge-info" style={{ fontSize: "10px", padding: "2px 6px", opacity: 0.6 }} onClick={(e) => {
                          e.stopPropagation();
                          onSelectSheet(title);
                        }}>Сделать активным</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: Live Preview Panel for selected sheet */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: "18px" }}>Предпросмотр: Лист «{previewSheet}»</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginTop: "4px" }}>
              Показывает первые 6 строк для визуальной сверки структуры колонок.
            </p>
          </div>
          {previewSheet !== selectedSheet && (
            <button 
              className="btn btn-primary" 
              style={{ padding: "6px 12px", fontSize: "12px" }}
              onClick={() => onSelectSheet(previewSheet)}
            >
              Выбрать этот лист как источник
            </button>
          )}
        </div>

        {loadingPreview && (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-secondary)" }}>
            Загрузка превью...
          </div>
        )}

        {previewError && (
          <div className="badge badge-error" style={{ padding: "16px", borderRadius: "8px", display: "block", textAlign: "left", lineHeight: "1.4" }}>
            <strong>Не удалось загрузить превью: </strong>{previewError}
          </div>
        )}

        {!loadingPreview && !previewError && previewData && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {previewData.length > 0 ? (
              <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "rgba(0,0,0,0.2)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", fontFamily: "var(--font-sans)", color: "var(--text-secondary)" }}>
                  <thead>
                    <tr style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
                      <th style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)", width: "30px", textAlign: "center", backgroundColor: "rgba(255,255,255,0.01)" }}>#</th>
                      {previewData[0].map((_, colIdx) => (
                        <th key={colIdx} style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)", fontWeight: "600", textAlign: "left" }}>
                          {getColHeader(colIdx)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, rowIdx) => (
                      <tr key={rowIdx} style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <td style={{ padding: "8px", borderRight: "1px solid var(--border)", textAlign: "center", backgroundColor: "rgba(255,255,255,0.01)", fontWeight: "600" }}>{rowIdx + 1}</td>
                        {row.map((cell, colIdx) => (
                          <td key={colIdx} style={{ padding: "8px 12px", borderRight: "1px solid var(--border)", color: rowIdx === 0 ? "white" : "var(--text-primary)", fontWeight: rowIdx === 0 ? "600" : "400" }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontStyle: "italic" }}>
                Этот лист пуст.
              </div>
            )}

            <div style={{ fontSize: "11px", color: "var(--text-muted)", backgroundColor: "rgba(255,255,255,0.01)", padding: "10px", borderRadius: "6px", border: "1px solid var(--border)" }}>
              <strong>💡 Справка по структуре:</strong> Для правильной работы дашбордов первая строка должна быть шапкой таблицы и содержать колонки с названиями: *Дата*, *Сумма*, *Тип* (со значениями *Income* / *Expense*), *Статья*, *Счет*, *Контрагент*.
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
