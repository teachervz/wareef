/* ==========================================================================
   classroom-manager.js — classroom data: teacher profile, classes, students,
   attendance, quick-evaluation icons, notes and year-work grades.
   --------------------------------------------------------------------------
   Used by classroom.html (and by home.html for the first-run check + backup).
   Stored in this browser (localStorage key below); when js/cloud-sync.js is
   configured, every save is also uploaded to the teacher's account.
   ========================================================================== */
(function () {
  "use strict";
  var KEY = "dt3-classroom-v1";
  var DRAFT_KEY = "dt3-setup-draft-v1";      // what the teacher typed in the setup page before finishing
  var LETTERS = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي"];

  var ATT = {               // attendance statuses
    p: { ar: "حاضرة",   icon: "✅", short: "حاضرة" },
    a: { ar: "غائبة",   icon: "❌", short: "غائبة" },
    l: { ar: "متأخرة",  icon: "⏰", short: "متأخرة" },
    e: { ar: "مستأذنة", icon: "📝", short: "مستأذنة" }
  };
  var DEFAULT_ICONS = [
    { id: "star", icon: "⭐", label: "مشاركة متميزة",   kind: "pos" },
    { id: "good", icon: "👍", label: "إجابة صحيحة",      kind: "pos" },
    { id: "hw",   icon: "📚", label: "أنجزت الواجب",     kind: "pos" },
    { id: "team", icon: "🤝", label: "تعاون مع الزميلات", kind: "pos" },
    { id: "nohw", icon: "📕", label: "لم تُنجز الواجب",   kind: "neg" },
    { id: "nobk", icon: "🎒", label: "لم تُحضر الكتاب",   kind: "neg" },
    { id: "warn", icon: "🔔", label: "تحتاج تنبيهًا",     kind: "neg" }
  ];
  /* A suggested split only — the teacher edits it to match the official distribution. */
  var DEFAULT_COMPONENTS = [
    { id: "c1", name: "المشاركة والتفاعل",  max: 10 },
    { id: "c2", name: "الواجبات",           max: 10 },
    { id: "c3", name: "المهام الأدائية",     max: 20 },
    { id: "c4", name: "الاختبارات القصيرة", max: 20 },
    { id: "c5", name: "المشروع",            max: 10 },
    { id: "c6", name: "الاختبار النهائي",   max: 30 }
  ];
  var DEFAULT_SCALE = [
    { min: 90, label: "ممتاز" }, { min: 80, label: "جيد جدًا" }, { min: 70, label: "جيد" },
    { min: 60, label: "مقبول" }, { min: 0, label: "يحتاج دعمًا" }
  ];
  var DEFAULT_ALERTS = { absences: 3, negatives: 3, pct: 60 };
  /* أدوات الحصة — المعلمة تفعّل كل أداة أو توقفها من الإعدادات */
  var GROUP_PRESETS = [
    { name: "الدرع", icon: "🛡️", color: "#7C3AED" }, { name: "المفتاح", icon: "🔑", color: "#EC4899" },
    { name: "الشيفرة", icon: "💻", color: "#14B8A6" }, { name: "الرادار", icon: "📡", color: "#F97316" },
    { name: "القفل", icon: "🔒", color: "#3B82F6" }, { name: "البوصلة", icon: "🧭", color: "#22C55E" },
    { name: "الصقر", icon: "🦅", color: "#EAB308" }, { name: "النجمة", icon: "⭐", color: "#EF4444" } ];
  var DEFAULT_STRATEGIES = {
    attendance: true,        // التحضير أول كل درس
    lottery: true,           // قرعة الإجابة
    lotteryMode: "student",  // student | group
    noRepeat: true,          // لا يتكرر الاسم حتى يأتي دور الجميع
    individual: true,        // التقييم الفردي: نقطة للطالبة عند الإجابة الصحيحة
    groups: true,            // استراتيجية المجموعات
    groupCount: 4,
    groupNames: GROUP_PRESETS.map(function (g) { return g.name; }),
    awardPopup: true         // نافذة «أي مجموعة أجابت؟» بعد كل إجابة صحيحة
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function empty() {
    return { version: 1, profile: null, setupSkipped: false,
      settings: { icons: clone(DEFAULT_ICONS), components: clone(DEFAULT_COMPONENTS), scale: clone(DEFAULT_SCALE), alerts: clone(DEFAULT_ALERTS), strategies: clone(DEFAULT_STRATEGIES) },
      classes: [], activeClassId: null, attendance: {}, events: {}, grades: {}, groupPoints: {}, lottery: {}, updatedAt: null };
  }
  /* repair anything missing so old or partial data never breaks the page */
  function normalize(d) {
    var e = empty();
    if (!d || typeof d !== "object") return e;
    var o = {
      version: 1,
      profile: d.profile && typeof d.profile === "object" ? d.profile : null,
      setupSkipped: !!d.setupSkipped,
      settings: Object.assign({}, e.settings, d.settings || {}),
      classes: Array.isArray(d.classes) ? d.classes : [],
      activeClassId: d.activeClassId || null,
      attendance: d.attendance && typeof d.attendance === "object" ? d.attendance : {},
      events: d.events && typeof d.events === "object" ? d.events : {},
      grades: d.grades && typeof d.grades === "object" ? d.grades : {},
      groupPoints: d.groupPoints && typeof d.groupPoints === "object" ? d.groupPoints : {},
      lottery: d.lottery && typeof d.lottery === "object" ? d.lottery : {},
      updatedAt: d.updatedAt || null
    };
    ["icons", "components", "scale"].forEach(function (k) { if (!Array.isArray(o.settings[k]) || !o.settings[k].length) o.settings[k] = clone(e.settings[k]); });
    o.settings.alerts = Object.assign({}, DEFAULT_ALERTS, o.settings.alerts || {});
    o.settings.strategies = Object.assign({}, DEFAULT_STRATEGIES, o.settings.strategies || {});
    if (!Array.isArray(o.settings.strategies.groupNames)) o.settings.strategies.groupNames = clone(DEFAULT_STRATEGIES.groupNames);
    o.classes = o.classes.filter(function (c) { return c && c.id; }).map(function (c) {
      return { id: c.id, name: String(c.name || "فصل"), students: (Array.isArray(c.students) ? c.students : []).filter(function (s) { return s && s.id; })
        .map(function (s) { return { id: s.id, name: String(s.name || ""), notes: Array.isArray(s.notes) ? s.notes : [], group: typeof s.group === "number" ? s.group : null }; }) };
    });
    if (!o.classes.some(function (c) { return c.id === o.activeClassId; })) o.activeClassId = o.classes[0] ? o.classes[0].id : null;
    return o;
  }

  /* ---------- storage ---------- */
  var D = null, persistent = true;
  function load() {
    try { var raw = localStorage.getItem(KEY); D = normalize(raw ? JSON.parse(raw) : null); }
    catch (e) { console.warn("Classroom data unreadable — starting empty", e); D = empty(); if (e && e.name === "SecurityError") persistent = false; }
    return D;
  }
  function save() {
    D.updatedAt = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(D)); persistent = true; if (window.Cloud) Cloud.touch(); return true; }
    catch (e) { persistent = false; return false; }
  }
  function data() { return D || load(); }

  /* ---------- profile ---------- */
  function hasProfile() { var d = data(); return !!(d.profile && d.profile.teacher); }
  function needsSetup() { var d = data(); return !hasProfile() && !d.setupSkipped; }
  function setProfile(p) {
    var d = data();
    d.profile = { teacher: String(p.teacher || "").trim(), school: String(p.school || "").trim(), subject: String(p.subject || "").trim(),
      year: String(p.year || "").trim(), gradeName: String(p.gradeName != null ? p.gradeName : (d.profile && d.profile.gradeName) || "").trim(),
      createdAt: (d.profile && d.profile.createdAt) || new Date().toISOString() };
    d.setupSkipped = false; return save();
  }
  function skipSetup() { data().setupSkipped = true; return save(); }

  /* ---------- classes & students ---------- */
  function cls(id) { var d = data(); return d.classes.find(function (c) { return c.id === (id || d.activeClassId); }) || null; }
  /* one name per line; removes numbering like "1- ", "١.", "3) " and tabs/extra spaces from pasted lists */
  function parseNames(text) {
    var seen = {}, out = [];
    String(text || "").split(/\r?\n|،|;/).forEach(function (line) {
      var n = line.replace(/\t+/g, " ").replace(/^[\s\d٠-٩]+[\-\.\)\:،]*\s*/, "").replace(/\s+/g, " ").trim();
      if (n && !seen[n]) { seen[n] = 1; out.push(n); }
    });
    return out;
  }
  /* "ثالث ثانوي" + the first letter (أ، ب، ج…) not used yet */
  function nextClassName() {
    var d = data(), g = (d.profile && d.profile.gradeName) || "فصل", used = {};
    d.classes.forEach(function (c) { used[c.name] = 1; });
    for (var i = 0; i < LETTERS.length; i++) if (!used[g + " " + LETTERS[i]]) return g + " " + LETTERS[i];
    return g + " " + (d.classes.length + 1);
  }
  function addClass(name, namesText) {
    var d = data(), c = { id: uid("k"), name: String(name || "").trim() || nextClassName(), students: [] };
    d.classes.push(c); d.activeClassId = c.id;
    if (namesText) addStudents(c.id, namesText, true);
    save(); return c;
  }
  function renameClass(id, name) { var c = cls(id); if (c && String(name).trim()) { c.name = String(name).trim(); save(); } }
  function deleteClass(id) {
    var d = data(); d.classes = d.classes.filter(function (c) { return c.id !== id; });
    delete d.attendance[id]; delete d.events[id]; delete d.grades[id];
    if (d.activeClassId === id) d.activeClassId = d.classes[0] ? d.classes[0].id : null;
    save();
  }
  function setActive(id) { if (cls(id)) { data().activeClassId = id; save(); } }
  function addStudents(classId, text, noSave) {
    var c = cls(classId); if (!c) return 0;
    var have = {}; c.students.forEach(function (s) { have[s.name] = 1; });
    var added = 0;
    parseNames(text).forEach(function (n) { if (!have[n]) { c.students.push({ id: uid("s"), name: n, notes: [] }); have[n] = 1; added++; } });
    if (!noSave) save(); return added;
  }
  function renameStudent(classId, sid, name) { var s = student(classId, sid); if (s && String(name).trim()) { s.name = String(name).trim(); save(); } }
  function deleteStudent(classId, sid) {
    var d = data(), c = cls(classId); if (!c) return;
    c.students = c.students.filter(function (s) { return s.id !== sid; });
    Object.keys(d.attendance[c.id] || {}).forEach(function (day) { delete d.attendance[c.id][day][sid]; });
    d.events[c.id] = (d.events[c.id] || []).filter(function (e) { return e.sid !== sid; });
    if (d.grades[c.id]) delete d.grades[c.id][sid];
    save();
  }
  function sortStudents(classId) { var c = cls(classId); if (c) { c.students.sort(function (a, b) { return a.name.localeCompare(b.name, "ar"); }); save(); } }
  function student(classId, sid) { var c = cls(classId); return c ? c.students.find(function (s) { return s.id === sid; }) || null : null; }

  /* ---------- attendance ---------- */
  function day(classId, date) { var d = data(), c = cls(classId); if (!c) return {}; return (d.attendance[c.id] || {})[date || today()] || {}; }
  function mark(classId, date, sid, status) {
    var d = data(), c = cls(classId); if (!c) return;
    date = date || today(); d.attendance[c.id] = d.attendance[c.id] || {};
    var rec = d.attendance[c.id][date] = d.attendance[c.id][date] || {};
    if (status && ATT[status]) rec[sid] = status; else delete rec[sid];
    if (!Object.keys(rec).length) delete d.attendance[c.id][date];
    save();
  }
  function markAll(classId, date, status, onlyEmpty) {
    var d = data(), c = cls(classId); if (!c) return;
    date = date || today(); d.attendance[c.id] = d.attendance[c.id] || {};
    var rec = d.attendance[c.id][date] = d.attendance[c.id][date] || {};
    c.students.forEach(function (s) { if (!onlyEmpty || !rec[s.id]) rec[s.id] = status; });
    save();
  }
  function clearDay(classId, date) { var d = data(), c = cls(classId); if (c && d.attendance[c.id]) { delete d.attendance[c.id][date]; save(); } }
  function dates(classId) { var d = data(), c = cls(classId); return c ? Object.keys(d.attendance[c.id] || {}).sort() : []; }
  function attendanceOf(classId, sid) {
    var d = data(), c = cls(classId), r = { p: 0, a: 0, l: 0, e: 0, days: 0, rate: null, absentDates: [] };
    if (!c) return r;
    Object.keys(d.attendance[c.id] || {}).sort().forEach(function (day) {
      var st = d.attendance[c.id][day][sid]; if (!st) return;
      r[st]++; r.days++; if (st === "a") r.absentDates.push(day);
    });
    r.rate = r.days ? Math.round((r.p + r.l + r.e) / r.days * 100) : null;
    return r;
  }

  /* ---------- quick-evaluation icons ---------- */
  function icon(id) { return data().settings.icons.find(function (i) { return i.id === id; }) || null; }
  function addEvent(classId, sid, iconId, date) {
    var d = data(), c = cls(classId); if (!c || !icon(iconId)) return null;
    var ev = { id: uid("e"), sid: sid, icon: iconId, date: date || today(), ts: new Date().toISOString() };
    (d.events[c.id] = d.events[c.id] || []).push(ev); save(); return ev;
  }
  function removeEvent(classId, evId) { var d = data(), c = cls(classId); if (!c) return; d.events[c.id] = (d.events[c.id] || []).filter(function (e) { return e.id !== evId; }); save(); }
  function eventsOf(classId, sid, date) {
    var d = data(), c = cls(classId); if (!c) return [];
    return (d.events[c.id] || []).filter(function (e) { return (!sid || e.sid === sid) && (!date || e.date === date); });
  }
  function eventCounts(classId, sid, date) {
    var out = { pos: 0, neg: 0, by: {} };
    eventsOf(classId, sid, date).forEach(function (e) {
      var ic = icon(e.icon); if (!ic) return;
      out.by[e.icon] = (out.by[e.icon] || 0) + 1; out[ic.kind === "neg" ? "neg" : "pos"]++;
    });
    return out;
  }

  /* ---------- notes ---------- */
  function addNote(classId, sid, text) { var s = student(classId, sid); if (!s || !String(text).trim()) return null;
    var n = { id: uid("n"), date: today(), text: String(text).trim() }; s.notes.push(n); save(); return n; }
  function deleteNote(classId, sid, nid) { var s = student(classId, sid); if (s) { s.notes = s.notes.filter(function (n) { return n.id !== nid; }); save(); } }

  /* ---------- grades ---------- */
  function components() { return data().settings.components; }
  function maxTotal() { return components().reduce(function (a, c) { return a + (+c.max || 0); }, 0); }
  function rating(pct) {
    if (pct == null) return "";
    var sc = data().settings.scale.slice().sort(function (a, b) { return b.min - a.min; });
    for (var i = 0; i < sc.length; i++) if (pct >= sc[i].min) return sc[i].label;
    return sc.length ? sc[sc.length - 1].label : "";
  }
  /* returns false when the value is outside 0..max */
  function setGrade(classId, sid, compId, value) {
    var d = data(), c = cls(classId), comp = components().find(function (x) { return x.id === compId; });
    if (!c || !comp) return false;
    d.grades[c.id] = d.grades[c.id] || {}; var row = d.grades[c.id][sid] = d.grades[c.id][sid] || {};
    if (value === "" || value == null) { delete row[compId]; save(); return true; }
    var v = Number(String(value).replace(/[٠-٩]/g, function (x) { return "٠١٢٣٤٥٦٧٨٩".indexOf(x); }).replace("٫", "."));
    if (isNaN(v) || v < 0 || v > +comp.max) return false;
    row[compId] = Math.round(v * 100) / 100; save(); return true;
  }
  function gradeRow(classId, sid) {
    var d = data(), c = cls(classId), row = (c && d.grades[c.id] && d.grades[c.id][sid]) || {};
    var total = 0, filled = 0, filledMax = 0, comps = components();
    comps.forEach(function (k) { if (typeof row[k.id] === "number") { total += row[k.id]; filled++; filledMax += +k.max; } });
    /* while marks are still being entered, the percentage is measured against the items entered so far */
    var max = maxTotal(), pct = filledMax ? Math.round(total / filledMax * 1000) / 10 : null;
    return { values: row, total: Math.round(total * 100) / 100, max: max, filledMax: filledMax, pct: pct, rating: rating(pct), filled: filled, complete: filled === comps.length };
  }
  function fillEmpty(classId, compId, value) {
    var c = cls(classId); if (!c) return 0; var n = 0;
    c.students.forEach(function (s) { var r = gradeRow(classId, s.id); if (typeof r.values[compId] !== "number" && setGrade(classId, s.id, compId, value)) n++; });
    return n;
  }
  function setComponents(list) {
    data().settings.components = list.filter(function (c) { return c.name && +c.max > 0; }).map(function (c) { return { id: c.id || uid("c"), name: String(c.name).trim(), max: +c.max }; });
    save();
  }
  function setIcons(list) {
    var l = list.filter(function (i) { return i.icon && i.label; }).map(function (i) { return { id: i.id || uid("i"), icon: String(i.icon).trim(), label: String(i.label).trim(), kind: i.kind === "neg" ? "neg" : "pos" }; });
    if (l.length) { data().settings.icons = l; save(); }
  }
  function setScale(list) {
    var l = list.filter(function (s) { return s.label && s.min !== "" && !isNaN(+s.min); }).map(function (s) { return { min: +s.min, label: String(s.label).trim() }; });
    if (l.length) { data().settings.scale = l.sort(function (a, b) { return b.min - a.min; }); save(); }
  }
  function setAlerts(a) { data().settings.alerts = Object.assign({}, DEFAULT_ALERTS, a); save(); }

  /* ---------- class report ---------- */
  function report(classId) {
    var c = cls(classId), al = data().settings.alerts;
    if (!c) return null;
    var rows = c.students.map(function (s) {
      return { s: s, att: attendanceOf(c.id, s.id), ev: eventCounts(c.id, s.id), g: gradeRow(c.id, s.id) };
    });
    var graded = rows.filter(function (r) { return r.g.pct != null; }).map(function (r) { return r.g.pct; });
    var avg = graded.length ? Math.round(graded.reduce(function (a, b) { return a + b; }, 0) / graded.length * 10) / 10 : null;
    var dist = {}; data().settings.scale.forEach(function (sc) { dist[sc.label] = 0; });
    rows.forEach(function (r) { if (r.g.rating) dist[r.g.rating] = (dist[r.g.rating] || 0) + 1; });
    var compAvg = components().map(function (k) {
      var v = rows.map(function (r) { return r.g.values[k.id]; }).filter(function (x) { return typeof x === "number"; });
      return { comp: k, n: v.length, avg: v.length ? Math.round(v.reduce(function (a, b) { return a + b; }, 0) / v.length * 100) / 100 : null };
    });
    var attDays = dates(c.id).length, attTotal = 0, attOk = 0;
    rows.forEach(function (r) { attTotal += r.att.days; attOk += r.att.p + r.att.l + r.att.e; });
    var support = rows.filter(function (r) {
      return (r.g.pct != null && r.g.pct < al.pct) || r.att.a >= al.absences || r.ev.neg >= al.negatives;
    }).map(function (r) {
      var why = [];
      if (r.g.pct != null && r.g.pct < al.pct) why.push("الدرجة " + r.g.pct + "٪");
      if (r.att.a >= al.absences) why.push("غياب " + r.att.a + " أيام");
      if (r.ev.neg >= al.negatives) why.push(r.ev.neg + " ملاحظات سلبية");
      return { s: r.s, why: why };
    });
    var top = rows.filter(function (r) { return r.ev.pos > 0; }).sort(function (a, b) { return b.ev.pos - a.ev.pos; }).slice(0, 5);
    return { cls: c, rows: rows, count: rows.length, graded: graded.length, avg: avg,
      max: graded.length ? Math.max.apply(null, graded) : null, min: graded.length ? Math.min.apply(null, graded) : null,
      dist: dist, compAvg: compAvg, attDays: attDays, attRate: attTotal ? Math.round(attOk / attTotal * 100) : null,
      support: support, top: top };
  }

  /* ---------- CSV (opens in Excel with Arabic intact thanks to the BOM) ---------- */
  function csv(rows) {
    return "﻿" + rows.map(function (r) { return r.map(function (v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(","); }).join("\r\n");
  }
  function gradesCSV(classId) {
    var c = cls(classId); if (!c) return ""; var comps = components();
    var rows = [["م", "اسم الطالبة"].concat(comps.map(function (k) { return k.name + " (" + k.max + ")"; }), ["المجموع (" + maxTotal() + ")", "النسبة ٪", "التقدير"])];
    c.students.forEach(function (s, i) { var g = gradeRow(c.id, s.id);
      rows.push([i + 1, s.name].concat(comps.map(function (k) { return g.values[k.id]; }), [g.filled ? g.total : "", g.pct, g.rating])); });
    return csv(rows);
  }
  function attendanceCSV(classId) {
    var c = cls(classId); if (!c) return ""; var ds = dates(c.id), d = data();
    var rows = [["م", "اسم الطالبة"].concat(ds, ["حاضرة", "غائبة", "متأخرة", "مستأذنة", "نسبة الحضور ٪"])];
    c.students.forEach(function (s, i) { var a = attendanceOf(c.id, s.id);
      rows.push([i + 1, s.name].concat(ds.map(function (day) { var st = (d.attendance[c.id][day] || {})[s.id]; return st ? ATT[st].ar : ""; }), [a.p, a.a, a.l, a.e, a.rate])); });
    return csv(rows);
  }

  /* ---------- setup draft (kept until the setup is finished) ---------- */
  function getDraft() { try { var o = JSON.parse(localStorage.getItem(DRAFT_KEY)); return o && typeof o === "object" ? o : null; } catch (e) { return null; } }
  function saveDraft(o) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(o)); return true; } catch (e) { return false; } }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }



  /* ---------- أدوات الحصة: المجموعات والقرعة ---------- */
  function strategies() { return data().settings.strategies; }
  function setStrategies(s) {
    var cur = strategies(), n = Math.max(2, Math.min(8, +s.groupCount || cur.groupCount));
    data().settings.strategies = Object.assign({}, cur, s, { groupCount: n });
    var names = data().settings.strategies.groupNames;
    for (var i = 0; i < 8; i++) if (!names[i] || !String(names[i]).trim()) names[i] = GROUP_PRESETS[i].name;
    data().classes.forEach(function (c) { c.students.forEach(function (st) { if (st.group != null && st.group >= n) st.group = null; }); });
    save();
  }
  function groupsConfig() {
    var s = strategies();
    return GROUP_PRESETS.slice(0, s.groupCount).map(function (g, i) { return { name: String(s.groupNames[i] || g.name).trim(), icon: g.icon, color: g.color }; });
  }
  /* توزيع متوازن عشوائي لطالبات الفصل على المجموعات */
  function assignGroups(classId) {
    var c = cls(classId); if (!c) return;
    var n = strategies().groupCount, list = c.students.slice();
    for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = list[i]; list[i] = list[j]; list[j] = t; }
    list.forEach(function (s, k) { s.group = k % n; });
    save();
  }
  function setStudentGroup(classId, sid, g) { var s = student(classId, sid); if (s) { s.group = g === "" || g == null ? null : +g; save(); } }
  function groupMembers(classId, g) { var c = cls(classId); return c ? c.students.filter(function (s) { return s.group === g; }) : []; }
  function groupPoints(classId, date) {
    var d = data(), c = cls(classId), n = strategies().groupCount; if (!c) return [];
    var arr = ((d.groupPoints[c.id] || {})[date || today()] || []).slice(0, n);
    while (arr.length < n) arr.push(0);
    return arr;
  }
  function addGroupPoints(classId, g, delta, date) {
    var d = data(), c = cls(classId); if (!c || g == null) return;
    date = date || today(); d.groupPoints[c.id] = d.groupPoints[c.id] || {};
    var arr = groupPoints(c.id, date); arr[g] = Math.max(0, (arr[g] || 0) + delta);
    d.groupPoints[c.id][date] = arr; save();
  }
  function resetGroupPoints(classId, date) { var d = data(), c = cls(classId); if (c && d.groupPoints[c.id]) { delete d.groupPoints[c.id][date || today()]; save(); } }
  /* قرعة الإجابة: عشوائية، ومع «عدم التكرار» لا يُعاد اسم حتى يأتي دور الجميع */
  function draw(classId, mode) {
    var d = data(), c = cls(classId); if (!c) return null;
    var s = strategies(), att = day(c.id, today());
    var pool = mode === "group"
      ? groupsConfig().map(function (g, i) { return i; })
      : c.students.filter(function (st) { return att[st.id] !== "a" && att[st.id] !== "e"; }).map(function (st) { return st.id; });
    if (!pool.length) return null;
    var L = d.lottery[c.id] = d.lottery[c.id] || { student: [], group: [] }, key = mode === "group" ? "group" : "student";
    var fresh = s.noRepeat ? pool.filter(function (x) { return L[key].indexOf(x) < 0; }) : pool;
    var round = false;
    if (!fresh.length) { L[key] = []; fresh = pool; round = true; }
    var pick = fresh[Math.floor(Math.random() * fresh.length)];
    if (s.noRepeat) L[key].push(pick);
    save();
    return { pick: pick, left: s.noRepeat ? fresh.length - 1 : null, total: pool.length, newRound: round };
  }
  function resetLottery(classId) { var d = data(), c = cls(classId); if (c) { delete d.lottery[c.id]; save(); } }
  /* نقطة فردية للطالبة (تُسجَّل كأيقونة «إجابة صحيحة» فتظهر في الكشف والتقارير وملف Excel) */
  function awardStudent(classId, sid) {
    var ic = icon("good") || data().settings.icons.find(function (i) { return i.kind !== "neg"; });
    return ic ? addEvent(classId, sid, ic.id) : null;
  }

  /* ---------- Excel (.xlsx) — needs js/xlsx-writer.js ---------- */
  function L(n) { return window.XLSX ? XLSX.col(n) : "A"; }
  function dmy(iso) { var p = String(iso).split("-"); return p.length === 3 ? (+p[2]) + "/" + (+p[1]) + "/" + p[0] : iso; }
  /* the 4 header rows every sheet starts with: title, school/teacher, class/date, blank */
  function sheetHeader(title, line3, ncols) {
    var p = data().profile || {};
    var line2 = ["المدرسة: " + (p.school || "—"), "المعلمة: " + (p.teacher || "—"), p.subject ? "المادة: " + p.subject : "", p.year ? "العام الدراسي: " + p.year : ""].filter(Boolean).join("     •     ");
    var last = L(Math.max(ncols, 4) - 1);
    return { rows: [[{ v: title, s: "title" }], [{ v: line2, s: "sub" }], [{ v: (line3 ? line3 + "     •     " : "") + "تاريخ التصدير: " + dmy(today()), s: "sub" }], []],
             merges: ["A1:" + last + "1", "A2:" + last + "2", "A3:" + last + "3"] };
  }
  function pctStyle(v) { var a = data().settings.alerts; return v == null ? "num" : v < a.pct ? "bad" : v >= 90 ? "good" : "num"; }

  function summarySheet(classes, withClassCol, name) {
    var comps = components(), max = maxTotal(), al = data().settings.alerts;
    var G = strategies().groups ? groupsConfig() : null;
    var head = ["م"].concat(withClassCol ? ["الفصل"] : [], ["اسم الطالبة"], G ? ["المجموعة"] : [], ["حاضرة", "غائبة", "متأخرة", "مستأذنة", "نسبة الحضور ٪", "تقييمات إيجابية", "تحتاج متابعة", "المجموع (من " + max + ")", "النسبة ٪", "التقدير", "المتابعة", "الملاحظات"]);
    var n = head.length, total = classes.reduce(function (a, c) { return a + c.students.length; }, 0);
    var h = sheetHeader(name || "ملخص الطالبات", (classes.length === 1 ? "الفصل: " + classes[0].name + "     •     " : "") + "عدد الطالبات: " + total, n);
    var rows = h.rows.concat([head.map(function (x) { return { v: x, s: "head" }; })]), k = 0, sums = { att: [], pct: [] };
    classes.forEach(function (c) {
      var rep = report(c.id), sup = {};
      rep.support.forEach(function (x) { sup[x.s.id] = x.why.join("، "); });
      rep.rows.forEach(function (r) {
        k++; if (r.att.rate != null) sums.att.push(r.att.rate); if (r.g.pct != null) sums.pct.push(r.g.pct);
        rows.push([{ v: k, s: "cell" }].concat(withClassCol ? [{ v: c.name, s: "cell" }] : [], [
          { v: r.s.name, s: "name" }].concat(G ? [{ v: r.s.group != null && G[r.s.group] ? G[r.s.group].name : "—", s: "cell" }] : [], [{ v: r.att.p, s: "cell" }, { v: r.att.a, s: r.att.a >= al.absences ? "bad" : "cell" },
          { v: r.att.l, s: "cell" }, { v: r.att.e, s: "cell" }, { v: r.att.rate, s: r.att.rate == null ? "num" : r.att.rate < 75 ? "bad" : "num" },
          { v: r.ev.pos, s: "cell" }, { v: r.ev.neg, s: r.ev.neg >= al.negatives ? "warn" : "cell" },
          { v: r.g.filled ? r.g.total : null, s: "num" }, { v: r.g.pct, s: pctStyle(r.g.pct) }, { v: r.g.rating || "", s: "cell" },
          { v: sup[r.s.id] || (r.g.filled && !r.g.complete ? "لم تُرصد كل الدرجات" : "—"), s: sup[r.s.id] ? "warn" : "cell" },
          { v: r.s.notes.map(function (x) { return dmy(x.date) + ": " + x.text; }).join("؛  "), s: "note" } ])));
      });
    });
    var avg = function (a) { return a.length ? Math.round(a.reduce(function (x, y) { return x + y; }, 0) / a.length * 10) / 10 : null; };
    var foot = [{ v: "", s: "total" }].concat(withClassCol ? [{ v: "", s: "total" }] : [], [{ v: "المتوسط", s: "total" }], G ? [{ v: "", s: "total" }] : [], [{ v: "", s: "total" }, { v: "", s: "total" }, { v: "", s: "total" }, { v: "", s: "total" },
      { v: avg(sums.att), s: "total" }, { v: "", s: "total" }, { v: "", s: "total" }, { v: "", s: "total" }, { v: avg(sums.pct), s: "total" }, { v: "", s: "total" }, { v: "", s: "total" }, { v: "", s: "total" }]);
    rows.push(foot);
    return { name: name || "ملخص الطالبات", rows: rows, merges: h.merges, freezeRows: 5, freezeCols: withClassCol ? 3 : 2,
      cols: [5].concat(withClassCol ? [16] : [], [26], G ? [13] : [], [8, 8, 8, 8, 11, 11, 11, 12, 9, 12, 26, 50]) };
  }
  function gradesSheet(c, name) {
    var comps = components(), max = maxTotal();
    var head = ["م", "اسم الطالبة"].concat(comps.map(function (k) { return k.name + " (من " + k.max + ")"; }), ["المجموع (من " + max + ")", "النسبة ٪", "التقدير", "اكتمال الرصد"]);
    var h = sheetHeader("أعمال السنة — " + c.name, "الفصل: " + c.name + "     •     عدد الطالبات: " + c.students.length, head.length);
    var rows = h.rows.concat([head.map(function (x) { return { v: x, s: "head" }; })]);
    c.students.forEach(function (s, i) {
      var g = gradeRow(c.id, s.id);
      rows.push([{ v: i + 1, s: "cell" }, { v: s.name, s: "name" }].concat(comps.map(function (k) { return { v: typeof g.values[k.id] === "number" ? g.values[k.id] : null, s: "num" }; }),
        [{ v: g.filled ? g.total : null, s: "total" }, { v: g.pct, s: pctStyle(g.pct) }, { v: g.rating || "", s: "cell" }, { v: g.complete ? "مكتمل" : g.filled ? "ناقص" : "لم يُرصد", s: g.complete ? "cell" : "warn" }]));
    });
    var rep = report(c.id);
    rows.push([{ v: "", s: "total" }, { v: "متوسط الفصل", s: "total" }].concat(rep.compAvg.map(function (x) { return { v: x.avg, s: "total" }; }),
      [{ v: rep.avg == null ? null : Math.round(rep.avg * max) / 100, s: "total" }, { v: rep.avg, s: "total" }, { v: "", s: "total" }, { v: "", s: "total" }]));
    return { name: name || "أعمال السنة", rows: rows, merges: h.merges, freezeRows: 5, freezeCols: 2,
      cols: [5, 26].concat(comps.map(function () { return 13; }), [13, 10, 12, 12]) };
  }
  function attendanceSheet(c, name) {
    var ds = dates(c.id), d = data(), SH = { p: "ح", a: "غ", l: "ت", e: "س" }, ST = { p: "cell", a: "bad", l: "warn", e: "cell" };
    var head = ["م", "اسم الطالبة"].concat(ds.map(dmy), ["حاضرة", "غائبة", "متأخرة", "مستأذنة", "نسبة الحضور ٪"]);
    var h = sheetHeader("سجل الحضور والغياب — " + c.name, "الفصل: " + c.name + "     •     أيام التحضير: " + ds.length + "     •     ح = حاضرة  غ = غائبة  ت = متأخرة  س = مستأذنة", head.length);
    var rows = h.rows.concat([head.map(function (x) { return { v: x, s: "head" }; })]);
    c.students.forEach(function (s, i) {
      var a = attendanceOf(c.id, s.id);
      rows.push([{ v: i + 1, s: "cell" }, { v: s.name, s: "name" }].concat(ds.map(function (day) { var st = (d.attendance[c.id][day] || {})[s.id]; return { v: st ? SH[st] : "", s: st ? ST[st] : "cell" }; }),
        [{ v: a.p, s: "total" }, { v: a.a, s: a.a >= d.settings.alerts.absences ? "bad" : "total" }, { v: a.l, s: "total" }, { v: a.e, s: "total" }, { v: a.rate, s: a.rate == null ? "num" : a.rate < 75 ? "bad" : "num" }]));
    });
    return { name: name || "الحضور", rows: rows, merges: h.merges, freezeRows: 5, freezeCols: 2,
      cols: [5, 26].concat(ds.map(function () { return 9; }), [9, 9, 9, 9, 12]) };
  }
  function iconsSheet(c) {
    var icons = data().settings.icons;
    var head = ["م", "اسم الطالبة"].concat(icons.map(function (i) { return i.icon + " " + i.label; }), ["المجموع الإيجابي", "يحتاج متابعة"]);
    var h = sheetHeader("التقييم السريع — " + c.name, "الفصل: " + c.name, head.length);
    var rows = h.rows.concat([head.map(function (x) { return { v: x, s: "head" }; })]);
    c.students.forEach(function (s, i) {
      var cn = eventCounts(c.id, s.id);
      rows.push([{ v: i + 1, s: "cell" }, { v: s.name, s: "name" }].concat(icons.map(function (ic) { return { v: cn.by[ic.id] || 0, s: (cn.by[ic.id] && ic.kind === "neg") ? "warn" : "cell" }; }),
        [{ v: cn.pos, s: "good" }, { v: cn.neg, s: cn.neg ? "warn" : "cell" }]));
    });
    return { name: "التقييم السريع", rows: rows, merges: h.merges, freezeRows: 5, freezeCols: 2, cols: [5, 26].concat(icons.map(function () { return 14; }), [13, 13]) };
  }
  function notesSheet(c) {
    var head = ["م", "اسم الطالبة", "التاريخ", "الملاحظة"];
    var h = sheetHeader("ملاحظات الطالبات — " + c.name, "الفصل: " + c.name, head.length);
    var rows = h.rows.concat([head.map(function (x) { return { v: x, s: "head" }; })]), k = 0;
    c.students.forEach(function (s) { s.notes.forEach(function (n) { k++; rows.push([{ v: k, s: "cell" }, { v: s.name, s: "name" }, { v: dmy(n.date), s: "cell" }, { v: n.text, s: "note" }]); }); });
    if (!k) rows.push([{ v: "", s: "cell" }, { v: "لا توجد ملاحظات مسجّلة", s: "note" }, { v: "", s: "cell" }, { v: "", s: "note" }]);
    return { name: "الملاحظات", rows: rows, merges: h.merges, freezeRows: 5, cols: [5, 26, 12, 70] };
  }
  /* one class: 5 organised sheets • all classes: one combined summary + grades and attendance per class */
  function excelSheets(classId) {
    if (classId) { var c = cls(classId); if (!c) return [];
      return [summarySheet([c], false), gradesSheet(c), attendanceSheet(c), iconsSheet(c), notesSheet(c)]; }
    var all = data().classes; if (!all.length) return [];
    var out = [summarySheet(all, true, "كل الطالبات")];
    all.forEach(function (c) { out.push(gradesSheet(c, "درجات " + c.name)); out.push(attendanceSheet(c, "حضور " + c.name)); });
    return out;
  }

  /* ---------- backup ---------- */
  function exportData() { return clone(data()); }
  function importData(obj) {
    if (!obj || typeof obj !== "object" || !Array.isArray(obj.classes)) throw new Error("لا يحتوي الملف على بيانات صفية صالحة");
    D = normalize(obj); return save();
  }
  function resetAll() { D = empty(); return save(); }

  load();
  window.Classroom = {
    KEY: KEY, ATT: ATT, LETTERS: LETTERS, today: today, nextClassName: nextClassName,
    getDraft: getDraft, saveDraft: saveDraft, clearDraft: clearDraft, data: data, reload: load, storageOK: function () { return persistent; },
    hasProfile: hasProfile, needsSetup: needsSetup, setProfile: setProfile, skipSetup: skipSetup,
    cls: cls, parseNames: parseNames, addClass: addClass, renameClass: renameClass, deleteClass: deleteClass, setActive: setActive,
    addStudents: addStudents, renameStudent: renameStudent, deleteStudent: deleteStudent, sortStudents: sortStudents, student: student,
    day: day, mark: mark, markAll: markAll, clearDay: clearDay, dates: dates, attendanceOf: attendanceOf,
    icon: icon, addEvent: addEvent, removeEvent: removeEvent, eventsOf: eventsOf, eventCounts: eventCounts,
    addNote: addNote, deleteNote: deleteNote,
    components: components, maxTotal: maxTotal, rating: rating, setGrade: setGrade, gradeRow: gradeRow, fillEmpty: fillEmpty,
    setComponents: setComponents, setIcons: setIcons, setScale: setScale, setAlerts: setAlerts,
    report: report, gradesCSV: gradesCSV, attendanceCSV: attendanceCSV, excelSheets: excelSheets, sheetHeader: sheetHeader,
    strategies: strategies, setStrategies: setStrategies, groupsConfig: groupsConfig, assignGroups: assignGroups,
    setStudentGroup: setStudentGroup, groupMembers: groupMembers, groupPoints: groupPoints, addGroupPoints: addGroupPoints,
    resetGroupPoints: resetGroupPoints, draw: draw, resetLottery: resetLottery, awardStudent: awardStudent,
    exportData: exportData, importData: importData, resetAll: resetAll
  };
})();
