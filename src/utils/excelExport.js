const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const encoder = new TextEncoder();

const xmlEscape = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

const colName = (index) => {
  let name = "";
  let n = index;
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
};

const sanitizeFilePart = (value) => String(value || "")
  .trim()
  .replace(/[\\/:*?"<>|]+/g, "-")
  .replace(/\s+/g, "-")
  .slice(0, 80);

const formatDateForFile = (value) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  return value.replaceAll("-", "");
};

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const dosTimestamp = (date = new Date()) => {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = (year - 1980) << 9 | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
};

const write16 = (view, offset, value) => view.setUint16(offset, value, true);
const write32 = (view, offset, value) => view.setUint32(offset, value >>> 0, true);

const makeZip = (files) => {
  const { time, day } = dosTimestamp();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach(({ path, content }) => {
    const nameBytes = encoder.encode(path);
    const data = typeof content === "string" ? encoder.encode(content) : content;
    const crc = crc32(data);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    write32(localView, 0, 0x04034b50);
    write16(localView, 4, 20);
    write16(localView, 6, 0);
    write16(localView, 8, 0);
    write16(localView, 10, time);
    write16(localView, 12, day);
    write32(localView, 14, crc);
    write32(localView, 18, data.length);
    write32(localView, 22, data.length);
    write16(localView, 26, nameBytes.length);
    write16(localView, 28, 0);
    localHeader.set(nameBytes, 30);
    localParts.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    write32(centralView, 0, 0x02014b50);
    write16(centralView, 4, 20);
    write16(centralView, 6, 20);
    write16(centralView, 8, 0);
    write16(centralView, 10, 0);
    write16(centralView, 12, time);
    write16(centralView, 14, day);
    write32(centralView, 16, crc);
    write32(centralView, 20, data.length);
    write32(centralView, 24, data.length);
    write16(centralView, 28, nameBytes.length);
    write16(centralView, 30, 0);
    write16(centralView, 32, 0);
    write16(centralView, 34, 0);
    write16(centralView, 36, 0);
    write32(centralView, 38, 0);
    write32(centralView, 42, offset);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + data.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  write32(endView, 0, 0x06054b50);
  write16(endView, 4, 0);
  write16(endView, 6, 0);
  write16(endView, 8, files.length);
  write16(endView, 10, files.length);
  write32(endView, 12, centralSize);
  write32(endView, 16, offset);
  write16(endView, 20, 0);

  return new Blob([...localParts, ...centralParts, endRecord], { type: XLSX_MIME });
};

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0;[Red]-&quot;$&quot;#,##0;0"/>
    <numFmt numFmtId="165" formatCode="0.0%"/>
  </numFmts>
  <fonts count="5">
    <font><sz val="11"/><color rgb="FF111827"/><name val="Calibri"/></font>
    <font><b/><sz val="18"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF111827"/><name val="Calibri"/></font>
    <font><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/></font>
  </fonts>
  <fills count="7">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF2563EB"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEAF7EF"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFD1D5DB"/></left>
      <right style="thin"><color rgb="FFD1D5DB"/></right>
      <top style="thin"><color rgb="FFD1D5DB"/></top>
      <bottom style="thin"><color rgb="FFD1D5DB"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="13">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment horizontal="left"/></xf>
    <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="3" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="3" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="3" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="3" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="165" fontId="3" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const cellStyle = (kind, role) => {
  if (role === "title") return 1;
  if (role === "meta") return 2;
  if (role === "header") return 3;
  if (role === "label") {
    if (kind === "total") return 6;
    if (kind === "subtotal") return 5;
    if (kind === "section") return 4;
    return 0;
  }
  if (role === "currency") {
    if (kind === "total") return 10;
    if (kind === "subtotal") return 9;
    if (kind === "section") return 8;
    return 7;
  }
  if (role === "percent") return kind === "detail" ? 11 : 12;
  return 0;
};

const sheetCell = (rowNumber, colNumber, cell) => {
  const ref = `${colName(colNumber)}${rowNumber}`;
  const style = cell.style ?? 0;
  if (cell.value === undefined || cell.value === null || cell.value === "") {
    return `<c r="${ref}" s="${style}"/>`;
  }
  if (cell.type === "number") {
    const value = Number(cell.value);
    return `<c r="${ref}" s="${style}"><v>${Number.isFinite(value) ? value : 0}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr" s="${style}"><is><t>${xmlEscape(cell.value)}</t></is></c>`;
};

const buildWorksheetXml = ({ title, subtitle, meta = [], columns, rows }) => {
  const columnCount = Math.max(4, 1 + columns.length + 2);
  const lastCol = colName(columnCount);
  const mergeRefs = [`A1:${lastCol}1`, `A2:${lastCol}2`];
  const sheetRows = [];

  const pushRow = (cells, attrs = "") => {
    const rowNumber = sheetRows.length + 1;
    sheetRows.push(`<row r="${rowNumber}"${attrs}>${cells.map((cell, idx) => sheetCell(rowNumber, idx + 1, cell)).join("")}</row>`);
  };

  pushRow([{ value: title, style: cellStyle("title", "title") }], ' ht="28" customHeight="1"');
  pushRow([{ value: subtitle, style: cellStyle("detail", "meta") }]);

  meta.slice(0, 2).forEach(([label, value]) => {
    pushRow([
      { value: label, style: cellStyle("detail", "meta") },
      { value, style: cellStyle("detail", "meta") }
    ]);
  });

  const headerRow = sheetRows.length + 1;
  pushRow([
    { value: "Financial line", style: cellStyle("section", "header") },
    ...columns.map((name) => ({ value: name, style: cellStyle("section", "header") })),
    { value: "Total", style: cellStyle("section", "header") },
    { value: "% revenue", style: cellStyle("section", "header") }
  ], ' ht="22" customHeight="1"');

  rows.forEach((row) => {
    const label = row.indent ? `${" ".repeat(row.indent * 4)}${row.label}` : row.label;
    pushRow([
      { value: label, style: cellStyle(row.kind, "label") },
      ...row.values.map((value) => ({ value, type: "number", style: cellStyle(row.kind, "currency") })),
      { value: row.total, type: "number", style: cellStyle(row.kind, "currency") },
      { value: row.share, type: "number", style: cellStyle(row.kind, "percent") }
    ]);
  });

  const lastRow = sheetRows.length;
  const cols = [
    '<col min="1" max="1" width="44" customWidth="1"/>',
    columns.length > 0 ? `<col min="2" max="${columns.length + 1}" width="14" customWidth="1"/>` : "",
    `<col min="${columns.length + 2}" max="${columns.length + 2}" width="16" customWidth="1"/>`,
    `<col min="${columns.length + 3}" max="${columns.length + 3}" width="12" customWidth="1"/>`
  ].join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:${lastCol}${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRow}" topLeftCell="A${headerRow + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${headerRow + 1}" sqref="A${headerRow + 1}"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>${cols}</cols>
  <sheetData>${sheetRows.join("")}</sheetData>
  <autoFilter ref="A${headerRow}:${lastCol}${lastRow}"/>
  <mergeCells count="${mergeRefs.length}">${mergeRefs.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>
</worksheet>`;
};

const workbookFiles = (worksheetXml) => [
  {
    path: "[Content_Types].xml",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`
  },
  {
    path: "_rels/.rels",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
  },
  {
    path: "docProps/app.xml",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>FinanceFlow Dashboard</Application>
</Properties>`
  },
  {
    path: "docProps/core.xml",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>PnL Report</dc:title>
  <dc:creator>FinanceFlow Dashboard</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
</cp:coreProperties>`
  },
  {
    path: "xl/workbook.xml",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="16000"/></bookViews>
  <sheets><sheet name="PnL" sheetId="1" r:id="rId1"/></sheets>
</workbook>`
  },
  {
    path: "xl/_rels/workbook.xml.rels",
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  },
  { path: "xl/styles.xml", content: stylesXml },
  { path: "xl/worksheets/sheet1.xml", content: worksheetXml }
];

export const createPnlXlsxBlob = (report) => {
  const worksheetXml = buildWorksheetXml(report);
  return makeZip(workbookFiles(worksheetXml));
};

export const buildPnlFileName = ({ startDate, endDate, filterMode }) => {
  const start = formatDateForFile(startDate);
  const end = formatDateForFile(endDate);
  const suffix = start && end ? `${start}-${end}` : sanitizeFilePart(filterMode || "report");
  return `pnl-report-${suffix || "current"}.xlsx`;
};

export const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const downloadPnlReport = (report) => {
  const blob = createPnlXlsxBlob(report);
  const fileName = report.fileName || "pnl-report.xlsx";
  downloadBlob(blob, fileName);
  return fileName;
};

export const sharePnlReport = async (report) => {
  const blob = createPnlXlsxBlob(report);
  const fileName = report.fileName || "pnl-report.xlsx";

  if (typeof File !== "undefined" && navigator.share) {
    const file = new File([blob], fileName, { type: XLSX_MIME });
    if (!navigator.canShare || navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: report.title || "PnL Report",
        text: report.subtitle || "PnL report from FinanceFlow Dashboard",
        files: [file]
      });
      return { shared: true, fileName };
    }
  }

  downloadBlob(blob, fileName);
  const subject = encodeURIComponent(report.title || "PnL Report");
  const body = encodeURIComponent(`Excel file "${fileName}" has been downloaded. Attach it to this email before sending.`);
  window.open(`mailto:?subject=${subject}&body=${body}`, "_blank", "noopener,noreferrer");
  return { shared: false, downloaded: true, fileName };
};
