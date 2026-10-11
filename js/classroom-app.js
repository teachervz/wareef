/* ==========================================================================
   classroom-app.js — the screens of classroom.html
   Data and rules live in classroom-manager.js (window.Classroom = C).
   Each tab has a render function; every change re-renders only that tab.
   ========================================================================== */
(function () {
  "use strict";
  var C = window.Classroom;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var AR = function (n) { return n == null ? "—" : String(n).replace(/\d/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[d]; }); };
  var TABS = ["roster", "attendance", "grades", "reports", "settings"];

  var ui = { tab: "roster", quick: null, search: "", attDate: C.today(), reportSid: null, drawerSid: null };

  /* ---------- helpers ---------- */
  function toast(msg, opt) {
    opt = opt || {};
    var t = $("#toast");
    t.innerHTML = esc(msg) + (opt.undo ? ' <button class="btn sm" style="margin-inline-start:10px;padding:2px 12px" id="undoBtn">↶ تراجع</button>' : "");
    t.className = "toast show" + (opt.err ? " err" : "");
    if (opt.undo) $("#undoBtn").onclick = function () { opt.undo(); t.className = "toast"; };
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.className = "toast"; }, opt.undo ? 5000 : 3200);
  }
  function saved(ok) { if (ok === false || !C.storageOK()) toast("⚠️ تعذّر الحفظ الدائم في هذا المتصفح — صدّري نسخة احتياطية", { err: true }); }
  function download(text, name, type) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: type + ";charset=utf-8" })); a.download = name; a.style.display = "none";
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function fmtDay(iso) {
    var p = iso.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]);
    try { return d.toLocaleDateString("ar-SA-u-ca-gregory-nu-arab", { weekday: "long", day: "numeric", month: "long" }); } catch (e) { return iso; }
  }
  function shiftDay(iso, n) { var p = iso.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2] + n);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function noClass() {
    return '<div class="card empty">لا يوجد فصل بعد.<br><br><button class="btn primary" data-go="settings">＋ أضيفي فصلًا من الإعدادات</button></div>';
  }
  function noStudents() {
    return '<div class="card empty">لا توجد طالبات في هذا الفصل بعد.<br><br><button class="btn primary" data-go="settings">＋ أضيفي أسماء الطالبات</button></div>';
  }
  function exportExcel(scope, tab) {
    if (!window.XLSX) return toast("⚠️ تعذّر تحميل أداة Excel", { err: true });
    var c = C.cls(), all = scope === "all";
    if (!all && !c) return toast("أضيفي فصلًا أولًا", { err: true });
    var sheets = C.excelSheets(all ? null : c.id);
    if (!sheets.length) return toast("لا توجد بيانات للتصدير", { err: true });
    var p = C.data().profile || {};
    var name = (all ? "سجل كل الفصول" : "سجل " + c.name) + (p.school ? " - " + p.school : "") + " - " + C.today() + ".xlsx";
    try { XLSX.download(sheets, fileSafe(name), { activeTab: all ? 0 : tab }); toast("📊 تم إنشاء ملف Excel — تحققي من مجلد التنزيلات"); }
    catch (e) { toast("⚠️ تعذّر إنشاء الملف: " + e.message, { err: true }); }
  }
  function fileSafe(s) { return String(s).replace(/[\\/:*?"<>|]+/g, "-").trim() || "فصل"; }

  /* ======================= 👋 الإعداد الأول (خطوتان) ======================= */
  var sd = null;   // setup draft — saved to localStorage on every keystroke
  function setupDefaults() {
    return { step: 1, teacher: "", school: "", subject: "التقنية الرقمية 3", year: "1448 هـ", gradeName: "ثالث ثانوي", count: 1, active: 0, classes: [] };
  }
  function autoName(i) { return (sd.gradeName.trim() || "فصل") + " " + (C.LETTERS[i] || String(i + 1)); }
  function syncClasses() {
    sd.count = Math.max(1, Math.min(C.LETTERS.length, +sd.count || 1));
    for (var i = 0; i < sd.count; i++) {
      var k = sd.classes[i] = sd.classes[i] || { name: "", names: "", auto: true };
      if (k.auto) k.name = autoName(i);
    }
    sd.classes.length = sd.count;   // classes beyond the chosen count are dropped
    if (sd.active >= sd.count) sd.active = 0;
  }
  function keepDraft() { C.saveDraft(sd); }
  function renderSetup() {
    var f = $("#setupForm");
    ["teacher", "school", "subject", "year", "gradeName"].forEach(function (k) { f.elements[k].value = sd[k] || ""; });
    $("#step1").hidden = sd.step !== 1; $("#step2").hidden = sd.step !== 2;
    $("#countBtns").innerHTML = C.LETTERS.map(function (_, i) {
      return '<button type="button" data-count="' + (i + 1) + '" aria-pressed="' + (sd.count === i + 1) + '">' + AR(i + 1) + "</button>";
    }).join("");
    updPreview();
    $("#clsTabs").innerHTML = sd.classes.map(function (k, i) {
      return '<button type="button" role="tab" data-ctab="' + i + '" aria-selected="' + (sd.active === i) + '">' + esc(k.name) + ' <small id="ctc' + i + '">(' + AR(C.parseNames(k.names).length) + ")</small></button>";
    }).join("");
    $("#clsPanels").innerHTML = sd.classes.map(function (k, i) {
      return '<div class="cls-panel" data-cpanel="' + i + '"' + (sd.active === i ? "" : " hidden") + ">" +
        '<label>اسم الفصل<input data-cname-s="' + i + '" value="' + esc(k.name) + '"></label>' +
        '<label>أسماء طالبات ' + esc(k.name) + ' <span class="count-pill" id="cpc' + i + '">' + AR(C.parseNames(k.names).length) + ' طالبة</span>' +
        '<textarea data-cnames="' + i + '" placeholder="نورة محمد&#10;سارة عبدالله&#10;ريم خالد&#10;…">' + esc(k.names) + "</textarea></label>" +
        (i < sd.count - 1 ? '<button class="btn sm" type="button" data-ctab="' + (i + 1) + '" style="align-self:flex-start">الفصل التالي: ' + esc(sd.classes[i + 1].name) + " ←</button>" : "") +
      "</div>";
    }).join("");
  }
  function updPreview() {
    $("#classPreview").textContent = "سيتم إنشاء: " + sd.classes.map(function (k) { return k.name; }).join("، ");
  }
  function startSetup() {
    sd = Object.assign(setupDefaults(), C.getDraft() || {});
    syncClasses(); showSetup(true); renderSetup();
    setTimeout(function () { var f = $("#setupForm"); (sd.step === 1 ? f.elements.teacher : $('[data-cnames="' + sd.active + '"]')).focus(); }, 50);
  }
  function finishSetup() {
    if (!sd.teacher.trim()) { sd.step = 1; renderSetup(); $("#setupForm").elements.teacher.focus(); return toast("اكتبي اسم المعلمة أولًا", { err: true }); }
    var ok = C.setProfile({ teacher: sd.teacher, school: sd.school, subject: sd.subject, year: sd.year, gradeName: sd.gradeName });
    var first = null, n = 0;
    sd.classes.forEach(function (k, i) { var c = C.addClass(k.name || autoName(i), k.names); if (!first) first = c; n += c.students.length; });
    if (first) C.setActive(first.id);
    C.clearDraft(); saved(ok); showSetup(false); go(n ? "roster" : "settings");
    toast("🎉 أهلًا " + C.data().profile.teacher + " — تم إنشاء " + AR(sd.classes.length) + " فصل و" + AR(n) + " طالبة");
  }
  $("#setupForm").addEventListener("click", function (e) {
    var b;
    if ((b = e.target.closest("[data-count]"))) { sd.count = +b.dataset.count; syncClasses(); keepDraft(); return renderSetup(); }
    if ((b = e.target.closest("[data-ctab]"))) { sd.active = +b.dataset.ctab; keepDraft(); renderSetup(); var ta = $('[data-cnames="' + sd.active + '"]'); if (ta) ta.focus(); return; }
    if (e.target.closest("#toStep2")) {
      if (!sd.teacher.trim()) { $("#setupForm").elements.teacher.focus(); return toast("اكتبي اسم المعلمة أولًا", { err: true }); }
      sd.step = 2; keepDraft(); renderSetup(); var t2 = $('[data-cnames="' + sd.active + '"]'); if (t2) t2.focus(); return;
    }
    if (e.target.closest("#toStep1")) { sd.step = 1; keepDraft(); return renderSetup(); }
    if (e.target.closest("#setupXlsx")) { $("#xlsxFile").dataset.mode = "setup"; return $("#xlsxFile").click(); }
  });
  $("#setupForm").addEventListener("input", function (e) {
    var t = e.target, i;
    if (["teacher", "school", "subject", "year", "gradeName"].indexOf(t.name) >= 0) {
      sd[t.name] = t.value;
      if (t.name === "gradeName") { syncClasses(); updPreview(); }
    } else if (t.dataset.cnameS != null) {
      i = +t.dataset.cnameS; sd.classes[i].name = t.value; sd.classes[i].auto = false;
      var tab = $('[data-ctab="' + i + '"][role="tab"]'); if (tab) tab.firstChild.textContent = t.value + " ";
    } else if (t.dataset.cnames != null) {
      i = +t.dataset.cnames; sd.classes[i].names = t.value;
      var n = AR(C.parseNames(t.value).length); $("#cpc" + i).textContent = n + " طالبة"; $("#ctc" + i).textContent = "(" + n + ")";
    }
    keepDraft();
  });

  /* ---------- views ---------- */
  function showSetup(on) { $("#setupView").hidden = !on; $("#appView").hidden = on; }
  function go(tab) {
    if (TABS.indexOf(tab) < 0) tab = "roster";
    ui.tab = tab;
    TABS.forEach(function (t) { $("#v-" + t).hidden = t !== tab; });
    $$(".tabs button").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.tab === tab); });
    try { history.replaceState(null, "", "#" + tab); } catch (e) {}
    render();
  }
  function renderHeader() {
    var d = C.data(), p = d.profile || {};
    $("#hdTeacher").textContent = p.teacher ? "👩‍🏫 " + p.teacher : "👩‍🏫 الإدارة الصفية";
    $("#hdSchool").textContent = [p.school, p.subject, p.year].filter(Boolean).join(" • ") || "أكملي بياناتكِ من الإعدادات";
    var sel = $("#classSel");
    sel.innerHTML = d.classes.length ? d.classes.map(function (c) { return '<option value="' + c.id + '"' + (c.id === d.activeClassId ? " selected" : "") + ">" + esc(c.name) + " (" + AR(c.students.length) + ")</option>"; }).join("") : "<option>لا يوجد فصل</option>";
    sel.disabled = !d.classes.length;
  }
  function render() {
    renderHeader();
    ({ roster: rRoster, attendance: rAttendance, grades: rGrades, reports: rReports, settings: rSettings })[ui.tab]();
  }

  /* ======================= 📋 الكشف ======================= */
  function rRoster() {
    var v = $("#v-roster"), c = C.cls();
    if (!c) { v.innerHTML = noClass(); return; }
    var icons = C.data().settings.icons, today = C.today(), dayAtt = C.day(c.id, today), G = C.strategies().groups ? C.groupsConfig() : null;
    var list = c.students;
    v.className = "view" + (ui.quick ? " quick-on" : "");
    v.innerHTML =
      '<div class="toolbar">' +
        '<input type="search" id="rSearch" placeholder="🔍 بحث عن طالبة" value="' + esc(ui.search) + '" style="width:190px">' +
        '<button class="btn sm" id="rRandom">🎲 اختيار عشوائي</button>' +
        '<span class="muted">' + esc(fmtDay(today)) + "</span>" +
      "</div>" +
      '<div class="card sec"><div class="row" style="margin-bottom:6px"><h3 class="grow" style="margin:0">⚡ التقييم السريع</h3><span class="muted">اختاري أيقونة ثم اضغطي على الطالبات</span></div>' +
        '<div class="icons">' + icons.map(function (i) {
          return '<button class="ic-btn ' + (i.kind === "neg" ? "neg" : "") + '" data-ic="' + i.id + '" aria-pressed="' + (ui.quick === i.id) + '"><span class="e">' + esc(i.icon) + "</span>" + esc(i.label) + "</button>";
        }).join("") + "</div>" +
        '<p class="quick-hint" style="margin-top:8px">✓ الوضع السريع مفعّل: كل ضغطة على طالبة تضيف «' + esc(ui.quick && C.icon(ui.quick) ? C.icon(ui.quick).label : "") + '». اضغطي الأيقونة مرة أخرى لإيقافه.</p>' +
      "</div>" +
      (c.students.length ? '<div class="grid-st">' + list.map(function (s) {
        var n = c.students.indexOf(s) + 1, cnt = C.eventCounts(c.id, s.id), st = dayAtt[s.id];
        var chips = icons.filter(function (i) { return cnt.by[i.id]; }).map(function (i) { return '<span class="' + (i.kind === "neg" ? "n" : "") + '">' + esc(i.icon) + AR(cnt.by[i.id]) + "</span>"; }).join("");
        return '<button class="st' + (st === "a" ? " absent" : "") + '" data-sid="' + s.id + '"><span class="no">' + AR(n) + "</span>" +
          (st ? '<span class="att" title="' + C.ATT[st].ar + '">' + C.ATT[st].icon + "</span>" : "") +
          (G && s.group != null && G[s.group] ? '<span class="gb" style="--c:' + G[s.group].color + '" title="مجموعة ' + esc(G[s.group].name) + '">' + G[s.group].icon + " " + esc(G[s.group].name) + "</span>" : "") +
          '<span class="nm">' + esc(s.name) + '</span><span class="cnt">' + (chips || '<small class="muted">—</small>') + "</span></button>";
      }).join("") + '<div class="empty" id="noHits" hidden>لا توجد نتائج</div></div>' : noStudents());
    filterCards();
  }
  function filterCards() {
    var shown = 0;
    $$("#v-roster .st").forEach(function (b) { var on = !ui.search || b.querySelector(".nm").textContent.indexOf(ui.search) >= 0; b.hidden = !on; if (on) shown++; });
    var nh = $("#noHits"); if (nh) nh.hidden = shown > 0;
  }
  function quickAdd(sid, card) {
    var c = C.cls(), ic = C.icon(ui.quick); if (!c || !ic) return;
    var ev = C.addEvent(c.id, sid, ic.id); saved();
    rRoster();
    var nc = $('.st[data-sid="' + sid + '"]'); if (nc) { nc.classList.add("flash"); var p = document.createElement("span"); p.className = "plus"; p.textContent = ic.icon; nc.appendChild(p); }
    toast(ic.icon + " " + ic.label + " — " + C.student(c.id, sid).name, { undo: function () { C.removeEvent(c.id, ev.id); rRoster(); } });
  }
  function randomPick() {
    var c = C.cls(); if (!c || !c.students.length) return;
    var att = C.day(c.id, C.today());
    var pool = c.students.filter(function (s) { return att[s.id] !== "a" && att[s.id] !== "e"; });
    if (!pool.length) return toast("لا توجد طالبات حاضرات");
    var cards = pool.map(function (s) { return $('.st[data-sid="' + s.id + '"]'); }).filter(function (x) { return x && !x.hidden; }), k = 0, steps = 14 + Math.floor(Math.random() * pool.length);
    if (!cards.length) return;
    $$(".st.picked").forEach(function (x) { x.classList.remove("picked"); });
    (function spin() {
      cards.forEach(function (x) { x.classList.remove("picked"); });
      var cur = cards[k % cards.length]; cur.classList.add("picked");
      if (k++ < steps) setTimeout(spin, 60 + k * 9);
      else { cur.scrollIntoView({ block: "nearest", behavior: "smooth" }); toast("🎲 " + cur.querySelector(".nm").textContent); }
    })();
  }

  /* ---------- student drawer ---------- */
  function openDrawer(sid) { ui.drawerSid = sid; $("#drawer").classList.add("open"); $("#drawer").setAttribute("aria-hidden", "false"); rDrawer(); }
  function closeDrawer() { ui.drawerSid = null; $("#drawer").classList.remove("open"); $("#drawer").setAttribute("aria-hidden", "true"); render(); }
  function rDrawer() {
    var c = C.cls(), s = c && C.student(c.id, ui.drawerSid); if (!s) return closeDrawer();
    var today = C.today(), st = C.day(c.id, today)[s.id], att = C.attendanceOf(c.id, s.id), g = C.gradeRow(c.id, s.id), cnt = C.eventCounts(c.id, s.id);
    var evs = C.eventsOf(c.id, s.id).slice().reverse().slice(0, 30);
    $("#drPanel").innerHTML =
      '<div class="hd"><h2 id="drName">' + esc(s.name) + '</h2><button class="x" data-close aria-label="إغلاق">✕</button></div>' +
      '<div class="mini"><div><b>' + (att.rate == null ? "—" : AR(att.rate) + "٪") + '</b>الحضور</div><div><b>' + AR(att.a) + '</b>أيام الغياب</div><div><b>' + (g.pct == null ? "—" : AR(g.pct) + "٪") + "</b>" + esc(g.rating || "الدرجات") + "</div></div>" +
      '<div class="card sec"><h3>✅ حضور اليوم</h3><div class="att-btns">' + ["p", "a", "l", "e"].map(function (k) {
        return '<button class="' + k + '" data-datt="' + k + '" aria-pressed="' + (st === k) + '">' + C.ATT[k].icon + ' <span class="t">' + C.ATT[k].ar + "</span></button>";
      }).join("") + "</div></div>" +
      '<div class="card sec"><h3>⚡ تقييم</h3><div class="icons">' + C.data().settings.icons.map(function (i) {
        return '<button class="ic-btn ' + (i.kind === "neg" ? "neg" : "") + '" data-dic="' + i.id + '"><span class="e">' + esc(i.icon) + "</span>" + esc(i.label) + (cnt.by[i.id] ? " <b>" + AR(cnt.by[i.id]) + "</b>" : "") + "</button>";
      }).join("") + '</div><div class="ev-list" style="margin-top:8px">' + (evs.length ? evs.map(function (e) {
        var ic = C.icon(e.icon); return "<div>" + (ic ? esc(ic.icon) : "•") + "<span>" + esc(ic ? ic.label : e.icon) + "</span><small>" + esc(fmtDay(e.date)) + '</small><button class="del" data-dev="' + e.id + '" title="حذف">✕</button></div>';
      }).join("") : '<small class="muted">لا يوجد تقييم بعد</small>') + "</div></div>" +
      '<div class="card sec"><h3>📝 ملاحظات</h3><div class="row"><input class="grow" id="noteIn" placeholder="اكتبي ملاحظة…" maxlength="300"><button class="btn sm primary" id="noteAdd">إضافة</button></div>' +
        '<div class="note-list" style="margin-top:8px">' + (s.notes.length ? s.notes.slice().reverse().map(function (n) {
          return "<div><span>" + esc(n.text) + "</span><small>" + esc(fmtDay(n.date)) + '</small><button class="del" data-dnote="' + n.id + '" title="حذف">✕</button></div>';
        }).join("") : '<small class="muted">لا توجد ملاحظات</small>') + "</div></div>" +
      '<button class="btn" data-report="' + s.id + '">📄 تقرير الطالبة</button>';
  }

  /* ======================= ✅ الحضور ======================= */
  function rAttendance() {
    var v = $("#v-attendance"), c = C.cls();
    if (!c) { v.innerHTML = noClass(); return; }
    if (!c.students.length) { v.innerHTML = noStudents(); return; }
    var day = C.day(c.id, ui.attDate), counts = { p: 0, a: 0, l: 0, e: 0, none: 0 };
    c.students.forEach(function (s) { counts[day[s.id] || "none"]++; });
    var recDays = C.dates(c.id).slice(-14).reverse();
    v.innerHTML =
      '<div class="card sec"><div class="row">' +
        '<button class="btn sm" data-dshift="-1" title="اليوم السابق">→</button><input type="date" id="attDate" value="' + ui.attDate + '"><button class="btn sm" data-dshift="1" title="اليوم التالي">←</button>' +
        '<b class="grow">' + esc(fmtDay(ui.attDate)) + (ui.attDate === C.today() ? " (اليوم)" : "") + "</b>" +
        '<button class="btn primary" id="allPresent">✓ الكل حاضرات</button>' +
        '<button class="btn sm quiet" id="clearDay">مسح هذا اليوم</button>' +
      "</div>" +
      '<div class="att-sum" style="margin-top:10px">' + ["p", "a", "l", "e"].map(function (k) { return "<span>" + C.ATT[k].icon + " " + C.ATT[k].ar + ": " + AR(counts[k]) + "</span>"; }).join("") +
        "<span>⬜ بلا تحضير: " + AR(counts.none) + "</span></div>" +
      (recDays.length ? '<div class="days" style="margin-top:10px"><span class="muted">أيام محضّرة:</span>' + recDays.map(function (d) { return '<button data-day="' + d + '" class="' + (d === ui.attDate ? "on" : "") + '">' + esc(fmtDay(d)) + "</button>"; }).join("") + "</div>" : "") +
      "</div>" +
      '<div class="att-list">' + c.students.map(function (s, i) {
        var st = day[s.id], a = C.attendanceOf(c.id, s.id);
        return '<div class="att-row ' + (st ? "st-" + st : "") + '"><b class="muted">' + AR(i + 1) + '</b><div class="nm">' + esc(s.name) + "<small>غياب: " + AR(a.a) + " • تأخر: " + AR(a.l) + (a.rate != null ? " • الحضور " + AR(a.rate) + "٪" : "") + "</small></div>" +
          '<div class="att-btns">' + ["p", "a", "l", "e"].map(function (k) {
            return '<button class="' + k + '" data-att="' + k + '" data-sid="' + s.id + '" aria-pressed="' + (st === k) + '" title="' + C.ATT[k].ar + '">' + C.ATT[k].icon + ' <span class="t">' + C.ATT[k].short + "</span></button>";
          }).join("") + "</div></div>";
      }).join("") + "</div>" +
      '<div class="row no-print" style="margin-top:14px"><button class="btn sm primary" data-xlsx="class" data-tab="2">📊 تصدير سجل الحضور (Excel)</button></div>';
  }

  /* ======================= 📊 أعمال السنة ======================= */
  function rGrades() {
    var v = $("#v-grades"), c = C.cls();
    if (!c) { v.innerHTML = noClass(); return; }
    if (!c.students.length) { v.innerHTML = noStudents(); return; }
    var comps = C.components(), max = C.maxTotal(), rep = C.report(c.id);
    v.innerHTML =
      '<div class="row no-print" style="margin-bottom:10px"><h2 class="grow">📊 أعمال السنة — ' + esc(c.name) + "</h2>" +
        '<button class="btn sm primary" data-xlsx="class" data-tab="1">📊 تصدير (Excel)</button><button class="btn sm" id="grPrint">🖨️ طباعة</button></div>' +
      '<p class="muted no-print" style="margin-bottom:10px">المجموع من ' + AR(max) + " • يُحسب المجموع والنسبة والتقدير تلقائيًا • ⏳ = لم تُرصد كل البنود بعد، فالنسبة محسوبة من البنود المرصودة فقط • عدّلي البنود من «⚙️ الإعدادات» حسب توزيع الدرجات المعتمد.</p>" +
      '<div class="tbl-wrap"><table class="gr"><thead><tr><th>م</th><th class="nm">اسم الطالبة</th>' +
        comps.map(function (k) { return "<th>" + esc(k.name) + "<small>من " + AR(k.max) + '</small><button class="fill no-print" data-fill="' + k.id + '" title="تعبئة الخانات الفارغة بالدرجة الكاملة">ملء الفارغ</button></th>'; }).join("") +
        "<th>المجموع<small>من " + AR(max) + "</small></th><th>النسبة</th><th>التقدير</th></tr></thead><tbody>" +
        c.students.map(function (s, i) {
          var g = C.gradeRow(c.id, s.id);
          return '<tr data-sid="' + s.id + '"><td>' + AR(i + 1) + '</td><td class="nm">' + esc(s.name) + "</td>" +
            comps.map(function (k) { var val = g.values[k.id]; return '<td><input inputmode="decimal" data-comp="' + k.id + '" data-max="' + k.max + '" value="' + (typeof val === "number" ? val : "") + '" aria-label="' + esc(s.name + " — " + k.name) + '"></td>'; }).join("") +
            '<td class="tot">' + totCell(g) + "</td><td>" + (g.pct == null ? "—" : AR(g.pct) + "٪") + "</td><td>" + rtBadge(g) + "</td></tr>";
        }).join("") + "</tbody>" +
        '<tfoot><tr><td></td><td class="nm">متوسط الفصل</td>' + rep.compAvg.map(function (x) { return "<td>" + (x.avg == null ? "—" : AR(x.avg)) + "</td>"; }).join("") +
        "<td>" + (rep.avg == null ? "—" : AR(Math.round(rep.avg * max) / 100)) + "</td><td>" + (rep.avg == null ? "—" : AR(rep.avg) + "٪") + "</td><td></td></tr></tfoot></table></div>";
  }
  function totCell(g) {
    if (!g.filled) return "—";
    return AR(g.total) + (g.complete ? "" : '<small class="muted" style="display:block;font-size:11px" title="لم تُرصد كل البنود بعد">⏳ من ' + AR(g.filledMax) + "</small>");
  }
  function rtBadge(g) { if (!g.rating) return "—"; var low = g.pct != null && g.pct < C.data().settings.alerts.pct; return '<span class="rt' + (low ? " low" : "") + '">' + esc(g.rating) + "</span>"; }
  function updateGradeRow(tr) {
    var c = C.cls(), g = C.gradeRow(c.id, tr.dataset.sid), tds = tr.children, n = C.components().length;
    tds[2 + n].innerHTML = totCell(g);
    tds[3 + n].textContent = g.pct == null ? "—" : AR(g.pct) + "٪";
    tds[4 + n].innerHTML = rtBadge(g);
  }

  /* ======================= 📈 التقارير ======================= */
  function rReports() {
    var v = $("#v-reports"), c = C.cls();
    if (!c) { v.innerHTML = noClass(); return; }
    if (!c.students.length) { v.innerHTML = noStudents(); return; }
    var r = C.report(c.id), maxDist = Math.max.apply(null, Object.keys(r.dist).map(function (k) { return r.dist[k]; }).concat([1]));
    if (ui.reportSid && !C.student(c.id, ui.reportSid)) ui.reportSid = null;
    v.innerHTML =
      '<div class="row no-print" style="margin-bottom:10px"><h2 class="grow">📈 تقرير ' + esc(c.name) + '</h2><button class="btn sm primary" data-xlsx="class">📊 تصدير Excel</button><button class="btn sm" id="repPrint">🖨️ طباعة تقرير الفصل</button></div>' +
      '<div class="tiles">' +
        tile(AR(r.count), "عدد الطالبات") + tile(r.avg == null ? "—" : AR(r.avg) + "٪", "متوسط الدرجات") + tile(r.max == null ? "—" : AR(r.max) + "٪", "أعلى نسبة") +
        tile(r.min == null ? "—" : AR(r.min) + "٪", "أدنى نسبة") + tile(r.attRate == null ? "—" : AR(r.attRate) + "٪", "نسبة الحضور") + tile(AR(r.attDays), "أيام التحضير") +
      "</div>" +
      '<div class="two">' +
        '<div class="card sec"><h3>🎯 توزيع التقديرات <small class="muted">(' + AR(r.graded) + " من " + AR(r.count) + " لهن درجات)</small></h3>" +
          Object.keys(r.dist).map(function (k) { return '<div class="hbar"><span>' + esc(k) + '</span><div class="track"><i style="width:' + (r.dist[k] / maxDist * 100) + '%"></i></div><em>' + AR(r.dist[k]) + "</em></div>"; }).join("") + "</div>" +
        '<div class="card sec"><h3>📊 متوسط كل بند</h3>' +
          r.compAvg.map(function (x) { var p = x.avg == null ? 0 : x.avg / x.comp.max * 100;
            return '<div class="hbar"><span>' + esc(x.comp.name) + '</span><div class="track dev"><i style="width:' + p + '%"></i></div><em>' + (x.avg == null ? "—" : AR(x.avg) + "/" + AR(x.comp.max)) + "</em></div>"; }).join("") + "</div>" +
        '<div class="card sec"><h3>🔔 طالبات يحتجن متابعة</h3><div class="list-plain">' +
          (r.support.length ? r.support.map(function (x) { return '<div><span>' + esc(x.s.name) + "</span><small>" + AR(esc(x.why.join(" • "))) + "</small></div>"; }).join("") : '<small class="muted">لا يوجد — أحسنتنّ 🌟</small>') + "</div></div>" +
        '<div class="card sec"><h3>⭐ الأكثر تميّزًا</h3><div class="list-plain">' +
          (r.top.length ? r.top.map(function (x) { return "<div><span>" + esc(x.s.name) + "</span><small>" + AR(x.ev.pos) + " تقييم إيجابي</small></div>"; }).join("") : '<small class="muted">لم تُسجَّل تقييمات بعد</small>') + "</div></div>" +
      "</div>" +
      '<div class="card sec no-print"><div class="row"><h3 class="grow" style="margin:0">📄 تقرير طالبة</h3><select id="repSel"><option value="">اختاري طالبة…</option>' +
        c.students.map(function (s) { return '<option value="' + s.id + '"' + (s.id === ui.reportSid ? " selected" : "") + ">" + esc(s.name) + "</option>"; }).join("") + "</select>" +
        (ui.reportSid ? '<button class="btn sm" id="stPrint">🖨️ طباعة</button>' : "") + "</div></div>" +
      (ui.reportSid ? studentReport(c, C.student(c.id, ui.reportSid)) : "");
  }
  function tile(b, s) { return '<div class="card tile"><b>' + b + "</b><span>" + s + "</span></div>"; }
  function studentReport(c, s) {
    var p = C.data().profile || {}, a = C.attendanceOf(c.id, s.id), g = C.gradeRow(c.id, s.id), cnt = C.eventCounts(c.id, s.id);
    return '<div class="card sreport" id="sReport">' +
      "<h2>📄 " + esc(s.name) + '</h2><p class="muted">' + esc([c.name, p.subject, p.school, p.year].filter(Boolean).join(" • ")) + "</p>" +
      '<table><tr><th colspan="2">الحضور</th></tr>' +
        ["p", "a", "l", "e"].map(function (k) { return "<tr><td>" + C.ATT[k].icon + " " + C.ATT[k].ar + "</td><td>" + AR(a[k]) + "</td></tr>"; }).join("") +
        "<tr><td>نسبة الحضور</td><td>" + (a.rate == null ? "—" : AR(a.rate) + "٪") + "</td></tr>" +
        (a.absentDates.length ? "<tr><td>أيام الغياب</td><td>" + esc(a.absentDates.map(fmtDay).join("، ")) + "</td></tr>" : "") + "</table>" +
      '<table><tr><th>البند</th><th>الدرجة</th></tr>' +
        C.components().map(function (k) { var x = g.values[k.id]; return "<tr><td>" + esc(k.name) + "</td><td>" + (typeof x === "number" ? AR(x) : "—") + " / " + AR(k.max) + "</td></tr>"; }).join("") +
        "<tr><th>المجموع</th><th>" + (g.filled ? AR(g.total) : "—") + " / " + AR(g.complete ? g.max : g.filledMax) + (g.pct == null ? "" : " — " + AR(g.pct) + "٪ — " + esc(g.rating)) + (g.filled && !g.complete ? " (⏳ لم تُرصد كل البنود)" : "") + "</th></tr></table>" +
      '<table><tr><th colspan="2">التقييم السريع</th></tr>' +
        C.data().settings.icons.map(function (i) { return "<tr><td>" + esc(i.icon + " " + i.label) + "</td><td>" + AR(cnt.by[i.id] || 0) + "</td></tr>"; }).join("") + "</table>" +
      (s.notes.length ? '<table><tr><th colspan="2">الملاحظات</th></tr>' + s.notes.map(function (n) { return "<tr><td>" + esc(fmtDay(n.date)) + "</td><td>" + esc(n.text) + "</td></tr>"; }).join("") + "</table>" : "") +
      (p.teacher ? '<p class="muted" style="margin-top:12px">المعلمة: ' + esc(p.teacher) + "</p>" : "") +
    "</div>";
  }

  /* ======================= ⚙️ الإعدادات ======================= */
  function rSettings() {
    var d = C.data(), p = d.profile || {}, c = C.cls(), s = d.settings;
    var sumMax = s.components.reduce(function (a, k) { return a + (+k.max || 0); }, 0);
    $("#v-settings").innerHTML =
      '<form class="card sec" id="profForm"><h3>👩‍🏫 بيانات المعلمة</h3><div class="setup" style="margin:0;padding:0;max-width:none"><div class="grid2" style="margin:0 0 10px">' +
        '<label>اسم المعلمة<input name="teacher" required value="' + esc(p.teacher) + '"></label><label>اسم المدرسة<input name="school" value="' + esc(p.school) + '"></label>' +
        '<label>المادة<input name="subject" value="' + esc(p.subject || "التقنية الرقمية 3") + '"></label><label>العام الدراسي<input name="year" value="' + esc(p.year) + '"></label>' +
        '<label>الصف<input name="gradeName" value="' + esc(p.gradeName || "") + '" placeholder="مثال: ثالث ثانوي"></label></div></div>' +
        '<button class="btn sm primary">💾 حفظ البيانات</button></form>' +

      strategiesCard(c) +
      '<div class="card sec"><h3>🏫 الفصول</h3>' +
        d.classes.map(function (k) { return '<div class="ed-row"><input class="g" data-cname="' + k.id + '" value="' + esc(k.name) + '"><span class="muted">' + AR(k.students.length) + ' طالبة</span><button class="btn sm" data-cact="' + k.id + '"' + (k.id === d.activeClassId ? " disabled" : "") + ">" + (k.id === d.activeClassId ? "✓ الحالي" : "اختيار") + '</button><button class="btn sm quiet" data-cdel="' + k.id + '">🗑️ حذف</button></div>'; }).join("") +
        '<form class="ed-row" id="newClass" style="margin-top:10px"><input class="g" name="name" value="' + esc(C.nextClassName()) + '" placeholder="اسم الفصل الجديد" required><button class="btn sm primary">＋ إضافة فصل</button></form>' +
        '<div class="row" style="margin-top:10px"><button class="btn sm" id="xlsxImport" style="border-color:#16A34A;color:#166534">📥 استيراد الطالبات من ملف Excel</button><span class="muted">ورقة لكل فصل — يُنشأ الفصل إن لم يكن موجودًا، وتُضاف الأسماء الجديدة فقط</span></div></div>' +

      (c ? '<div class="card sec"><div class="row"><h3 class="grow" style="margin:0">👧 طالبات ' + esc(c.name) + " (" + AR(c.students.length) + ')</h3><button class="btn sm" id="sortSt">ترتيب أبجدي</button></div>' +
        '<div class="st-edit" style="margin-top:10px">' + c.students.map(function (st, i) { return "<div><b>" + AR(i + 1) + '</b><input data-sname="' + st.id + '" value="' + esc(st.name) + '"><button class="del" data-sdel="' + st.id + '" title="حذف الطالبة">🗑️</button></div>'; }).join("") + "</div>" +
        '<label style="margin-top:12px">إضافة طالبات — اسم في كل سطر <span class="count-pill" id="addCount">٠</span><textarea id="addNames" style="min-height:100px" placeholder="الصقي الأسماء هنا"></textarea></label>' +
        '<button class="btn sm primary" id="addSt" style="margin-top:8px">＋ إضافة</button></div>' : "") +

      '<div class="card sec"><h3>⚡ أيقونات التقييم السريع</h3><div id="icEd">' + s.icons.map(icRow).join("") + "</div>" +
        '<div class="row"><button class="btn sm" id="icAdd">＋ أيقونة</button><button class="btn sm primary" id="icSave">💾 حفظ الأيقونات</button></div></div>' +

      '<div class="card sec"><h3>📊 بنود أعمال السنة</h3><p class="muted" style="margin-bottom:8px">هذا توزيع مقترح فقط — عدّليه ليطابق توزيع الدرجات المعتمد. المجموع الحالي: <b id="compSum">' + AR(sumMax) + "</b></p>" +
        '<div id="compEd">' + s.components.map(compRow).join("") + "</div>" +
        '<div class="row"><button class="btn sm" id="compAdd">＋ بند</button><button class="btn sm primary" id="compSave">💾 حفظ البنود</button></div></div>' +

      '<div class="card sec"><h3>🎯 التقديرات والتنبيهات</h3><div id="scEd">' + s.scale.map(function (x) { return '<div class="ed-row"><span class="muted">من</span><input class="n" type="number" min="0" max="100" data-smin value="' + x.min + '"><span class="muted">٪ فأعلى:</span><input class="g" data-slabel value="' + esc(x.label) + '"></div>'; }).join("") + "</div>" +
        '<div class="ed-row" style="margin-top:10px"><span class="muted">تظهر الطالبة في «يحتجن متابعة» إذا: الغياب ≥</span><input class="n" type="number" min="1" id="alAbs" value="' + s.alerts.absences + '"><span class="muted">أو الملاحظات السلبية ≥</span><input class="n" type="number" min="1" id="alNeg" value="' + s.alerts.negatives + '"><span class="muted">أو النسبة أقل من</span><input class="n" type="number" min="0" max="100" id="alPct" value="' + s.alerts.pct + '"><span class="muted">٪</span></div>' +
        '<button class="btn sm primary" id="scSave">💾 حفظ</button></div>' +

      '<div class="card sec"><h3>💾 البيانات والخصوصية</h3><p class="privacy" style="margin-bottom:10px">🔒 كل البيانات (الأسماء، الحضور، الدرجات، الملاحظات) محفوظة في <b>هذا المتصفح على هذا الجهاز فقط</b>. صدّري نسخة احتياطية بانتظام، فمسح بيانات المتصفح يحذفها.</p>' +
        '<div class="row"><button class="btn sm primary" data-xlsx="all">📊 تصدير كل الفصول (Excel)</button><button class="btn sm" id="bkExport">💾 نسخة احتياطية (JSON)</button><button class="btn sm" id="bkImport">📂 استعادة نسخة</button><button class="btn sm quiet" id="wipe">🗑️ حذف كل البيانات الصفية</button></div></div>';
  }
  /* 🎯 أدوات الحصة: تفعيل كل أداة أو إيقافها + المجموعات وأسماؤها وتوزيع الطالبات */
  function saveStrategies() {
    var o = {};
    $$("#stCard [data-st]").forEach(function (x) { o[x.dataset.st] = x.type === "checkbox" ? x.checked : (x.dataset.st === "groupCount" ? +x.value : x.value); });
    var names = C.strategies().groupNames.slice();
    $$("#stCard [data-gname]").forEach(function (x) { names[+x.dataset.gname] = x.value.trim(); });
    o.groupNames = names; C.setStrategies(o);
  }
  function strategiesCard(c) {
    var s = C.strategies(), G = C.groupsConfig();
    var chk = function (k, label, sub) { return '<label class="sw"><input type="checkbox" data-st="' + k + '"' + (s[k] ? " checked" : "") + '><span><b>' + label + "</b>" + (sub ? "<small>" + sub + "</small>" : "") + "</span></label>"; };
    var members = "";
    if (s.groups && c && c.students.length) {
      var count = G.map(function (g, i) { return C.groupMembers(c.id, i).length; }), none = c.students.filter(function (x) { return x.group == null; }).length;
      members = '<div class="gm"><div class="row" style="margin:6px 0"><b class="grow">👥 توزيع طالبات ' + esc(c.name) + "</b>" +
        '<button class="btn sm primary" id="stAssign">🔀 توزيع عشوائي متوازن</button></div>' +
        '<div class="gm-sum">' + G.map(function (g, i) { return '<span style="--c:' + g.color + '">' + g.icon + " " + esc(g.name) + ": " + AR(count[i]) + "</span>"; }).join("") + (none ? "<span>⬜ بلا مجموعة: " + AR(none) + "</span>" : "") + "</div>" +
        '<div class="gm-list">' + c.students.map(function (x) {
          return "<div><span>" + esc(x.name) + '</span><select data-sgrp="' + x.id + '"><option value="">—</option>' +
            G.map(function (g, i) { return '<option value="' + i + '"' + (x.group === i ? " selected" : "") + ">" + g.icon + " " + esc(g.name) + "</option>"; }).join("") + "</select></div>";
        }).join("") + "</div></div>";
    }
    return '<div class="card sec" id="stCard"><h3>🎯 أدوات الحصة <small class="muted">— تظهر داخل كل درس، ويمكن تفعيل كل أداة أو إيقافها</small></h3>' +
      '<div class="sw-grid">' +
        chk("attendance", "✅ التحضير أول كل درس", "تظهر قائمة الطالبات عند فتح الدرس (مرة واحدة يوميًا لكل فصل)") +
        chk("individual", "⭐ التقييم الفردي", "«أجابت صحيحًا» في القرعة يضيف نقطة للطالبة في كشفها") +
        '<div class="sw-box">' + chk("lottery", "🎲 قرعة الإجابة", "اختيار عشوائي لمن تجيب — زر «🎲 قرعة» أو حرف (ق)") +
          '<div class="sw-sub"><label>القرعة على: <select data-st="lotteryMode"><option value="student"' + (s.lotteryMode === "student" ? " selected" : "") + '>طالبة</option><option value="group"' + (s.lotteryMode === "group" ? " selected" : "") + ">مجموعة</option></select></label>" +
          chk("noRepeat", "لا يتكرر الاسم حتى يأتي دور الجميع") + "</div></div>" +
        '<div class="sw-box">' + chk("groups", "👥 استراتيجية المجموعات", "لوحة نقاط المجموعات داخل الدرس") +
          '<div class="sw-sub"><label>عدد المجموعات: <select data-st="groupCount">' + [2,3,4,5,6,7,8].map(function (n) { return '<option value="' + n + '"' + (s.groupCount === n ? " selected" : "") + ">" + AR(n) + "</option>"; }).join("") + "</select></label>" +
          chk("awardPopup", "نافذة «أي مجموعة أجابت؟» بعد كل إجابة صحيحة") + "</div></div>" +
      "</div>" +
      (s.groups ? '<div class="gn"><b>أسماء المجموعات:</b>' + G.map(function (g, i) { return '<label style="--c:' + g.color + '"><span>' + g.icon + '</span><input data-gname="' + i + '" value="' + esc(g.name) + '" maxlength="20"></label>'; }).join("") + "</div>" : "") +
      members +
      '<div class="row" style="margin-top:10px"><button class="btn sm primary" id="stSave">💾 حفظ أدوات الحصة</button></div></div>';
  }
  function icRow(i) {
    return '<div class="ed-row" data-icid="' + esc(i.id || "") + '"><input class="e" data-k="icon" value="' + esc(i.icon) + '" aria-label="الأيقونة"><input class="g" data-k="label" value="' + esc(i.label) + '" aria-label="الوصف">' +
      '<select data-k="kind"><option value="pos"' + (i.kind !== "neg" ? " selected" : "") + '>إيجابي</option><option value="neg"' + (i.kind === "neg" ? " selected" : "") + '>يحتاج متابعة</option></select><button class="del" data-rm title="حذف">✕</button></div>';
  }
  function compRow(k) {
    return '<div class="ed-row" data-cid="' + esc(k.id || "") + '"><input class="g" data-k="name" value="' + esc(k.name) + '" placeholder="اسم البند"><span class="muted">الدرجة</span><input class="n" type="number" min="1" data-k="max" value="' + esc(k.max) + '"><button class="del" data-rm title="حذف">✕</button></div>';
  }

  /* ======================= events ======================= */
  document.addEventListener("click", function (e) {
    var t = e.target, b;
    if ((b = t.closest("[data-go]"))) return go(b.dataset.go);
    if ((b = t.closest(".tabs button"))) return go(b.dataset.tab);
    if (t.closest("[data-close]")) return closeDrawer();

    /* Excel */
    if ((b = t.closest("[data-xlsx]"))) return exportExcel(b.dataset.xlsx, +(b.dataset.tab || 0));

    /* roster */
    if ((b = t.closest(".ic-btn[data-ic]"))) { ui.quick = ui.quick === b.dataset.ic ? null : b.dataset.ic; return rRoster(); }
    if ((b = t.closest(".st[data-sid]"))) return ui.quick ? quickAdd(b.dataset.sid, b) : openDrawer(b.dataset.sid);
    if (t.closest("#rRandom")) return randomPick();

    /* drawer */
    var c = C.cls();
    if ((b = t.closest("[data-datt]"))) { var cur = C.day(c.id, C.today())[ui.drawerSid]; C.mark(c.id, C.today(), ui.drawerSid, cur === b.dataset.datt ? null : b.dataset.datt); saved(); return rDrawer(); }
    if ((b = t.closest("[data-dic]"))) { var ic = C.icon(b.dataset.dic), ev = C.addEvent(c.id, ui.drawerSid, ic.id); saved(); rDrawer();
      return toast(ic.icon + " " + ic.label, { undo: function () { C.removeEvent(c.id, ev.id); rDrawer(); } }); }
    if ((b = t.closest("[data-dev]"))) { C.removeEvent(c.id, b.dataset.dev); return rDrawer(); }
    if (t.closest("#noteAdd")) { var inp = $("#noteIn"); if (C.addNote(c.id, ui.drawerSid, inp.value)) { saved(); rDrawer(); toast("📝 تمت إضافة الملاحظة"); } return; }
    if ((b = t.closest("[data-dnote]"))) { if (confirm("حذف هذه الملاحظة؟")) { C.deleteNote(c.id, ui.drawerSid, b.dataset.dnote); rDrawer(); } return; }
    if ((b = t.closest("[data-report]"))) { ui.reportSid = b.dataset.report; closeDrawer(); return go("reports"); }

    /* attendance */
    if ((b = t.closest("[data-att]"))) { var was = C.day(c.id, ui.attDate)[b.dataset.sid]; C.mark(c.id, ui.attDate, b.dataset.sid, was === b.dataset.att ? null : b.dataset.att); saved(); return rAttendance(); }
    if (t.closest("#allPresent")) {
      var before = JSON.parse(JSON.stringify(C.day(c.id, ui.attDate)));
      C.markAll(c.id, ui.attDate, "p", true); saved(); rAttendance();
      return toast("✓ تم تحضير الجميع — اضغطي ❌ على الغائبات", { undo: function () { C.clearDay(c.id, ui.attDate); Object.keys(before).forEach(function (sid) { C.mark(c.id, ui.attDate, sid, before[sid]); }); rAttendance(); } });
    }
    if (t.closest("#clearDay")) { if (confirm("مسح تحضير " + fmtDay(ui.attDate) + "؟")) { C.clearDay(c.id, ui.attDate); rAttendance(); } return; }
    if ((b = t.closest("[data-dshift]"))) { ui.attDate = shiftDay(ui.attDate, +b.dataset.dshift); return rAttendance(); }
    if ((b = t.closest("[data-day]"))) { ui.attDate = b.dataset.day; return rAttendance(); }

    /* grades */
    if ((b = t.closest("[data-fill]"))) {
      var comp = C.components().find(function (k) { return k.id === b.dataset.fill; });
      if (comp && confirm("تعبئة الخانات الفارغة في «" + comp.name + "» بالدرجة الكاملة (" + comp.max + ")؟")) { var n = C.fillEmpty(c.id, comp.id, comp.max); saved(); rGrades(); toast("✓ تمت تعبئة " + AR(n) + " خانة"); }
      return;
    }
    if (t.closest("#grPrint")) return printView("v-grades");

    /* reports */
    if (t.closest("#repPrint")) return printView("v-reports");
    if (t.closest("#stPrint")) return printView("v-reports", true);

    /* settings */
    if ((b = t.closest("[data-cact]"))) { C.setActive(b.dataset.cact); return render(); }
    if ((b = t.closest("[data-cdel]"))) { var k = C.cls(b.dataset.cdel);
      if (k && confirm("حذف فصل «" + k.name + "» مع كل بياناته (الطالبات، الحضور، الدرجات)؟ لا يمكن التراجع.")) { C.deleteClass(k.id); render(); toast("🗑️ تم حذف الفصل"); } return; }
    if ((b = t.closest("[data-sdel]"))) { var st = C.student(c.id, b.dataset.sdel);
      if (st && confirm("حذف الطالبة «" + st.name + "» مع حضورها ودرجاتها وملاحظاتها؟")) { C.deleteStudent(c.id, st.id); rSettings(); renderHeader(); } return; }
    if (t.closest("#sortSt")) { C.sortStudents(c.id); return rSettings(); }
    if (t.closest("#addSt")) { var added = C.addStudents(c.id, $("#addNames").value); saved(); rSettings(); renderHeader(); return toast(added ? "✓ أُضيفت " + AR(added) + " طالبة" : "لا توجد أسماء جديدة"); }
    if (t.closest("#stSave")) {
      saveStrategies(); saved(); rSettings(); renderHeader();
      return toast("💾 تم حفظ أدوات الحصة — تظهر في الدروس عند فتحها");
    }
    if (t.closest("#stAssign")) {
      if (c.students.some(function (x) { return x.group != null; }) && !confirm("إعادة توزيع كل الطالبات عشوائيًا على المجموعات؟")) return;
      C.assignGroups(c.id); saved(); rSettings(); return toast("🔀 تم توزيع الطالبات على المجموعات");
    }
    if (t.closest("#icAdd")) { $("#icEd").insertAdjacentHTML("beforeend", icRow({ icon: "🌟", label: "", kind: "pos" })); return; }
    if (t.closest("#compAdd")) { $("#compEd").insertAdjacentHTML("beforeend", compRow({ name: "", max: 10 })); return; }
    if ((b = t.closest("[data-rm]"))) { b.closest(".ed-row").remove(); updCompSum(); return; }
    if (t.closest("#icSave")) {
      C.setIcons($$("#icEd .ed-row").map(function (r) { return { id: r.dataset.icid, icon: $('[data-k="icon"]', r).value, label: $('[data-k="label"]', r).value, kind: $('[data-k="kind"]', r).value }; }));
      saved(); rSettings(); return toast("💾 تم حفظ الأيقونات");
    }
    if (t.closest("#compSave")) {
      var list = $$("#compEd .ed-row").map(function (r) { return { id: r.dataset.cid, name: $('[data-k="name"]', r).value, max: $('[data-k="max"]', r).value }; });
      if (!list.some(function (x) { return x.name && +x.max > 0; })) return toast("أضيفي بندًا واحدًا على الأقل", { err: true });
      C.setComponents(list); saved(); rSettings(); return toast("💾 تم حفظ البنود — المجموع " + AR(C.maxTotal()));
    }
    if (t.closest("#scSave")) {
      C.setScale($$("#scEd .ed-row").map(function (r) { return { min: $("[data-smin]", r).value, label: $("[data-slabel]", r).value }; }));
      C.setAlerts({ absences: +$("#alAbs").value || 3, negatives: +$("#alNeg").value || 3, pct: +$("#alPct").value || 60 });
      saved(); rSettings(); return toast("💾 تم الحفظ");
    }
    if (t.closest("#bkExport")) { download(JSON.stringify({ app: "dt3-classroom", version: 1, exportedAt: new Date().toISOString(), classroom: C.exportData() }, null, 2), "classroom-backup-" + C.today() + ".json", "application/json"); return toast("💾 تم إنشاء النسخة الاحتياطية — تحققي من مجلد التنزيلات"); }
    if (t.closest("#bkImport")) return $("#restoreFile").click();
    if (t.closest("#xlsxImport")) { $("#xlsxFile").dataset.mode = "settings"; return $("#xlsxFile").click(); }
    if (t.closest("#wipe")) {
      if (confirm("حذف كل البيانات الصفية (الفصول، الطالبات، الحضور، الدرجات، الملاحظات)؟") && confirm("تأكيد أخير: لا يمكن التراجع إلا من نسخة احتياطية. متابعة؟")) { C.resetAll(); location.hash = ""; init(); toast("🗑️ تم حذف البيانات"); }
      return;
    }
  });

  document.addEventListener("input", function (e) {
    var t = e.target;
    if (t.id === "rSearch") { ui.search = t.value.trim(); filterCards(); }
    if (t.id === "addNames") $("#addCount").textContent = AR(C.parseNames(t.value).length);
    if (t.closest("#compEd")) updCompSum();
  });
  document.addEventListener("change", function (e) {
    var t = e.target, c = C.cls();
    if (t.id === "classSel") { C.setActive(t.value); ui.reportSid = null; return render(); }
    if (t.id === "attDate" && t.value) { ui.attDate = t.value; return rAttendance(); }
    if (t.id === "repSel") { ui.reportSid = t.value || null; return rReports(); }
    if (t.dataset.comp) {
      var tr = t.closest("tr"), ok = C.setGrade(c.id, tr.dataset.sid, t.dataset.comp, t.value.trim());
      t.classList.toggle("bad", !ok);
      if (!ok) return toast("الدرجة يجب أن تكون بين ٠ و " + AR(t.dataset.max), { err: true });
      saved(); updateGradeRow(tr);
    }
    if (t.dataset.cname) { C.renameClass(t.dataset.cname, t.value); return renderHeader(); }
    if (t.dataset.sname) { C.renameStudent(c.id, t.dataset.sname, t.value); return; }
    if (t.dataset.sgrp) { C.setStudentGroup(c.id, t.dataset.sgrp, t.value); saved(); return rSettings(); }
    if (t.dataset.st === "groups" || t.dataset.st === "groupCount") { saveStrategies(); return rSettings(); }   // show or hide the group options right away
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && ui.drawerSid) closeDrawer();
    if (e.key === "Enter" && e.target.id === "noteIn") { e.preventDefault(); $("#noteAdd").click(); }
    // Enter in the grades table moves down to the same column, like a spreadsheet
    if (e.key === "Enter" && e.target.dataset && e.target.dataset.comp) {
      e.preventDefault(); e.target.dispatchEvent(new Event("change", { bubbles: true }));
      var tr = e.target.closest("tr").nextElementSibling, nx = tr && $('input[data-comp="' + e.target.dataset.comp + '"]', tr);
      if (nx) { nx.focus(); nx.select(); }
    }
  });
  document.addEventListener("submit", function (e) {
    e.preventDefault(); var f = e.target, fd = new FormData(f);
    if (f.id === "setupForm") return finishSetup();
    if (f.id === "profForm") { saved(C.setProfile({ teacher: fd.get("teacher"), school: fd.get("school"), subject: fd.get("subject"), year: fd.get("year"), gradeName: fd.get("gradeName") })); render(); toast("💾 تم حفظ البيانات"); }
    if (f.id === "newClass") { C.addClass(fd.get("name")); saved(); render(); toast("✓ تمت إضافة الفصل — أضيفي طالباته أدناه"); }
  });
  $("#addClassBtn").onclick = function () { go("settings"); setTimeout(function () { var i = $('#newClass input'); if (i) { i.scrollIntoView({ block: "center" }); i.focus(); } }, 50); };
  $("#skipSetup").onclick = function () { C.skipSetup(); showSetup(false); go("settings"); };
  $("#restoreFile").onchange = function (e) {
    var f = e.target.files[0]; e.target.value = ""; if (!f) return;
    if (!confirm("ستحلّ النسخة الاحتياطية محلّ كل البيانات الصفية الحالية. متابعة؟")) return;
    var rd = new FileReader();
    rd.onload = function () {
      try { var o = JSON.parse(rd.result); saved(C.importData(o.classroom || o)); init(); toast("📂 تمت الاستعادة"); }
      catch (err) { toast("⚠️ الملف غير صالح: " + err.message, { err: true }); }
    };
    rd.readAsText(f);
  };
  /* 📥 Excel: one sheet per class (js/xlsx-reader.js) */
  $("#xlsxFile").onchange = function (e) {
    var f = e.target.files[0], mode = e.target.dataset.mode; e.target.value = ""; if (!f) return;
    if (!window.XLSXReader) return toast("⚠️ تعذّر تحميل أداة قراءة Excel", { err: true });
    XLSXReader.readClasses(f).then(function (list) {
      if (!list.length) return toast("⚠️ لم أجد أسماء في الملف — تأكدي من وجود عمود «اسم الطالبة»", { err: true });
      var sum = list.map(function (k) { return k.name + " (" + AR(k.names.length) + ")"; }).join("، ");
      if (mode === "setup") {
        sd.count = list.length; sd.active = 0;
        sd.classes = list.map(function (k) { return { name: k.name, names: k.names.join("\n"), auto: false }; });
        keepDraft(); renderSetup();
        return toast("📥 تمت قراءة " + AR(list.length) + " فصول: " + sum);
      }
      if (!confirm("سيتم استيراد: " + sum + "\n\nالفصل الموجود بنفس الاسم تُضاف إليه الأسماء الجديدة فقط. متابعة؟")) return;
      var made = 0, added = 0;
      list.forEach(function (k) {
        var have = C.data().classes.find(function (x) { return x.name === k.name; });
        if (have) added += C.addStudents(have.id, k.names.join("\n"));
        else { var c = C.addClass(k.name, k.names.join("\n")); made++; added += c.students.length; }
      });
      saved(); render();
      toast("📥 " + (made ? "أُنشئ " + AR(made) + " فصل، و" : "") + "أُضيفت " + AR(added) + " طالبة");
    }, function (err) { toast("⚠️ تعذّرت قراءة الملف: " + err.message, { err: true }); });
  };
  function updCompSum() { var el = $("#compSum"); if (el) el.textContent = AR($$('#compEd [data-k="max"]').reduce(function (a, i) { return a + (+i.value || 0); }, 0)); }
  function printView(id, studentOnly) {
    var v = $("#" + id); v.classList.add("printing");
    var hidden = studentOnly ? $$("#v-reports > :not(#sReport)") : [];
    hidden.forEach(function (x) { x.style.display = "none"; });
    setTimeout(function () { window.print(); v.classList.remove("printing"); hidden.forEach(function (x) { x.style.display = ""; }); }, 50);
  }
  window.addEventListener("storage", function (e) { if (e.key === C.KEY) { C.reload(); render(); } });

  /* ---------- start ---------- */
  function init() {
    C.reload();
    var h = (location.hash || "").slice(1);
    if (C.needsSetup() || (h === "setup" && !C.hasProfile())) return startSetup();
    showSetup(false); go(TABS.indexOf(h) >= 0 ? h : "roster");
  }
  init();
})();
