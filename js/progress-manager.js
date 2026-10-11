/* ==========================================================================
   progress-manager.js — teaching progress for the whole textbook
   --------------------------------------------------------------------------
   Used by home.html (dashboard) and by every lesson page (teacher panel).
   Needs js/lesson-data.js to be loaded first (window.LESSON_INDEX).

   Status rules
   • developmentStatus  → comes ONLY from lesson-index.json / lesson-data.js.
   • teachingStatus     → the default comes from the index ("not_taught");
                          whatever the teacher saved in this browser wins.
   Storage: browser localStorage, keyed by stable lesson IDs ("lesson-01"…).
   localStorage belongs to one browser on one device — use the JSON backup
   (export / restore) to move progress to another computer or browser.
   ========================================================================== */
(function () {
  "use strict";

  var KEY = "dt3-textbook-progress-v1";
  var INDEX = window.LESSON_INDEX;
  if (!INDEX) { console.error("progress-manager.js: js/lesson-data.js must be loaded first"); return; }

  var DEV = {
    not_started: { ar: "لم يبدأ التطوير", en: "Not started", icon: "☐" },
    in_progress: { ar: "قيد التطوير",    en: "In progress", icon: "◐" },
    completed:   { ar: "جاهز للتدريس",   en: "Completed",   icon: "☑" }
  };
  var TEACH = {
    not_taught:  { ar: "لم يُشرح",  en: "Not taught",  icon: "☐" },
    in_progress: { ar: "قيد الشرح", en: "In progress", icon: "◐" },
    completed:   { ar: "تم الشرح",  en: "Completed",   icon: "☑" }
  };

  /* ---------- storage (with a safe in-memory fallback) ---------- */
  var persistent = true, memory = null;
  function emptyData() { return { version: 1, lessons: {}, updatedAt: null }; }
  function read() {
    if (memory) return memory;
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return emptyData();
      var d = JSON.parse(raw);
      if (!d || typeof d !== "object" || typeof d.lessons !== "object" || !d.lessons) throw new Error("bad shape");
      return d;
    } catch (e) {
      if (e && e.name === "SecurityError") { persistent = false; memory = emptyData(); return memory; }
      console.warn("Progress data was unreadable and has been ignored:", e);
      return emptyData();
    }
  }
  function write(d) {
    d.updatedAt = new Date().toISOString();
    if (memory) { memory = d; return false; }
    try { window.localStorage.setItem(KEY, JSON.stringify(d)); if (window.Cloud) Cloud.touch(); return true; }
    catch (e) { persistent = false; memory = d; return false; }
  }
  function storageOK() { read(); return persistent && !memory; }

  /* ---------- the textbook, flattened in original order ---------- */
  var ENTRIES = [];
  INDEX.units.forEach(function (u) {
    u.lessons.forEach(function (l) { ENTRIES.push({ lesson: l, unit: u }); });
  });

  function validTeach(s) { return Object.prototype.hasOwnProperty.call(TEACH, s); }
  function record(id) {
    var r = read().lessons[id];
    return r && validTeach(r.teaching) ? r : null;
  }
  function view(e) {
    var l = e.lesson, r = record(l.id);
    return {
      id: l.id, number: l.number, type: l.type, label: l.label, title: l.title,
      pages: l.pages, file: l.file, topics: l.topics || [], notes: l.notes || "",
      unitId: e.unit.id, unitLabel: e.unit.label, unitTitle: e.unit.title,
      dev: DEV[l.developmentStatus] ? l.developmentStatus : "not_started",
      teaching: r ? r.teaching : (validTeach(l.teachingStatus) ? l.teachingStatus : "not_taught"),
      startedAt: r ? r.startedAt || null : null,
      completedAt: r ? r.completedAt || null : null,
      updatedAt: r ? r.updatedAt || null : null
    };
  }
  function all() { return ENTRIES.map(view); }
  function get(id) { for (var i = 0; i < ENTRIES.length; i++) if (ENTRIES[i].lesson.id === id) return view(ENTRIES[i]); return null; }
  /* a lesson file exists once development has started; it is "ready to teach" only when completed */
  function canOpen(v) { return v.dev !== "not_started"; }
  function ready(v) { return v.dev === "completed"; }

  /* ---------- changing the teaching status ---------- */
  function setTeaching(id, status) {
    if (!validTeach(status) || !get(id)) return null;
    var d = read(), now = new Date().toISOString(), r = d.lessons[id] || {};
    r.teaching = status;
    if (status === "in_progress" && !r.startedAt) r.startedAt = now;
    if (status === "completed") { r.completedAt = now; if (!r.startedAt) r.startedAt = now; }
    if (status === "not_taught") { r.startedAt = null; r.completedAt = null; }
    r.updatedAt = now;
    d.lessons[id] = r;
    var saved = write(d);
    return { lesson: get(id), saved: saved };
  }

  /* ---------- summaries for the dashboard ---------- */
  function stats(list) {
    list = list || all();
    var s = { total: list.length, devDone: 0, devProgress: 0, devNot: 0, taught: 0, teaching: 0, notTaught: 0 };
    list.forEach(function (v) {
      if (v.dev === "completed") s.devDone++; else if (v.dev === "in_progress") s.devProgress++; else s.devNot++;
      if (v.teaching === "completed") s.taught++; else if (v.teaching === "in_progress") s.teaching++; else s.notTaught++;
    });
    s.remaining = s.total - s.taught;
    s.teachPct = s.total ? Math.round(s.taught / s.total * 100) : 0;
    s.devPct = s.total ? Math.round(s.devDone / s.total * 100) : 0;
    return s;
  }
  function units() {
    var list = all();
    return INDEX.units.map(function (u) {
      var items = list.filter(function (v) { return v.unitId === u.id; });
      return { id: u.id, type: u.type, label: u.label, title: u.title, pages: u.pages, lessons: items, stats: stats(items) };
    });
  }
  function byTime(field) { return function (a, b) { return String(b[field]).localeCompare(String(a[field])) || a.number - b.number; }; }
  function current() {
    var l = all().filter(function (v) { return v.teaching === "in_progress"; }).sort(byTime("updatedAt"));
    return l[0] || null;
  }
  function lastCompleted() {
    var l = all().filter(function (v) { return v.teaching === "completed"; }).sort(byTime("completedAt"));
    return l[0] || null;
  }
  /* The next lesson to teach is the first lesson, in textbook order, that has not been taught.
     If it is not ready yet, `available` is the first ready lesson after it that is not taught. */
  function next() {
    var list = all(), target = null, i;
    for (i = 0; i < list.length; i++) if (list[i].teaching === "not_taught") { target = list[i]; break; }
    if (!target) return { lesson: null, available: null };
    if (ready(target)) return { lesson: target, available: target };
    var avail = null;
    for (i = target.number; i < list.length; i++) if (list[i].teaching === "not_taught" && ready(list[i])) { avail = list[i]; break; }
    return { lesson: target, available: avail };
  }
  function nextToDevelop() {
    var l = all().filter(function (v) { return v.dev !== "completed"; });
    return l[0] || null;
  }
  function neighbours(id) {
    var list = all(), i;
    for (i = 0; i < list.length; i++) if (list[i].id === id) return { prev: list[i - 1] || null, next: list[i + 1] || null };
    return { prev: null, next: null };
  }

  /* ---------- carrying a status between pages through the link ----------
     Some browsers keep a separate localStorage for every local file (file://),
     so the dashboard and a lesson might not see each other's saves.
     Links between them therefore carry the lesson's latest status in ?sync=…
     and the newer record always wins. */
  function syncParam(id) {
    var r = record(id);
    return r ? "sync=" + encodeURIComponent(JSON.stringify({ id: id, r: r })) : "";
  }
  function withSync(url, id) {
    var p = syncParam(id);
    if (!p) return url;
    var hash = "", h = url.indexOf("#");
    if (h >= 0) { hash = url.slice(h); url = url.slice(0, h); }
    return url + (url.indexOf("?") >= 0 ? "&" : "?") + p + hash;
  }
  function applySyncFromURL() {
    var m = /[?&]sync=([^&#]*)/.exec(window.location.search);
    if (!m) return null;
    var applied = null;
    try {
      var o = JSON.parse(decodeURIComponent(m[1]));
      if (o && get(o.id) && o.r && validTeach(o.r.teaching)) {
        var d = read(), mine = d.lessons[o.id];
        if (!mine || String(o.r.updatedAt || "") > String(mine.updatedAt || "")) {
          d.lessons[o.id] = { teaching: o.r.teaching, startedAt: o.r.startedAt || null, completedAt: o.r.completedAt || null, updatedAt: o.r.updatedAt || new Date().toISOString() };
          write(d); applied = o.id;
        }
      }
    } catch (e) { console.warn("Ignored an invalid sync parameter", e); }
    try { // remove ?sync=… from the address bar, keep the #slide number
      var clean = window.location.search.replace(/([?&])sync=[^&#]*&?/, "$1").replace(/[?&]$/, "");
      window.history.replaceState(null, "", window.location.pathname + clean + window.location.hash);
    } catch (e) {}
    return applied;
  }

  /* ---------- export / backup / restore ---------- */
  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso); if (isNaN(d)) return "";
    try { return d.toLocaleDateString("ar-SA-u-ca-gregory-nu-arab", { year: "numeric", month: "long", day: "numeric" }); }
    catch (e) { return d.toISOString().slice(0, 10); }
  }
  function isoDay(iso) { return iso ? String(iso).slice(0, 10) : ""; }
  function md(s) { return String(s == null ? "" : s).replace(/\|/g, "\\|").replace(/\n/g, " "); }

  function exportMarkdown() {
    var list = all(), s = stats(list), lc = lastCompleted(), cur = current(), nx = next(), nd = nextToDevelop();
    var out = [];
    out.push("# Progress Tracker — " + INDEX.textbookTitle);
    out.push("");
    out.push("- **Textbook:** " + INDEX.textbookTitle + " (" + INDEX.edition + ")");
    out.push("- **Grade:** " + INDEX.stage + " — " + INDEX.grade);
    out.push("- **Source:** `" + INDEX.source + "`");
    out.push("- **Generated:** " + new Date().toISOString().slice(0, 16).replace("T", " ") + (storageOK() ? "" : " (warning: browser storage unavailable — statuses may be incomplete)"));
    out.push("");
    out.push("## Lessons");
    out.push("");
    out.push("| # | Unit | Lesson | Pages | HTML File | Development Status | Teaching Status | Started | Completed | Notes |");
    out.push("|---|---|---|---|---|---|---|---|---|---|");
    list.forEach(function (v) {
      out.push("| " + v.number + " | " + md(v.unitLabel + ": " + v.unitTitle) + " | " + md((v.type === "lesson" ? v.label + ": " : "") + v.title) +
        " | " + v.pages.from + "–" + v.pages.to + " | `" + v.file + "` | " + DEV[v.dev].en + " | " + TEACH[v.teaching].en +
        " | " + isoDay(v.startedAt) + " | " + isoDay(v.completedAt) + " | " + md(v.notes) + " |");
    });
    out.push("");
    out.push("## Statistics");
    out.push("");
    out.push("- Total entries in the textbook index: **" + s.total + "**");
    out.push("- Development — completed: **" + s.devDone + "**, in progress: **" + s.devProgress + "**, not started: **" + s.devNot + "**");
    out.push("- Teaching — completed: **" + s.taught + "**, in progress: **" + s.teaching + "**, not taught: **" + s.notTaught + "** (" + s.teachPct + "% taught)");
    out.push("");
    out.push("## Teaching position");
    out.push("");
    out.push("- Last completed lesson: " + (lc ? lc.id + " — " + lc.title + " (" + isoDay(lc.completedAt) + ")" : "none yet"));
    out.push("- Lesson currently in progress: " + (cur ? cur.id + " — " + cur.title : "none"));
    out.push("- Next lesson to teach: " + (nx.lesson ? nx.lesson.id + " — " + nx.lesson.title + (ready(nx.lesson) ? "" : " (not ready yet" + (nx.available ? "; next ready lesson: " + nx.available.id + " — " + nx.available.title : "") + ")") : "all lessons have been taught"));
    out.push("");
    out.push("## Development checkpoint");
    out.push("");
    out.push("- Next lesson to develop: " + (nd ? nd.id + " — " + nd.title + " (`" + nd.file + "`)" : "all lessons are developed"));
    out.push("- See README.md → \"Development Checkpoint\" for the full checkpoint.");
    out.push("");
    out.push("## Notes and unresolved issues");
    out.push("");
    (INDEX.openIssues && INDEX.openIssues.length ? INDEX.openIssues : ["None recorded."]).forEach(function (s) { out.push("- " + s); });
    out.push("");
    return out.join("\n");
  }
  function exportBackup() {
    return JSON.stringify({ app: "dt3-textbook-progress", version: 1, exportedAt: new Date().toISOString(), textbook: INDEX.textbookTitle, data: read() }, null, 2);
  }
  function importBackup(text) {
    var o = JSON.parse(text), d = o && (o.data || o);
    if (!d || typeof d.lessons !== "object" || !d.lessons) throw new Error("لا يحتوي الملف على بيانات تقدّم صالحة");
    var clean = emptyData(), n = 0;
    Object.keys(d.lessons).forEach(function (id) {
      var r = d.lessons[id];
      if (get(id) && r && validTeach(r.teaching)) {
        clean.lessons[id] = { teaching: r.teaching, startedAt: r.startedAt || null, completedAt: r.completedAt || null, updatedAt: r.updatedAt || null };
        n++;
      }
    });
    var saved = write(clean);
    return { count: n, saved: saved };
  }
  function resetAll() { return write(emptyData()); }
  function download(text, filename, type) {
    var blob = new Blob([text], { type: type + ";charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = filename; a.style.display = "none";
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  window.Progress = {
    KEY: KEY, DEV: DEV, TEACH: TEACH, index: INDEX,
    all: all, get: get, units: units, stats: stats, canOpen: canOpen, ready: ready,
    setTeaching: setTeaching, current: current, lastCompleted: lastCompleted, next: next,
    nextToDevelop: nextToDevelop, neighbours: neighbours,
    withSync: withSync, applySyncFromURL: applySyncFromURL,
    exportMarkdown: exportMarkdown, exportBackup: exportBackup, importBackup: importBackup,
    resetAll: resetAll, download: download, fmtDate: fmtDate, storageOK: storageOK
  };
})();
