/* ==========================================================================
   shared.js — teacher panel added to every lesson page
   --------------------------------------------------------------------------
   Add these lines just before </body> of a lesson (change the lesson ID):

     <link rel="stylesheet" href="../css/shared.css">
     <script src="../js/lesson-data.js"></script>
     <script src="../js/progress-manager.js"></script>
     <script src="../js/shared.js" data-lesson="lesson-01"></script>

   The panel (top-right corner) gives the teacher:
     • a link back to home.html
     • the teaching status: لم يُشرح / قيد الشرح / تم شرح الدرس ✓
     • links to the previous and next lessons in textbook order
   Opening a lesson never changes its status. The panel hides with the
   lesson's own controls when the mouse is idle (body.idle).
   The last slide reached in each lesson is saved in the browser
   (localStorage "dt3-lesson-pos-v1"); when the lesson is reopened on slide 1
   the panel offers «↩ متابعة من الشريحة N» — it never jumps by itself,
   because the same lesson is usually taught again to another class.
   ========================================================================== */
(function () {
  "use strict";
  var me = document.currentScript, P = window.Progress;
  var id = me && me.dataset.lesson;
  if (!P || !id || !P.get(id)) { console.error("shared.js: unknown lesson id", id); return; }

  P.applySyncFromURL();   // the dashboard may have sent the latest status in the link

  /* ---------- last slide reached, per lesson ---------- */
  var POS_KEY = "dt3-lesson-pos-v1";
  function readPos() { try { var o = JSON.parse(localStorage.getItem(POS_KEY)); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } }
  function slideNow() { var m = /^#(\d+)/.exec(location.hash); return m ? +m[1] : 1; }
  var saved = readPos()[id], resumeTo = saved && saved.slide > 1 && slideNow() === 1 ? saved.slide : 0;
  // lessons record the slide number in the address with history.replaceState("#12") — save it each time
  var origReplace = history.replaceState.bind(history);
  history.replaceState = function (s, t, u) {
    origReplace(s, t, u);
    var n = slideNow(), o = readPos();
    if (n > 1 || (o[id] && o[id].slide !== n)) {
      o[id] = { slide: n, at: new Date().toISOString() };
      try { localStorage.setItem(POS_KEY, JSON.stringify(o)); } catch (e) {}
    }
    if (resumeTo && n !== 1) { resumeTo = 0; draw(); }   // she moved on: drop the offer
  };

  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var root = document.createElement("div");
  root.id = "tp"; root.setAttribute("dir", "rtl");
  document.body.appendChild(root);

  function link(v, label) {
    if (!v) return "<span>" + label + "</span>";
    if (!P.canOpen(v)) return '<span title="' + esc(v.title) + '">' + label + "</span>";
    return '<a href="' + esc(P.withSync(v.file.replace(/^lessons\//, ""), v.id)) + '" title="' + esc(v.title) + '">' + label + "</a>";
  }
  function draw(msg) {
    var v = P.get(id), nb = P.neighbours(id), st = P.TEACH[v.teaching], open = root.classList.contains("open");
    root.className = (open ? "open " : "") + (v.teaching === "completed" ? "done" : "");
    root.innerHTML =
      '<button class="tp-pill" aria-expanded="' + open + '" aria-controls="tpBox" title="لوحة المعلمة">👩‍🏫 <span class="st">' + st.icon + " " + st.ar + "</span></button>" +
      (resumeTo ? '<button class="tp-resume" data-resume title="آخر شريحة وصلتِ إليها في هذا الدرس">↩ متابعة من الشريحة ' + resumeTo + "</button>" : "") +
      '<div class="tp-box" id="tpBox" role="dialog" aria-label="لوحة المعلمة">' +
        '<div class="tp-lesson">' + esc(v.title) + "<small>" + esc(v.type === "lesson" ? v.unitLabel + " • " + v.label : v.title) + " • ص " + v.pages.from + "–" + v.pages.to + "</small></div>" +
        '<button class="tp-done" data-st="completed" aria-pressed="' + (v.teaching === "completed") + '">' + (v.teaching === "completed" ? "☑ تم الشرح" + (v.completedAt ? " • " + esc(P.fmtDate(v.completedAt)) : "") : "تم شرح الدرس ✓") + "</button>" +
        '<div class="tp-seg" role="group" aria-label="حالة الشرح">' +
          ["not_taught", "in_progress", "completed"].map(function (k) {
            return '<button data-st="' + k + '" aria-pressed="' + (v.teaching === k) + '">' + P.TEACH[k].icon + " " + P.TEACH[k].ar + "</button>";
          }).join("") + "</div>" +
        '<div class="tp-row">' + link(nb.prev, "→ الدرس السابق") + link(nb.next, "الدرس التالي ←") + "</div>" +
        '<a class="tp-home" href="' + esc(P.withSync("../home.html", id)) + '">🏠 العودة إلى لوحة المعلمة</a>' +
        '<div class="tp-msg" role="status">' + esc(msg || (P.storageOK() ? "" : "⚠️ لا يمكن الحفظ الدائم في هذا المتصفح")) + "</div>" +
      "</div>";
  }

  /* ---------- random student from the active class (classroom.html data) ---------- */
  function pickPool() {
    var C = window.Classroom, c = C && C.cls();
    if (!c || !c.students.length) return null;
    var att = C.day(c.id, C.today());
    var pool = c.students.filter(function (s) { return att[s.id] !== "a" && att[s.id] !== "e"; });
    return pool.length ? { cls: c, list: pool } : null;
  }
  function pickStudent() {
    var P2 = pickPool(); if (!P2) return;
    var ov = document.getElementById("tpPick");
    if (!ov) { ov = document.createElement("div"); ov.id = "tpPick"; ov.setAttribute("dir", "rtl"); document.body.appendChild(ov); }
    ov.innerHTML = '<div class="pk-card"><small>' + esc(P2.cls.name) + ' • ' + P2.list.length + ' حاضرة</small><div class="pk-name">🎲</div>' +
      '<div class="pk-btns"><button data-again>🎲 أخرى</button><button data-close>✕ إغلاق</button></div></div>';
    ov.className = "open";
    var nm = ov.querySelector(".pk-name"), k = 0, steps = 16 + Math.floor(Math.random() * P2.list.length);
    (function spin() {
      nm.textContent = P2.list[Math.floor(Math.random() * P2.list.length)].name;
      if (k++ < steps) setTimeout(spin, 50 + k * 8); else nm.classList.add("final");
    })();
    ov.onclick = function (e) {
      e.stopPropagation();
      if (e.target.closest("[data-again]")) return pickStudent();
      if (e.target.closest("[data-close]") || e.target === ov) ov.className = "";
    };
  }

  /* ---------- school & teacher names on every lesson (entered in classroom.html) ---------- */
  function brand() {
    var C = window.Classroom, pr = C && C.data().profile;
    if (!pr || !(pr.school || pr.teacher)) return;
    var line = [pr.school ? "🏫 " + pr.school : "", pr.teacher ? "👩‍🏫 " + pr.teacher : ""].filter(Boolean).join("   •   ");
    // title slide (1600×900 lessons)
    Array.prototype.forEach.call(document.querySelectorAll(".titleS"), function (t) {
      if (t.querySelector(".tp-meta")) return;
      var d = document.createElement("div"); d.className = "tp-meta"; d.textContent = line;
      (t.querySelector(".sub") || t.querySelector("h1")).insertAdjacentElement("afterend", d);
    });
    // preparation slide card
    Array.prototype.forEach.call(document.querySelectorAll(".prep-hero .date"), function (x) {
      if (x.querySelector(".tp-meta2")) return;
      var s = document.createElement("small"); s.className = "tp-meta2"; s.textContent = line; x.appendChild(s);
    });
    // lesson-06 (1920×1080 engine): its welcome slide and footer
    var hm = document.querySelectorAll(".hero-meta span");
    if (hm.length >= 2) { if (pr.teacher) hm[0].textContent = "👩‍🏫 " + pr.teacher; if (pr.school) hm[1].textContent = "🏫 " + pr.school; }
    // a small line at the bottom of every slide (1600×900 lessons)
    var stage = document.getElementById("stage");
    if (stage && document.getElementById("slides") && !document.getElementById("tpBrand")) {
      var f = document.createElement("div"); f.id = "tpBrand"; f.textContent = line; stage.appendChild(f);
    }
    document.title = document.title.replace(/ \| .*$/, "") + " | " + (pr.school || pr.teacher);
  }
  brand();

  root.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    e.stopPropagation();
    if (b.classList.contains("tp-pill")) { root.classList.toggle("open"); draw(); return; }
    if (b.hasAttribute("data-pick")) { pickStudent(); return; }
    if (b.hasAttribute("data-resume")) { var to = resumeTo; resumeTo = 0; if (typeof window.go === "function") window.go(to - 1); draw(); return; }
    var st = b.dataset.st, v = P.get(id);
    if (!st || st === v.teaching) return;
    if (v.teaching === "completed" && !confirm("هذا الدرس مسجَّل «تم الشرح». هل تريدين تغيير حالته إلى «" + P.TEACH[st].ar + "»؟")) return;
    var r = P.setTeaching(id, st);
    draw(r && r.saved ? "✓ تم الحفظ: " + P.TEACH[st].ar : "⚠️ تعذّر الحفظ الدائم في هذا المتصفح");
  });
  // close the panel when clicking anywhere else, or with Escape
  document.addEventListener("click", function (e) { if (root.classList.contains("open") && !root.contains(e.target)) { root.classList.remove("open"); draw(); } });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("open")) { root.classList.remove("open"); draw(); } });
  window.addEventListener("storage", function (e) { if (e.key === P.KEY) draw(); });
  draw();
})();
