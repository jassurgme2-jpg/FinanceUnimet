import React, { useMemo, useState } from "react";

const REPORTS = [
  {
    id: "pnl",
    title: "Отчет PnL",
    subtitle: "Выручка, себестоимость, расходы и чистая прибыль",
    color: "var(--primary)",
    softBg: "rgba(var(--primary-rgb), 0.14)",
    status: "подключено"
  },
  {
    id: "cashflow",
    title: "Cash Flow",
    subtitle: "Движение денег по банку и кассе",
    color: "var(--info)",
    softBg: "rgba(var(--info-rgb), 0.14)",
    status: "подключено"
  },
  {
    id: "balance",
    title: "Балансовый отчет",
    subtitle: "Активы, капитал, займы, дебиторка и кредиторка",
    color: "var(--warning)",
    softBg: "rgba(var(--warning-rgb), 0.14)",
    status: "формула"
  }
];

const SOURCE_SHEETS = [
  {
    id: "trade-sales",
    title: "Реализация (торговля)",
    details: "L/N/P: выручка, НДС, себестоимость",
    usedBy: ["pnl"]
  },
  {
    id: "production-sales",
    title: "Реализация (производство)",
    details: "I/M/Q/U/X/AA/AD/AF: выручка и себестоимость",
    usedBy: ["pnl"]
  },
  {
    id: "plasma-sales",
    title: "Реализация (плазморез)",
    details: "T/U/V/W/Z/AA: PnL и лом для баланса",
    usedBy: ["pnl", "balance"]
  },
  {
    id: "cashback-sales",
    title: "Реализация (кешбек)",
    details: "K: прочий доход",
    usedBy: ["pnl"]
  },
  {
    id: "expenses",
    title: "Затраты",
    details: "B/C/E/I: статьи расходов, оплата, НДС",
    usedBy: ["pnl"]
  },
  {
    id: "salary",
    title: "Зарплата",
    details: "B/D/F: категории, форма оплаты, сумма",
    usedBy: ["pnl"]
  },
  {
    id: "surplus-loss",
    title: "Излишки/потери",
    details: "A/D/F/I: прочие доходы и расходы",
    usedBy: ["pnl"]
  },
  {
    id: "bank-cash",
    title: "Деньги р/с",
    details: "C/E/H/J: поступления и списания банка",
    usedBy: ["cashflow", "balance"]
  },
  {
    id: "cashbox",
    title: "Касса",
    details: "A/C/E/G: приход и расход наличных",
    usedBy: ["cashflow", "balance"]
  },
  {
    id: "ppe",
    title: "Основное средство",
    details: "A/J: дата и сумма ОС",
    usedBy: ["balance"]
  },
  {
    id: "inventory-trade",
    title: "ТМЗ",
    details: "B/S/W/AG: приход и расход торгового склада",
    usedBy: ["balance"]
  },
  {
    id: "inventory-production",
    title: "ТМЗ (производство)",
    details: "B/R/T/AD: приход и расход производства",
    usedBy: ["balance"]
  },
  {
    id: "waste",
    title: "Деловые отходы",
    details: "B/O/Q/Y: движение отходов",
    usedBy: ["balance"]
  },
  {
    id: "waste-accounting",
    title: "Учёт деловых отходов",
    details: "A/G/I/O: дополнительное движение отходов",
    usedBy: ["balance"]
  },
  {
    id: "scrap",
    title: "Лом",
    details: "B/I/K/T: движение лома",
    usedBy: ["balance"]
  },
  {
    id: "ar-register",
    title: "Единый реестр дебиторов",
    details: "A/C/D: дебиторская задолженность",
    usedBy: ["balance"]
  },
  {
    id: "ap-register",
    title: "Единый реестр кредиторов",
    details: "A/B/C: кредиторская задолженность",
    usedBy: ["balance"]
  },
  {
    id: "equity",
    title: "Собственный капитал",
    details: "A/C/E/G: взносы и выплаты собственников",
    usedBy: ["balance"]
  },
  {
    id: "loans",
    title: "Долгсрочный займ",
    details: "B/D/G/K: получение и погашение займа",
    usedBy: ["balance"]
  },
  {
    id: "sherzod",
    title: "Выплаты Шерзод Миркомилов",
    details: "A/C/E/H: связанные стороны",
    usedBy: ["balance"]
  },
  {
    id: "kichkina",
    title: "Выплаты Кичкина",
    details: "A/C/E/H: связанные стороны",
    usedBy: ["balance"]
  },
  {
    id: "stock-insight",
    title: "Склад Insight",
    details: "I2: финальный остаток ТМЗ торговли",
    usedBy: ["balance"]
  },
  {
    id: "current-balance",
    title: "Текущий баланс",
    details: "F12: дата старта реестров",
    usedBy: ["balance"]
  },
  {
    id: "pnl-report-sheet",
    title: "P&L Dynamic LET MAP",
    details: "строка 15: накопленная прибыль для капитала",
    usedBy: ["balance"]
  }
];

const REPORT_BY_ID = new Map(REPORTS.map((report) => [report.id, report]));

const SOURCE_COLUMNS = 2;
const SOURCE_CARD_WIDTH = 220;
const SOURCE_CARD_HEIGHT = 42;
const SOURCE_CARD_GAP = 5;
const SOURCE_COLUMN_GAP = 14;
const SOURCE_TOP = 18;
const SOURCE_LEFT = 22;
const GRAPH_HEIGHT = 586;
const REPORT_CARD_WIDTH = 218;
const REPORT_CARD_HEIGHT = 86;
const REPORT_RIGHT = 22;
const REPORT_PORT_X = 1000 - REPORT_RIGHT - REPORT_CARD_WIDTH - 12;
const REPORT_PORT_PADDING = 15;

const getSourceLayout = (index) => {
  const perColumn = Math.ceil(SOURCE_SHEETS.length / SOURCE_COLUMNS);
  const column = Math.floor(index / perColumn);
  const row = index % perColumn;
  const x = SOURCE_LEFT + column * (SOURCE_CARD_WIDTH + SOURCE_COLUMN_GAP);
  const y = SOURCE_TOP + row * (SOURCE_CARD_HEIGHT + SOURCE_CARD_GAP);

  return {
    x,
    y,
    startX: x + SOURCE_CARD_WIDTH,
    centerY: y + SOURCE_CARD_HEIGHT / 2
  };
};

export default function DataGraphView({ sheetMetadata = [] }) {
  const [hoveredNode, setHoveredNode] = useState(null);

  const availableSheetNames = useMemo(() => {
    return new Set(
      sheetMetadata
        .map((sheet) => sheet?.properties?.title)
        .filter(Boolean)
    );
  }, [sheetMetadata]);

  const hasMetadata = availableSheetNames.size > 0;
  const graphHeight = GRAPH_HEIGHT;

  const reportY = {
    pnl: 150,
    cashflow: 293,
    balance: 436
  };

  const reportCounts = REPORTS.reduce((acc, report) => {
    acc[report.id] = SOURCE_SHEETS.filter((source) => source.usedBy.includes(report.id)).length;
    return acc;
  }, {});

  const getReportCardHeight = (reportId) => {
    return Math.min(132, REPORT_CARD_HEIGHT + Math.max(0, reportCounts[reportId] - 8) * 4);
  };

  const getReportPortY = (reportId, portIndex, portCount) => {
    if (portCount <= 1) return reportY[reportId];

    const cardHeight = getReportCardHeight(reportId);
    const cardTop = Math.max(SOURCE_TOP, reportY[reportId] - cardHeight / 2);
    const portTop = cardTop + REPORT_PORT_PADDING;
    const portBottom = cardTop + cardHeight - REPORT_PORT_PADDING;

    return portTop + ((portBottom - portTop) * portIndex) / (portCount - 1);
  };

  const reportPortCursor = {};
  const connections = SOURCE_SHEETS.flatMap((source, sourceIndex) =>
    source.usedBy.map((reportId) => {
      const layout = getSourceLayout(sourceIndex);
      const portIndex = reportPortCursor[reportId] || 0;
      reportPortCursor[reportId] = portIndex + 1;

      return {
        source,
        report: REPORT_BY_ID.get(reportId),
        startX: layout.startX,
        startY: layout.centerY,
        endY: getReportPortY(reportId, portIndex, reportCounts[reportId]),
        portIndex
      };
    })
  );

  const isConnectionActive = (connection) => {
    if (!hoveredNode) return false;
    return hoveredNode === connection.source.id || hoveredNode === connection.report.id;
  };

  const isSourceActive = (source) => {
    if (!hoveredNode) return false;
    return hoveredNode === source.id || source.usedBy.includes(hoveredNode);
  };

  const isReportActive = (report) => {
    if (!hoveredNode) return false;
    return hoveredNode === report.id || SOURCE_SHEETS.some((source) => source.id === hoveredNode && source.usedBy.includes(report.id));
  };

  return (
    <div className="animate-fade-in" style={{ width: "100%" }}>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "18px", alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: "22px", textWrap: "balance" }}>Карта источников отчетов</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "6px", lineHeight: 1.5, textWrap: "pretty" }}>
              Слева реальные листы Google Sheets, справа отчеты, которые используют эти данные.
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {REPORTS.map((report) => (
              <span
                key={report.id}
                className="badge"
                style={{
                  color: report.color,
                  background: report.softBg,
                  border: `1px solid ${report.color}`,
                  fontVariantNumeric: "tabular-nums"
                }}
              >
                {report.title}: {reportCounts[report.id]}
              </span>
            ))}
          </div>
        </div>

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "12px",
            background: "rgba(0, 0, 0, 0.15)",
            overflowX: "auto",
            overflowY: "hidden"
          }}
        >
          <div style={{ position: "relative", minWidth: "980px", height: `${graphHeight}px` }}>
            <svg
              viewBox={`0 0 1000 ${graphHeight}`}
              preserveAspectRatio="none"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
            >
              {connections.map((connection, index) => {
                const active = isConnectionActive(connection);
                const curveStartX = Math.min(connection.startX + 150, REPORT_PORT_X - 150);
                const curveEndX = REPORT_PORT_X - 74;
                const path = `M ${connection.startX} ${connection.startY} C ${curveStartX} ${connection.startY}, ${curveEndX} ${connection.endY}, ${REPORT_PORT_X} ${connection.endY}`;

                return (
                  <g
                    key={`${connection.source.id}-${connection.report.id}-${index}`}
                    style={{ opacity: hoveredNode && !active ? 0.14 : 1 }}
                  >
                    <path
                      d={path}
                      fill="none"
                      stroke={active ? connection.report.color : "rgba(255, 255, 255, 0.045)"}
                      strokeWidth={active ? 1.3 : 0.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      style={{
                        transitionProperty: "stroke, stroke-width, opacity",
                        transitionDuration: "160ms",
                        transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)"
                      }}
                    />
                    {active && (
                      <circle
                        cx={REPORT_PORT_X}
                        cy={connection.endY}
                        r="1.65"
                        fill={connection.report.color}
                        opacity="0.72"
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            <div style={{ position: "absolute", inset: 0 }}>
              {SOURCE_SHEETS.map((source, index) => {
                const active = isSourceActive(source);
                const found = !hasMetadata || availableSheetNames.has(source.title);
                const layout = getSourceLayout(index);

                return (
                  <button
                    key={source.id}
                    type="button"
                    title={`${source.title} - ${source.details}`}
                    onMouseEnter={() => setHoveredNode(source.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onFocus={() => setHoveredNode(source.id)}
                    onBlur={() => setHoveredNode(null)}
                    style={{
                      position: "absolute",
                      left: `${layout.x}px`,
                      top: `${layout.y}px`,
                      width: `${SOURCE_CARD_WIDTH}px`,
                      height: `${SOURCE_CARD_HEIGHT}px`,
                      textAlign: "left",
                      border: active ? "1px solid rgba(255, 255, 255, 0.34)" : "1px solid var(--border)",
                      borderRadius: "8px",
                      background: active ? "rgba(255, 255, 255, 0.085)" : "rgba(17, 19, 28, 0.92)",
                      color: "var(--text-primary)",
                      padding: "7px 10px",
                      cursor: "pointer",
                      boxShadow: active ? "0 12px 28px rgba(0, 0, 0, 0.26)" : "none",
                      transform: active ? "translateX(3px)" : "translateX(0)",
                      transitionProperty: "background, border-color, box-shadow, transform",
                      transitionDuration: "160ms",
                      transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11.5px", fontWeight: 800, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {source.title}
                      </span>
                      <span
                        style={{
                          flex: "0 0 auto",
                          width: "8px",
                          height: "8px",
                          borderRadius: "999px",
                          background: found ? "var(--success)" : "var(--error)",
                          boxShadow: found ? "0 0 10px rgba(var(--success-rgb), 0.65)" : "0 0 10px rgba(var(--error-rgb), 0.55)"
                        }}
                        aria-label={found ? "Лист найден" : "Лист не найден"}
                      />
                    </div>
                    <div style={{ fontSize: "9.5px", color: "var(--text-secondary)", marginTop: "4px", lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {source.details}
                    </div>
                  </button>
                );
              })}
            </div>

            {REPORTS.map((report) => {
              const active = isReportActive(report);

              return (
                <button
                  key={report.id}
                  type="button"
                  onMouseEnter={() => setHoveredNode(report.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onFocus={() => setHoveredNode(report.id)}
                  onBlur={() => setHoveredNode(null)}
                  style={{
                    position: "absolute",
                    top: `${Math.max(SOURCE_TOP, reportY[report.id] - getReportCardHeight(report.id) / 2)}px`,
                    right: 22,
                    width: REPORT_CARD_WIDTH,
                    minHeight: `${getReportCardHeight(report.id)}px`,
                    textAlign: "left",
                    border: active ? `1px solid ${report.color}` : "1px solid var(--border)",
                    borderRadius: "8px",
                    background: active ? report.softBg : "rgba(17, 19, 28, 0.94)",
                    color: "var(--text-primary)",
                    padding: "10px",
                    cursor: "pointer",
                    transform: active ? "scale(1.02)" : "scale(1)",
                    boxShadow: active ? "0 16px 34px rgba(0, 0, 0, 0.3)" : "none",
                    transitionProperty: "background, border-color, box-shadow, transform",
                    transitionDuration: "180ms",
                    transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 800, color: report.color }}>
                        {report.title}
                      </div>
                      <div style={{ fontSize: "10.5px", color: "var(--text-secondary)", lineHeight: 1.3, marginTop: "5px" }}>
                        {report.subtitle}
                      </div>
                    </div>
                    <span
                      style={{
                        color: report.color,
                        background: report.softBg,
                        borderRadius: "999px",
                        padding: "2px 6px",
                        fontSize: "9.5px",
                        fontWeight: 700,
                        whiteSpace: "nowrap"
                      }}
                    >
                      {reportCounts[report.id]}
                    </span>
                  </div>

                  <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "9.5px" }}>статус</span>
                    <span style={{ color: report.color, fontSize: "9.5px", fontWeight: 700, textTransform: "uppercase" }}>
                      {report.status}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px" }}>
          <div style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", background: "rgba(255, 255, 255, 0.025)" }}>
            <div style={{ color: "var(--primary)", fontWeight: 800, fontSize: "12px" }}>PnL</div>
            <div style={{ color: "var(--text-secondary)", fontSize: "11px", marginTop: "4px", lineHeight: 1.45 }}>
              Берет 7 операционных листов, уже совпадает с Google Sheets до 31.05.2026.
            </div>
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", background: "rgba(255, 255, 255, 0.025)" }}>
            <div style={{ color: "var(--info)", fontWeight: 800, fontSize: "12px" }}>Cash Flow</div>
            <div style={{ color: "var(--text-secondary)", fontSize: "11px", marginTop: "4px", lineHeight: 1.45 }}>
              Берет только денежные движения из банка и кассы.
            </div>
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", background: "rgba(255, 255, 255, 0.025)" }}>
            <div style={{ color: "var(--warning)", fontWeight: 800, fontSize: "12px" }}>Баланс</div>
            <div style={{ color: "var(--text-secondary)", fontSize: "11px", marginTop: "4px", lineHeight: 1.45 }}>
              Берет источники по LET-формуле: ТМЗ, ОС, реестры, капитал, займы и связанные стороны.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
