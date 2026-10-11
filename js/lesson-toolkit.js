/* ==========================================================================
   lesson-toolkit.js — أدوات الحصة داخل كل درس
   --------------------------------------------------------------------------
   • التحضير أول كل درس     • قرعة الإجابة (طالبة أو مجموعة، دون تكرار)
   • التقييم الفردي          • استراتيجية المجموعات (لوحة النقاط + «أي مجموعة أجابت؟»)
   كل أداة تفعّلها المعلمة أو توقفها من: الإدارة الصفية ← الإعدادات ← أدوات الحصة.
   البيانات في js/classroom-manager.js (window.Classroom). يُحمَّل بعد shared.js.
   ========================================================================== */
(function () {
  "use strict";
  var C = window.Classroom;
  if (!C) return;
  var S = C.strategies();
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var AR = function (n) { return String(n).replace(/\d/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[d]; }); };
  /* lesson-06 has its own team bar and award window; there the toolkit feeds those instead */
  var OWN_TEAMS = !!(document.getElementById("teams") && document.getElementById("award"));
  var ATT = C.ATT, ORDER = ["p", "a", "l", "e"];
  var lastAward = 0;

  function cls() { return C.cls(); }
  function groups() { return S.groups ? C.groupsConfig() : []; }
  /* the lesson engines declare their sound objects with const (Sound in 1600×900 lessons, sound in lesson-06) */
  function play(kind) {
    try {
      if (typeof Sound !== "undefined" && Sound[kind]) return Sound[kind]();
      if (typeof sound !== "undefined" && sound[kind]) return sound[kind]();
    } catch (e) {}
  }

  /* ---------- toast ---------- */
  var toastEl = document.createElement("div"); toastEl.id = "tkToast"; toastEl.setAttribute("dir", "rtl"); document.body.appendChild(toastEl);
  function toast(msg) { toastEl.textContent = msg; toastEl.className = "show"; clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.className = ""; }, 2600); }

  /* ---------- toolbar (top-left) ---------- */
  var bar = document.createElement("div"); bar.id = "tkBar"; bar.setAttribute("dir", "rtl"); if (OWN_TEAMS) bar.className = "own"; document.body.appendChild(bar);
  function drawBar() {
    var c = cls(), b = "";
    if (c) b += '<span class="tk-cls" title="الفصل الحالي">👥 ' + esc(c.name) + "</span>";
    if (c && S.attendance) b += '<button data-tk="att" title="تحضير الطالبات">✅ التحضير</button>';
    if (c && S.lottery) b += '<button data-tk="lot" title="قرعة الإجابة (ق)">🎲 قرعة</button>';
    if (c && S.groups && !OWN_TEAMS) b += '<button data-tk="rank" title="ترتيب المجموعات">🏆</button>';
    bar.innerHTML = b; bar.hidden = !b;
  }

  /* ---------- group scoreboard (top-centre) ---------- */
  var board = document.createElement("div"); board.id = "tkTeams"; board.setAttribute("dir", "rtl"); document.body.appendChild(board);
  function drawBoard(bump) {
    var c = cls(), G = groups();
    if (!c || !G.length || OWN_TEAMS) { board.hidden = true; return; }
    var pts = C.groupPoints(c.id), max = Math.max.apply(null, pts.concat([0]));
    board.hidden = false;
    board.innerHTML = G.map(function (g, i) {
      return '<button class="tk-tm' + (max > 0 && pts[i] === max ? " lead" : "") + (bump === i ? " bump" : "") + '" data-g="' + i + '" style="--c:' + g.color + '" title="' + esc(g.name) + ' — اضغطي +١ • زر الفأرة الأيمن −١">' +
        "<span>" + (max > 0 && pts[i] === max ? "👑" : g.icon) + "</span><b>" + AR(pts[i]) + "</b></button>";
    }).join("");
  }
  function addGroup(g, d) {
    var c = cls(); if (!c || g == null) return;
    if (OWN_TEAMS && typeof window.addPoints === "function") { window.addPoints(g, d); return; }
    C.addGroupPoints(c.id, g, d); drawBoard(g); if (d > 0) play("ding");
  }
  board.addEventListener("click", function (e) { var b = e.target.closest("[data-g]"); if (b) { e.stopPropagation(); addGroup(+b.dataset.g, 1); } });
  board.addEventListener("contextmenu", function (e) { var b = e.target.closest("[data-g]"); if (b) { e.preventDefault(); e.stopPropagation(); addGroup(+b.dataset.g, -1); } });

  /* ---------- overlay helper ---------- */
  var ov = document.createElement("div"); ov.id = "tkOv"; ov.setAttribute("dir", "rtl"); document.body.appendChild(ov);
  function openOv(html) { ov.innerHTML = '<div class="tk-card">' + html + "</div>"; ov.className = "open"; }
  function closeOv() { ov.className = ""; ov.innerHTML = ""; }
  function classPicker() {
    var d = C.data();
    return '<select class="tk-sel" data-cls>' + d.classes.map(function (k) { return '<option value="' + k.id + '"' + (k.id === d.activeClassId ? " selected" : "") + ">" + esc(k.name) + "</option>"; }).join("") + "</select>";
  }
  // while a window is open, the lesson must not react to Space or the arrow keys
  document.addEventListener("keydown", function (e) {
    var t = e.target, typing = t && /INPUT|TEXTAREA|SELECT/.test(t.tagName);
    if (ov.className === "open") {
      if (e.key === "Escape") closeOv();
      if (!typing) { e.stopImmediatePropagation(); if (e.key === " " || e.key.indexOf("Arrow") === 0) e.preventDefault(); }
      return;
    }
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (S.lottery && cls() && (e.key === "ق" || e.code === "KeyR")) { e.preventDefault(); e.stopImmediatePropagation(); lottery(); }
  }, true);

  /* ---------- ✅ attendance ---------- */
  var attState = {};
  function attendance() {
    var c = cls(); if (!c) return;
    var day = C.day(c.id, C.today()); attState = {};
    c.students.forEach(function (s) { attState[s.id] = day[s.id] || "p"; });
    renderAtt(!Object.keys(day).length);
  }
  function renderAtt(fresh) {
    var c = cls(), n = { p: 0, a: 0, l: 0, e: 0 };
    c.students.forEach(function (s) { n[attState[s.id]]++; });
    var dt; try { dt = new Date().toLocaleDateString("ar-SA-u-ca-gregory-nu-arab", { weekday: "long", day: "numeric", month: "long" }); } catch (e) { dt = C.today(); }
    openOv('<div class="tk-h"><h2>✅ تحضير الطالبات</h2>' + classPicker() + '<button class="tk-x" data-close>✕</button></div>' +
      '<p class="tk-sub">' + esc(dt) + (fresh ? " • الكل حاضرات افتراضيًا — اضغطي على الطالبة لتغيير حالتها" : " • تم التحضير اليوم، ويمكنك التعديل") + "</p>" +
      '<div class="tk-sum">' + ORDER.map(function (k) { return "<span>" + ATT[k].icon + " " + ATT[k].ar + ": <b>" + AR(n[k]) + "</b></span>"; }).join("") + "</div>" +
      '<div class="tk-grid">' + c.students.map(function (s, i) {
        var st = attState[s.id];
        return '<button class="tk-st st-' + st + '" data-sid="' + s.id + '"><small>' + AR(i + 1) + "</small>" + esc(s.name) + "<i>" + ATT[st].icon + " " + ATT[st].ar + "</i></button>";
      }).join("") + "</div>" +
      '<div class="tk-btns"><button class="tk-ok" data-save>✓ اعتماد التحضير</button><button data-close>لاحقًا</button></div>');
  }

  /* ---------- 🎲 lottery ---------- */
  var lotMode = S.lotteryMode === "group" && S.groups ? "group" : "student";
  function lottery() {
    var c = cls(); if (!c) return;
    var G = groups(), res = C.draw(c.id, lotMode);
    var head = '<div class="tk-h"><h2>🎲 قرعة الإجابة</h2>' + classPicker() +
      (G.length ? '<div class="tk-mode"><button data-mode="student"' + (lotMode === "student" ? ' class="on"' : "") + '>طالبة</button><button data-mode="group"' + (lotMode === "group" ? ' class="on"' : "") + ">مجموعة</button></div>" : "") +
      '<button class="tk-x" data-close>✕</button></div>';
    if (!res) { openOv(head + '<p class="tk-sub">لا توجد طالبات حاضرات في هذا الفصل.</p>'); return; }
    var label, pick = res.pick, s = null, g = null;
    if (lotMode === "group") { g = pick; label = G[g].icon + " " + G[g].name; }
    else { s = C.student(c.id, pick); g = s && s.group != null && G[s.group] ? s.group : null; label = s ? s.name : "؟"; }
    var info = S.noRepeat ? (res.newRound ? "🔄 بدأت دورة جديدة" : "") + (res.left != null ? (res.newRound ? " • " : "") + "بقي " + AR(res.left) + " من " + AR(res.total) + " لم يأتِ دورهن" : "") : "";
    openOv(head + '<div class="tk-name" data-final="' + esc(label) + '">🎲</div>' +
      (lotMode === "student" && g != null ? '<p class="tk-grp" style="--c:' + G[g].color + '">' + G[g].icon + " مجموعة " + esc(G[g].name) + "</p>" : "") +
      '<p class="tk-sub">' + info + "</p>" +
      '<div class="tk-btns">' +
        (S.individual || G.length ? '<button class="tk-ok" data-right="' + (s ? s.id : "") + '" data-grp="' + (g == null ? "" : g) + '">✓ أجابت صحيحًا' + (S.individual && s ? " (+١ للطالبة" + (g != null ? " و+١ للمجموعة)" : ")") : g != null ? " (+١ للمجموعة)" : "") + "</button>" : "") +
        '<button data-again>🎲 قرعة جديدة</button>' + (S.noRepeat ? '<button data-newround title="يعود الجميع إلى القرعة">↺ دورة جديدة</button>' : "") +
      "</div>");
    var nm = ov.querySelector(".tk-name"), list = lotMode === "group" ? G.map(function (x) { return x.icon + " " + x.name; }) : c.students.map(function (x) { return x.name; });
    var k = 0, steps = 14 + Math.floor(Math.random() * 6);
    (function spin() { nm.textContent = list[Math.floor(Math.random() * list.length)]; if (k++ < steps) setTimeout(spin, 45 + k * 9); else { nm.textContent = nm.dataset.final; nm.classList.add("final"); play("pop"); } })();
  }

  /* ---------- 🏆 ranking ---------- */
  function ranking() {
    var c = cls(), G = groups(); if (!c || !G.length) return;
    var pts = C.groupPoints(c.id), order = G.map(function (g, i) { return i; }).sort(function (a, b) { return pts[b] - pts[a]; }), top = Math.max.apply(null, pts);
    openOv('<div class="tk-h"><h2>🏆 ترتيب المجموعات اليوم</h2>' + classPicker() + '<button class="tk-x" data-close>✕</button></div>' +
      '<div class="tk-rank">' + order.map(function (i, pos) {
        var mem = C.groupMembers(c.id, i).map(function (s) { return s.name.split(" ")[0]; }).join("، ");
        return '<div style="--c:' + G[i].color + '"><b>' + (top > 0 && pts[i] === top ? "👑" : AR(pos + 1)) + "</b><span>" + G[i].icon + " " + esc(G[i].name) +
          "<small>" + esc(mem || "لم تُوزَّع الطالبات بعد") + "</small></span><em>" + AR(pts[i]) + "</em></div>";
      }).join("") + "</div>" +
      '<div class="tk-btns"><button data-resetpts>↺ تصفير نقاط اليوم</button><button data-close>إغلاق</button></div>');
  }

  /* ---------- overlay actions ---------- */
  ov.addEventListener("click", function (e) {
    var b = e.target.closest("button"), c = cls();
    if (e.target === ov || (b && b.hasAttribute("data-close"))) return closeOv();
    if (!b) return;
    e.stopPropagation();
    if (b.dataset.sid) { var i = ORDER.indexOf(attState[b.dataset.sid]); attState[b.dataset.sid] = ORDER[(i + 1) % ORDER.length]; return renderAtt(false); }
    if (b.hasAttribute("data-save")) {
      Object.keys(attState).forEach(function (sid) { C.mark(c.id, C.today(), sid, attState[sid]); });
      closeOv(); toast("✅ تم حفظ التحضير"); play("ding"); return;
    }
    if (b.dataset.mode) { lotMode = b.dataset.mode; return lottery(); }
    if (b.hasAttribute("data-again")) return lottery();
    if (b.hasAttribute("data-newround")) { C.resetLottery(c.id); toast("🔄 دورة جديدة: عاد الجميع إلى القرعة"); return lottery(); }
    if (b.hasAttribute("data-right")) {
      var sid = b.dataset.right, g = b.dataset.grp === "" ? null : +b.dataset.grp, msg = [];
      if (S.individual && sid) { C.awardStudent(c.id, sid); msg.push("نقطة للطالبة"); }
      if (g != null && S.groups) { addGroup(g, 1); msg.push("نقطة للمجموعة"); }
      lastAward = Date.now(); closeOv(); toast("👏 " + (msg.join(" و") || "أحسنتِ")); play("success"); return;
    }
    if (b.hasAttribute("data-resetpts")) { if (confirm("تصفير نقاط المجموعات لهذا اليوم؟")) { C.resetGroupPoints(c.id); drawBoard(); ranking(); } return; }
  });
  ov.addEventListener("change", function (e) {
    if (e.target.hasAttribute("data-cls")) {
      C.setActive(e.target.value); drawBar(); drawBoard();
      var h = ov.querySelector("h2").textContent;
      if (h.indexOf("تحضير") >= 0) attendance(); else if (h.indexOf("قرعة") >= 0) lottery(); else ranking();
    }
  });
  bar.addEventListener("click", function (e) {
    var b = e.target.closest("[data-tk]"); if (!b) return; e.stopPropagation();
    ({ att: attendance, lot: lottery, rank: ranking })[b.dataset.tk]();
  });

  /* ---------- «أي مجموعة أجابت؟» after every correct answer ---------- */
  var award = document.createElement("div"); award.id = "tkAward"; award.setAttribute("dir", "rtl"); document.body.appendChild(award);
  function showAward() {
    var G = groups(); if (!G.length || !cls()) return;
    award.innerHTML = '<div class="tk-aw-h">🏅 أي مجموعة أجابت؟ <button data-awclose>✕</button></div><div class="tk-aw-b">' +
      G.map(function (g, i) { return '<button data-awg="' + i + '" style="--c:' + g.color + '"><span>' + g.icon + "</span><small>" + esc(g.name) + "</small></button>"; }).join("") + "</div>";
    award.className = "open"; clearTimeout(showAward.t); showAward.t = setTimeout(function () { award.className = ""; }, 12000);
  }
  award.addEventListener("click", function (e) {
    e.stopPropagation();
    var b = e.target.closest("[data-awg]");
    if (b) addGroup(+b.dataset.awg, 1);
    if (b || e.target.closest("[data-awclose]")) award.className = "";
  });
  if (S.groups && S.awardPopup && !OWN_TEAMS && typeof window.celebrate === "function") {
    var orig = window.celebrate;
    window.celebrate = function () { var r = orig.apply(this, arguments); if (Date.now() - lastAward > 4000) showAward(); return r; };
  }

  /* lesson-06 keeps its own team window: hide it when the teacher turned the groups strategy off */
  if (OWN_TEAMS && !S.groups) {
    ["teams", "scoreBtn"].forEach(function (id) { var x = document.getElementById(id); if (x) x.style.display = "none"; });
    window.showAward = function () {};
  }

  /* hide with the lesson's controls when the mouse is idle */
  drawBar(); drawBoard();
  window.addEventListener("storage", function (e) { if (e.key === C.KEY) { C.reload(); S = C.strategies(); drawBar(); drawBoard(); } });

  /* ✅ attendance at the start of the lesson (once a day per class) */
  var c0 = cls();
  if (S.attendance && c0 && c0.students.length && !Object.keys(C.day(c0.id, C.today())).length) setTimeout(attendance, 600);

  window.LessonToolkit = { attendance: attendance, lottery: lottery, ranking: ranking, showAward: showAward };
})();
