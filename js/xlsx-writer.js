/* ==========================================================================
   xlsx-writer.js — creates real Excel files (.xlsx) in the browser, no library.
   --------------------------------------------------------------------------
   XLSX.download(sheets, "file.xlsx", {activeTab})
   sheet = { name, rows:[[cell…]…], cols:[widths…], merges:["A1:F1"…],
             freezeRows: n, freezeCols: n }
   cell  = null | "text" | number | { v: value, s: styleName }
   styles: title, sub, head, cell, name, num, total, bad, good, warn, note
   Sheets are right-to-left. Files are stored (uncompressed) in a standard ZIP.
   ========================================================================== */
(function () {
  "use strict";
  var enc = new TextEncoder();

  /* ---------- ZIP (store) ---------- */
  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) {
    var parts = [], central = [], off = 0;
    files.forEach(function (f) {
      var nm = enc.encode(f.name), d = enc.encode(f.text), crc = crc32(d);
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, 0, true); h.setUint16(12, 0x21, true); h.setUint32(14, crc, true); h.setUint32(18, d.length, true);
      h.setUint32(22, d.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), nm, d);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint16(10, 0, true); c.setUint16(12, 0, true); c.setUint16(14, 0x21, true); c.setUint32(16, crc, true);
      c.setUint32(20, d.length, true); c.setUint32(24, d.length, true); c.setUint16(28, nm.length, true);
      c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), nm);
      off += 30 + nm.length + d.length;
    });
    var size = central.reduce(function (a, b) { return a + b.length; }, 0);
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, size, true); e.setUint32(16, off, true);
    return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]), { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  /* ---------- styles ---------- */
  var STYLE = { def: 0, title: 1, sub: 2, head: 3, cell: 4, name: 5, num: 6, total: 7, bad: 8, good: 9, warn: 10, note: 11 };
  var BORDER = '<left style="thin"><color rgb="FFD9CCF5"/></left><right style="thin"><color rgb="FFD9CCF5"/></right><top style="thin"><color rgb="FFD9CCF5"/></top><bottom style="thin"><color rgb="FFD9CCF5"/></bottom><diagonal/>';
  var STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="0.0"/></numFmts>' +
    '<fonts count="5">' +
      '<font><sz val="11"/><name val="Arial"/></font>' +
      '<font><b/><sz val="16"/><color rgb="FF4C1D95"/><name val="Arial"/></font>' +
      '<font><sz val="11"/><color rgb="FF5B4B7E"/><name val="Arial"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>' +
      '<font><b/><sz val="11"/><name val="Arial"/></font></fonts>' +
    '<fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF6C3FD1"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFF1ECFF"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFFE1E6"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFDDF7EA"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF2D6"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border>' + BORDER + '</border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="12">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1"/></xf>' +
    '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  /* ---------- sheets ---------- */
  function x(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ""); }
  function col(n) { var s = ""; n++; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function cellXml(ref, c) {
    if (c == null || c === "") return "";
    var v = c, s = null;
    if (typeof c === "object") { v = c.v; s = STYLE[c.s]; }
    var sa = s ? ' s="' + s + '"' : "";
    if (v == null || v === "") return s ? '<c r="' + ref + '"' + sa + "/>" : "";
    if (typeof v === "number" && isFinite(v)) return '<c r="' + ref + '"' + sa + "><v>" + v + "</v></c>";
    return '<c r="' + ref + '"' + sa + ' t="inlineStr"><is><t xml:space="preserve">' + x(v) + "</t></is></c>";
  }
  function sheetXml(sh) {
    var fr = sh.freezeRows || 0, fc = sh.freezeCols || 0, pane = "";
    if (fr || fc) pane = '<pane' + (fc ? ' xSplit="' + fc + '"' : "") + (fr ? ' ySplit="' + fr + '"' : "") + ' topLeftCell="' + col(fc) + (fr + 1) + '" activePane="' + (fr && fc ? "bottomRight" : fr ? "bottomLeft" : "topRight") + '" state="frozen"/>';
    var cols = (sh.cols || []).map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join("");
    var rows = sh.rows.map(function (r, ri) {
      var ht = ri === 0 ? ' ht="30" customHeight="1"' : "";
      return '<row r="' + (ri + 1) + '"' + ht + ">" + (r || []).map(function (c, ci) { return cellXml(col(ci) + (ri + 1), c); }).join("") + "</row>";
    }).join("");
    var merges = (sh.merges || []).length ? '<mergeCells count="' + sh.merges.length + '">' + sh.merges.map(function (m) { return '<mergeCell ref="' + m + '"/>'; }).join("") + "</mergeCells>" : "";
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheetViews><sheetView rightToLeft="1" workbookViewId="0">' + pane + "</sheetView></sheetViews>" +
      '<sheetFormatPr defaultRowHeight="18"/>' + (cols ? "<cols>" + cols + "</cols>" : "") + "<sheetData>" + rows + "</sheetData>" + merges +
      '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>';
  }
  function safeName(n, used) {
    var s = String(n).replace(/[\[\]:*?\/\\]/g, "-").slice(0, 31) || "Sheet", k = 2, b = s;
    while (used[s]) { var suf = " " + k++; s = b.slice(0, 31 - suf.length) + suf; }
    used[s] = 1; return s;
  }
  function build(sheets, opt) {
    opt = opt || {}; var used = {};
    var names = sheets.map(function (s) { return safeName(s.name, used); });
    var files = [
      { name: "[Content_Types].xml", text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        sheets.map(function (_, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join("") + "</Types>" },
      { name: "_rels/.rels", text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: "xl/workbook.xml", text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="' + (opt.activeTab || 0) + '"/></bookViews><sheets>' +
        names.map(function (n, i) { return '<sheet name="' + x(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join("") + "</sheets></workbook>" },
      { name: "xl/_rels/workbook.xml.rels", text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        sheets.map(function (_, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join("") +
        '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: "xl/styles.xml", text: STYLES }
    ].concat(sheets.map(function (s, i) { return { name: "xl/worksheets/sheet" + (i + 1) + ".xml", text: sheetXml(s) }; }));
    return zip(files);
  }
  function download(sheets, filename, opt) {
    var blob = build(sheets, opt), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = filename; a.style.display = "none";
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    return blob;
  }
  window.XLSX = { build: build, download: download, col: col };
})();
