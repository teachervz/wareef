/* ==========================================================================
   xlsx-reader.js — reads student names from an .xlsx file in the browser
   --------------------------------------------------------------------------
   No library: an .xlsx file is a zip of XML files. The zip entries are
   unpacked with the browser's DecompressionStream("deflate-raw")
   (Chrome / Edge 80+, Safari 16.4+, Firefox 113+).

   XLSXReader.readClasses(file) → Promise<[{ name, names: [..] }]>
     • one class per sheet
     • the class name comes from «شعبة ( 1 )» in the sheet title, else the sheet name
     • the names are the cells under the header «اسم الطالبة» (or «الاسم»)
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- zip ---------- */
  function u16(b, i) { return b[i] | (b[i + 1] << 8); }
  function u32(b, i) { return (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0; }
  function unzip(buf) {
    var b = new Uint8Array(buf), eocd = -1, i;
    for (i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(b, i) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error("الملف ليس ملف Excel (.xlsx)");
    var n = u16(b, eocd + 10), p = u32(b, eocd + 16), out = {}, dec = new TextDecoder();
    for (i = 0; i < n; i++) {
      if (u32(b, p) !== 0x02014b50) break;
      var method = u16(b, p + 10), size = u32(b, p + 20), nl = u16(b, p + 28), xl = u16(b, p + 30), cl = u16(b, p + 32), off = u32(b, p + 42);
      var name = dec.decode(b.subarray(p + 46, p + 46 + nl));
      var start = off + 30 + u16(b, off + 26) + u16(b, off + 28);
      out[name] = { method: method, data: b.subarray(start, start + size) };
      p += 46 + nl + xl + cl;
    }
    return out;
  }
  function text(entry) {
    if (!entry) return Promise.resolve("");
    if (entry.method === 0) return Promise.resolve(new TextDecoder().decode(entry.data));
    if (entry.method !== 8) return Promise.reject(new Error("طريقة ضغط غير مدعومة في الملف"));
    if (!window.DecompressionStream) return Promise.reject(new Error("المتصفح قديم — افتحي الصفحة في Chrome أو Edge"));
    var ds = new Blob([entry.data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Response(ds).text();
  }

  /* ---------- workbook ---------- */
  function xml(s) { return new DOMParser().parseFromString(s, "application/xml"); }
  function tags(doc, name) { return Array.prototype.slice.call(doc.getElementsByTagNameNS("*", name)); }
  function colRow(ref) { var m = /^([A-Z]+)(\d+)$/.exec(ref || ""); if (!m) return null;
    var c = 0; for (var i = 0; i < m[1].length; i++) c = c * 26 + m[1].charCodeAt(i) - 64; return { c: c, r: +m[2] }; }
  function cellText(c, shared) {
    var t = c.getAttribute("t"), v = tags(c, "v")[0];
    if (t === "s") return v ? shared[+v.textContent] || "" : "";
    if (t === "inlineStr") return tags(c, "t").map(function (x) { return x.textContent; }).join("");
    return v ? v.textContent : "";
  }
  function readSheet(doc, shared) {
    var cells = [];
    tags(doc, "c").forEach(function (c) {
      var p = colRow(c.getAttribute("r")), v = cellText(c, shared).replace(/\s+/g, " ").trim();
      if (p && v) cells.push({ c: p.c, r: p.r, v: v });
    });
    return cells;
  }
  function classFrom(cells, sheetName, index) {
    var title = cells.filter(function (x) { return x.r <= 3; }).map(function (x) { return x.v; }).join(" ");
    var m = /شعبة\s*\(?\s*([0-9٠-٩]+)/.exec(title) || /شعبة\s*\(?\s*([0-9٠-٩]+)/.exec(sheetName);
    var head = cells.find(function (x) { return /^(اسم الطالب[ةه]?|الاسم|اسم الطالبة الرباعي)$/.test(x.v); });
    var names = [];
    if (head) {
      cells.filter(function (x) { return x.c === head.c && x.r > head.r; }).sort(function (a, b) { return a.r - b.r; }).forEach(function (x) {
        // keep real names: Arabic or Latin letters, not numbers, notes or long text
        if (/[؀-ۿa-zA-Z]/.test(x.v) && !/[:：]/.test(x.v) && x.v.length <= 60) names.push(x.v);
      });
    }
    return { name: m ? "شعبة " + m[1] : (sheetName || "فصل " + (index + 1)), names: names };
  }

  function readClasses(file) {
    return file.arrayBuffer().then(function (buf) {
      var z = unzip(buf);
      if (!z["xl/workbook.xml"]) throw new Error("الملف ليس ملف Excel (.xlsx)");
      return Promise.all([text(z["xl/workbook.xml"]), text(z["xl/_rels/workbook.xml.rels"]), text(z["xl/sharedStrings.xml"])]).then(function (r) {
        var wb = xml(r[0]), rels = {}, shared = [];
        if (r[1]) tags(xml(r[1]), "Relationship").forEach(function (x) { rels[x.getAttribute("Id")] = x.getAttribute("Target"); });
        if (r[2]) tags(xml(r[2]), "si").forEach(function (si) { shared.push(tags(si, "t").map(function (t) { return t.textContent; }).join("")); });
        var sheets = tags(wb, "sheet").map(function (s, i) {
          var rid = s.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") || s.getAttribute("r:id");
          var target = (rels[rid] || "worksheets/sheet" + (i + 1) + ".xml").replace(/^\/?xl\//, "").replace(/^\//, "");
          return { name: s.getAttribute("name"), path: "xl/" + target };
        });
        return Promise.all(sheets.map(function (s) { return text(z[s.path]); })).then(function (docs) {
          return sheets.map(function (s, i) { return classFrom(readSheet(xml(docs[i]), shared), s.name, i); })
            .filter(function (k) { return k.names.length; });
        });
      });
    });
  }

  window.XLSXReader = { readClasses: readClasses };
})();
