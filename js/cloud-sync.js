/* ==========================================================================
   cloud-sync.js — password sign-in + online sync (Supabase)
   --------------------------------------------------------------------------
   Load it on every page AFTER js/cloud-config.js and BEFORE
   progress-manager.js / classroom-manager.js.

   How it works
   • localStorage stays the working copy, so every page keeps working as before.
   • The data is split into parts, one row each in the table teacher_data:
       settings      → profile, settings, class order
       class_<id>    → one class: students, attendance, icons, grades, groups, lottery
       progress      → teaching status of the lessons
     Two devices editing different classes never overwrite each other.
   • Every save calls Cloud.touch(); 1.2 s later the changed parts are uploaded.
     Each row has a revision number (rev). If another device saved the same part
     first, the two versions are merged field by field (merge3) and uploaded again.
   • Other devices' changes arrive by polling every 20 s and when the page gets focus.
   • The current class (activeClassId) and the lesson slide position stay per device.
   • No session → a password screen covers the page. Data downloaded from the
     cloud is removed from a device that is no longer signed in (unless it has
     unsent changes), so «تذكّريني» off = nothing stays on a shared smart board.
   With no url in cloud-config.js the whole file does nothing.
   ========================================================================== */
(function () {
  "use strict";
  var CFG = window.CLOUD_CONFIG || {};
  var ON = !!(CFG.url && CFG.key && CFG.email);
  var CLS = "dt3-classroom-v1", PRG = "dt3-textbook-progress-v1", DRAFT = "dt3-setup-draft-v1";
  var S_KEY = "dt3-cloud-session", META = "dt3-cloud-meta", DIRTY = "dt3-cloud-dirty", BACKUP = "dt3-pre-cloud-backup";
  var API = String(CFG.url || "").replace(/\/+$/, ""), TABLE = "/rest/v1/teacher_data";
  var CLASS_FIELDS = ["attendance", "events", "grades", "groupPoints", "lottery"];

  /* ---------- small helpers ---------- */
  function get(k, st) { try { return (st || localStorage).getItem(k); } catch (e) { return null; } }
  function put(k, v, st) { try { (st || localStorage).setItem(k, v); return true; } catch (e) { return false; } }
  function del(k, st) { try { (st || localStorage).removeItem(k); } catch (e) {} }
  function parse(s, d) { try { var o = JSON.parse(s); return o == null ? d : o; } catch (e) { return d; } }
  var J = JSON.stringify;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  function ready(fn) { if (document.body) fn(); else document.addEventListener("DOMContentLoaded", fn); }
  /* stable JSON (sorted keys) — the database returns jsonb with its own key order */
  function canon(x) {
    if (x === undefined) return undefined;
    if (x === null || typeof x !== "object") return J(x);
    if (Array.isArray(x)) return "[" + x.map(function (v) { var s = canon(v); return s === undefined ? "null" : s; }).join(",") + "]";
    return "{" + Object.keys(x).sort().filter(function (k) { return x[k] !== undefined; }).map(function (k) { return J(k) + ":" + canon(x[k]); }).join(",") + "}";
  }
  function same(a, b) { return canon(a) === canon(b); }
  function isObj(x) { return !!x && typeof x === "object" && !Array.isArray(x); }
  function idList(a) { return Array.isArray(a) && a.every(function (x) { return isObj(x) && x.id != null; }); }

  /* three-way merge: what changed locally since `base` wins, everything else comes from `remote`.
     Lists of items with an id (students, notes, icon events) are merged item by item. */
  function merge3(base, local, remote) {
    if (same(local, base)) return remote;
    if (same(remote, base) || same(local, remote)) return local;
    if (isObj(local) && isObj(remote)) {
      var b = isObj(base) ? base : {}, out = {}, keys = {};
      [b, local, remote].forEach(function (o) { Object.keys(o).forEach(function (k) { keys[k] = 1; }); });
      Object.keys(keys).forEach(function (k) { var v = merge3(b[k], local[k], remote[k]); if (v !== undefined) out[k] = v; });
      return out;
    }
    if (idList(local) && idList(remote)) {
      var map = function (a) { var m = {}; (idList(a) ? a : []).forEach(function (x) { m[x.id] = x; }); return m; };
      var bm = map(base), lm = map(local), rm = map(remote), res = [];
      local.forEach(function (x) {
        if (!rm[x.id]) { if (bm[x.id] && same(x, bm[x.id])) return; res.push(x); return; }   // deleted on the other device
        res.push(merge3(bm[x.id], x, rm[x.id]));
      });
      remote.forEach(function (x) { if (!lm[x.id] && !bm[x.id]) res.push(x); });            // added on the other device
      return res;
    }
    return local;
  }

  /* ---------- the local data ⇄ parts ---------- */
  function localData() { return { c: parse(get(CLS), {}), p: parse(get(PRG), {}) }; }
  function split(c, p) {
    var parts = {}, classes = Array.isArray(c.classes) ? c.classes : [];
    parts.settings = { profile: c.profile || null, setupSkipped: !!c.setupSkipped, settings: c.settings || null,
      order: classes.map(function (k) { return k.id; }) };
    classes.forEach(function (k) {
      var part = { cls: k };
      CLASS_FIELDS.forEach(function (f) { part[f] = c[f] && c[f][k.id] != null ? c[f][k.id] : null; });
      parts["class_" + k.id] = part;
    });
    parts.progress = { lessons: (p && p.lessons) || {} };
    return parts;
  }
  function join(parts, prev) {
    var s = parts.settings || {}, now = new Date().toISOString();
    var c = { version: 1, profile: s.profile || null, setupSkipped: !!s.setupSkipped, settings: s.settings || {}, classes: [], activeClassId: null,
      attendance: {}, events: {}, grades: {}, groupPoints: {}, lottery: {}, updatedAt: now };
    var order = (s.order || []).slice();
    Object.keys(parts).sort().forEach(function (k) { if (k.indexOf("class_") === 0 && order.indexOf(k.slice(6)) < 0) order.push(k.slice(6)); });
    order.forEach(function (id) {
      var part = parts["class_" + id]; if (!part || !part.cls) return;
      c.classes.push(part.cls);
      CLASS_FIELDS.forEach(function (f) { if (part[f] != null) c[f][id] = part[f]; });
    });
    var a = prev && prev.activeClassId;   // the current class stays per device
    c.activeClassId = c.classes.some(function (k) { return k.id === a; }) ? a : (c.classes[0] ? c.classes[0].id : null);
    return { c: c, p: { version: 1, lessons: (parts.progress && parts.progress.lessons) || {}, updatedAt: now } };
  }
  function writeLocal(parts, prev) {
    var d = join(parts, prev);
    put(CLS, J(d.c)); put(PRG, J(d.p));
  }
  /* tell the page: the classroom pages and the dashboard already re-render on "storage" events */
  function notify() {
    if (window.Classroom && Classroom.reload) Classroom.reload();
    [CLS, PRG].forEach(function (k) { try { window.dispatchEvent(new StorageEvent("storage", { key: k })); } catch (e) {} });
  }

  /* ---------- session ---------- */
  function session() { return parse(get(S_KEY), null) || parse(get(S_KEY, sessionStorage), null); }
  function setSession(s, remember) {
    del(S_KEY); del(S_KEY, sessionStorage);
    if (s) put(S_KEY, J(s), remember ? localStorage : sessionStorage);
  }
  function keepSession(s) { put(S_KEY, J(s), get(S_KEY) ? localStorage : sessionStorage); }
  function toSession(d) {
    return { access_token: d.access_token, refresh_token: d.refresh_token, uid: d.user && d.user.id,
      expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600) };
  }
  function authError() { var e = new Error("auth"); e.auth = true; return e; }
  function wipeLocal() { [CLS, PRG, DRAFT, META, DIRTY].forEach(function (k) { del(k); }); }

  /* data that came from the cloud does not stay on a device that is no longer signed in */
  if (ON && !session() && get(META) && get(DIRTY) !== "1") wipeLocal();

  var refreshing = null;
  function refresh(s) {
    return fetch(API + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST", headers: { apikey: CFG.key, "Content-Type": "application/json" }, body: J({ refresh_token: s.refresh_token })
    }).then(function (r) {
      if (r.status >= 400 && r.status < 500) throw authError();
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (d) { var n = toSession(d); keepSession(n); return n; });
  }
  function token(force) {
    var s = session();
    if (!s) return Promise.reject(authError());
    if (!force && s.expires_at - 60 > Date.now() / 1000) return Promise.resolve(s);
    if (!refreshing) refreshing = refresh(s).then(function (n) { refreshing = null; return n; }, function (e) { refreshing = null; throw e; });
    return refreshing;
  }
  function api(method, path, body, prefer, retried) {
    return token(retried === "force").then(function (s) {
      return fetch(API + path, { method: method, body: body === undefined ? undefined : J(body),
        headers: { apikey: CFG.key, Authorization: "Bearer " + s.access_token, "Content-Type": "application/json", Prefer: prefer || "return=representation" } });
    }).then(function (r) {
      if (r.status === 401) { if (!retried) return api(method, path, body, prefer, "force"); throw authError(); }
      if (r.status === 409) { var e = new Error("conflict"); e.conflict = true; throw e; }
      if (!r.ok) return r.text().then(function (t) { throw new Error("HTTP " + r.status + " " + t); });
      return r.text().then(function (t) { return t ? JSON.parse(t) : null; });
    });
  }

  /* ---------- sync ---------- */
  /* an account with only empty settings (e.g. first opened on another device) does not replace real data */
  function hasData(rows) {
    return rows.some(function (r) {
      if (r.part.indexOf("class_") === 0) return true;
      if (r.part === "progress") return Object.keys((r.data && r.data.lessons) || {}).length > 0;
      return !!(r.data && r.data.profile);
    });
  }
  function readMeta() { var m = parse(get(META), null); return m && m.parts ? m : { uid: null, parts: {} }; }
  var busy = false, again = false, edits = 0, timer = null, lastOk = null;

  /* one round: download what other devices changed, merge, then upload what changed here.
     Returns true when an upload hit a newer revision and another round is needed. */
  function round() {
    var s = session(), meta = readMeta(), changedHere = false;
    return api("GET", TABLE + "?select=part,rev").then(function (list) {
      var first = meta.uid !== s.uid;   // first sign-in on this device (or another account)
      var want = first ? list : list.filter(function (r) { var b = meta.parts[r.part]; return !b || b.rev !== r.rev; });
      var fetchRows = want.length
        ? api("GET", TABLE + "?select=part,rev,data&part=in.(" + want.map(function (r) { return r.part; }).join(",") + ")")
        : Promise.resolve([]);
      return fetchRows.then(function (rows) {
        var missC = get(CLS) === null, missP = get(PRG) === null;
        var local = localData(), L = split(local.c, local.p), before = canon(L);
        if (!first && (missC || missP)) {
          // a local copy is missing (never saved here, or removed): it has no changes of its own,
          // so it must never be uploaded as an empty copy — start it from the last synced version
          Object.keys(L).forEach(function (n) { if (n === "progress" ? missP : missC) delete L[n]; });
          Object.keys(meta.parts).forEach(function (n) { if (n === "progress" ? missP : missC) L[n] = meta.parts[n].data; });
        }
        if (first) {
          if (hasData(rows)) {
            // this device's old data is replaced by the account's data — keep a copy just in case
            if ((local.c.classes || []).length || Object.keys((local.p && local.p.lessons) || {}).length) put(BACKUP, J({ at: new Date().toISOString(), classroom: local.c, progress: local.p }));
            L = {};
            rows.forEach(function (r) { L[r.part] = r.data; });
          }
          // empty account: everything on this device is uploaded below (over the empty rows)
          meta = { uid: s.uid, parts: {} };
          rows.forEach(function (r) { meta.parts[r.part] = { rev: r.rev, data: r.data }; });
        } else {
          rows.forEach(function (r) {
            var b = meta.parts[r.part];
            L[r.part] = (b ? same(L[r.part], b.data) : L[r.part] === undefined) ? r.data : merge3(b ? b.data : undefined, L[r.part], r.data);
            meta.parts[r.part] = { rev: r.rev, data: r.data };
          });
          var onServer = {}; list.forEach(function (r) { onServer[r.part] = 1; });
          Object.keys(meta.parts).forEach(function (n) {   // deleted on another device
            if (onServer[n]) return;
            if (same(L[n], meta.parts[n].data)) delete L[n];
            delete meta.parts[n];
          });
        }
        if (canon(L) !== before || missC || missP) { writeLocal(L, local.c); changedHere = true; }
        put(META, J(meta));
        return upload(L, meta);
      });
    }).then(function (retry) {
      put(META, J(meta));
      if (changedHere) notify();
      return retry;
    });
  }
  function upload(L, meta) {
    var names = {}, retry = false;
    Object.keys(L).concat(Object.keys(meta.parts)).forEach(function (n) { names[n] = 1; });
    return Promise.all(Object.keys(names).map(function (n) {
      var b = meta.parts[n], data = L[n];
      if (data === undefined) {
        return api("DELETE", TABLE + "?part=eq." + n, undefined, "return=minimal").then(function () { delete meta.parts[n]; });
      }
      if (!b) {
        return api("POST", TABLE, { part: n, data: data, rev: 1 }).then(function () { meta.parts[n] = { rev: 1, data: data }; },
          function (e) { if (e.conflict) retry = true; else throw e; });
      }
      if (same(data, b.data)) return null;
      return api("PATCH", TABLE + "?part=eq." + n + "&rev=eq." + b.rev, { data: data, rev: b.rev + 1 }).then(function (rows) {
        if (rows && rows.length) meta.parts[n] = { rev: b.rev + 1, data: data }; else retry = true;   // another device saved first
      });
    })).then(function () { return retry; });
  }
  function cycle(n) {
    return round().then(function (retry) { if (retry && (n || 0) < 3) return cycle((n || 0) + 1); });
  }
  function sync() {
    if (!ON || !session()) return Promise.resolve(false);
    if (busy) { again = true; return Promise.resolve(false); }
    busy = true; clearTimeout(timer);
    var g = edits;
    setStatus(get(DIRTY) === "1" ? "saving" : status);
    return cycle().then(function () {
      lastOk = new Date();
      if (edits === g) { del(DIRTY); setStatus("ok"); } else setStatus("saving");
      return true;
    }, function (e) {
      if (e && e.auth) { setSession(null); setStatus("off"); gate("انتهت الجلسة — اكتبي كلمة المرور مرة أخرى"); }
      else { console.warn("Cloud sync failed", e); setStatus("offline"); }
      return false;
    }).then(function (ok) {
      busy = false;
      if (again || (ok && edits !== g)) { again = false; timer = setTimeout(sync, 400); }
      return ok;
    });
  }
  /* called by classroom-manager.js and progress-manager.js after every save */
  function touch() {
    if (!ON || !session()) return;
    edits++; put(DIRTY, "1"); setStatus("saving");
    clearTimeout(timer); timer = setTimeout(sync, 1200);
  }

  /* ---------- sign in / out ---------- */
  function login(password, remember) {
    return fetch(API + "/auth/v1/token?grant_type=password", {
      method: "POST", headers: { apikey: CFG.key, "Content-Type": "application/json" }, body: J({ email: CFG.email, password: password })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) { var e = new Error(d.error_description || d.msg || "login failed"); e.status = r.status; throw e; }
        return d;
      });
    }).then(function (d) {
      setSession(toSession(d), remember);
      return cycle();
    });
  }
  function logout() {
    var go = function () {
      var s = session();
      var done = function () { setSession(null); wipeLocal(); del(BACKUP); location.reload(); };
      if (!s) return done();
      fetch(API + "/auth/v1/logout", { method: "POST", headers: { apikey: CFG.key, Authorization: "Bearer " + s.access_token } }).then(done, done);
    };
    if (get(DIRTY) !== "1") return go();
    sync().then(function (ok) {
      if (ok || confirm("لم تُرفع آخر التعديلات بعد (لا يوجد اتصال). الخروج الآن يحذفها من هذا الجهاز. متابعة؟")) go();
    });
  }

  /* ---------- the password screen ---------- */
  function gate(msg) {
    ready(function () {
      var g = document.getElementById("cloudGate");
      if (!g) {
        g = document.createElement("div"); g.id = "cloudGate"; g.setAttribute("dir", "rtl");
        // lessons listen for keys (space, ت, F…) and clicks — keep them inside the form
        ["keydown", "keyup", "click", "wheel", "touchstart"].forEach(function (t) { g.addEventListener(t, function (e) { e.stopPropagation(); }); });
        document.body.appendChild(g);
      }
      document.documentElement.classList.add("cloud-locked");
      g.innerHTML =
        '<form class="cg-card" id="cgForm">' +
          '<div class="cg-ico" aria-hidden="true">🔒</div><h2>لوحة المعلمة</h2><p>اكتبي كلمة المرور للدخول</p>' +
          '<input type="email" name="username" value="' + esc(CFG.email) + '" autocomplete="username" hidden>' +
          '<input type="password" name="password" autocomplete="current-password" placeholder="كلمة المرور" aria-label="كلمة المرور" required>' +
          '<label class="cg-rem"><input type="checkbox" name="remember" checked> تذكّريني على هذا الجهاز</label>' +
          '<button type="submit">دخول</button>' +
          '<div class="cg-msg" role="alert">' + esc(msg || "") + "</div>" +
          '<small>على السبورة أو أي جهاز مشترك: أزيلي علامة «تذكّريني»، فلا تبقى البيانات بعد إغلاق الصفحة.</small>' +
        "</form>";
      var f = g.querySelector("form"), btn = f.querySelector("button"), out = f.querySelector(".cg-msg");
      setTimeout(function () { f.elements.password.focus(); }, 50);
      f.onsubmit = function (e) {
        e.preventDefault();
        btn.disabled = true; btn.textContent = "⏳ جارٍ الدخول…"; out.textContent = "";
        login(f.elements.password.value, f.elements.remember.checked).then(function () {
          btn.textContent = "✓ تم"; location.reload();
        }, function (err) {
          btn.disabled = false; btn.textContent = "دخول";
          if (err && err.auth) setSession(null);
          out.textContent = err && err.status === 400 ? "كلمة المرور غير صحيحة" :
            err && err.status === 429 ? "محاولات كثيرة — انتظري دقائق ثم حاولي مرة أخرى" :
            err && err.status ? "تعذّر الدخول (" + err.status + ")" : "لا يوجد اتصال بالإنترنت";
          f.elements.password.select();
        });
      };
    });
  }

  /* ---------- the small status button ---------- */
  var status = "ok";
  var LABEL = { ok: "☁️ محفوظ", saving: "⏳ جارٍ الحفظ…", offline: "⚠️ غير متصل", off: "🔒" };
  function setStatus(s) {
    status = s;
    var p = document.getElementById("cloudPill");
    if (!p) return;
    p.querySelector(".cp-btn").textContent = LABEL[s] || s;
    p.className = "cp-" + s + (p.classList.contains("open") ? " open" : "");
    var info = p.querySelector(".cp-info");
    if (info) info.textContent = s === "offline" ? "التعديلات محفوظة على هذا الجهاز، وتُرفع تلقائيًا عند عودة الاتصال." :
      s === "saving" ? "جارٍ رفع التعديلات…" :
      "كل البيانات محفوظة في حسابك" + (lastOk ? " • آخر مزامنة " + lastOk.toLocaleTimeString("ar-SA-u-nu-arab", { hour: "numeric", minute: "2-digit" }) : "");
  }
  function pill() {
    ready(function () {
      if (document.getElementById("cloudPill")) return;
      var p = document.createElement("div"); p.id = "cloudPill"; p.setAttribute("dir", "rtl");
      p.innerHTML = '<button class="cp-btn" type="button" title="حالة الحفظ"></button>' +
        '<div class="cp-menu"><div class="cp-info"></div><button type="button" data-cp="sync">🔄 مزامنة الآن</button><button type="button" data-cp="out">🚪 تسجيل الخروج</button></div>';
      ["keydown", "click"].forEach(function (t) { p.addEventListener(t, function (e) { e.stopPropagation(); }); });
      p.addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        if (b.classList.contains("cp-btn")) { p.classList.toggle("open"); return setStatus(status); }
        if (b.dataset.cp === "sync") { setStatus("saving"); sync(); }
        if (b.dataset.cp === "out" && confirm("تسجيل الخروج من هذا الجهاز؟ تُحذف نسخة البيانات من هذا المتصفح وتبقى في حسابك.")) logout();
      });
      document.addEventListener("click", function () { p.classList.remove("open"); });
      document.body.appendChild(p);
      setStatus(status);
    });
  }

  /* ---------- start ---------- */
  if (ON) {
    if (!session()) { status = "off"; gate(); }
    else {
      pill();
      if (get(DIRTY) === "1") status = "saving";
      ready(function () { sync(); });
      setInterval(function () { if (document.visibilityState === "visible") sync(); }, 20000);
      window.addEventListener("focus", function () { sync(); });
      window.addEventListener("online", function () { sync(); });
      document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible" || get(DIRTY) === "1") sync(); });
    }
  }

  window.Cloud = {
    enabled: ON,
    signedIn: function () { return !ON || !!session(); },
    touch: touch, syncNow: sync, logout: logout,
    _merge3: merge3, _split: split, _join: join   // for testing
  };
})();
