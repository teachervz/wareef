/* ==========================================================================
   lesson-engine.js — محرك العروض المشترك (المسرح 1600×900)
   --------------------------------------------------------------------------
   مأخوذ من محرك الدرس الأول، مع أنواع شرائح إضافية في آخر قسم TYPES.
   كل درس (lessons/lesson-NN.html) يعرّف LESSON و SLIDES فقط، ثم يحمّل:
     <link rel="stylesheet" href="../css/lesson-engine.css">
     <script src="../js/lesson-engine.js"></script>
   أنواع الشرائح: prep, flip, predict, title, list, equation, sort, cards,
   triangle, tps, order, mcq (+code), tf, brainstorm, challenge, groups,
   builder, review, exit, closing, match, table, flow, designer, blocks,
   foodapp, assistant
   ========================================================================== */
(function buildStage(){   // المسرح وشريط التحكم يُبنيان هنا فلا يحتاج ملف الدرس إليهما
  if (document.getElementById("stage")) return;
  const st = document.createElement("div"); st.id = "stage";
  st.innerHTML = `<div id="progress"></div>
  <div id="hint">Space = التالي &nbsp;|&nbsp; ← → للتنقل &nbsp;|&nbsp; ت = تصفيق &nbsp;|&nbsp; F = ملء الشاشة</div>
  <div id="slides"></div><div id="fx"></div>
  <div id="bar"><button id="nextBtn" title="التالي (→ أو Space)">→</button><span class="count" id="count">١ / ١</span><button id="prevBtn" title="السابق (←)">←</button>
    <span class="sep"></span><button class="clap" id="clapBtn" title="تصفيق (ت)">👏</button><button id="fsBtn" title="ملء الشاشة (F)">⛶</button></div>`;
  document.body.prepend(st);
})();

/* ---------- أدوات مساعدة ---------- */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const toAr = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
const LETTERS = ["أ","ب","ج","د","هـ","و"];
const shuffle = a => { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b; };
const head = d => `<div class="shead rv" style="--i:0">${d.tag?`<span class="tag">${d.tag}</span>`:""}${d.title?`<h2 class="stitle">${d.title}</h2>`:""}</div>`;
let SCALE = 1;

/* ==========================================================================
   🔊 الأصوات — مولّدة بالكامل عبر Web Audio API (بدون ملفات خارجية)
   ========================================================================== */
const Sound = {
  ctx:null, master:null, noise:null,
  init(){
    if(!this.ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = .9;
      this.master.connect(this.ctx.destination);
      // ضوضاء بيضاء تُستخدم لصوت التصفيق
      const len = this.ctx.sampleRate * 1;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for(let i=0;i<len;i++) d[i] = Math.random()*2-1;
    }
    if(this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  },
  // صفقة واحدة = ٢-٣ نبضات ضوضاء سريعة متتالية
  clapHit(t, vol){
    const c = this.ctx;
    const pulses = 2 + Math.floor(Math.random()*2);
    for(let p=0;p<pulses;p++){
      const tt = t + p*0.009;
      const src = c.createBufferSource(); src.buffer = this.noise;
      const bp = c.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value = 900 + Math.random()*1600; bp.Q.value = .9;
      const hp = c.createBiquadFilter(); hp.type="highpass"; hp.frequency.value = 500;
      const g = c.createGain();
      const v = p===pulses-1 ? vol : vol*.6;
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(v, tt+0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + (p===pulses-1 ? 0.13 : 0.03));
      src.connect(bp).connect(hp).connect(g).connect(this.master);
      src.start(tt, Math.random()*0.8); src.stop(tt+0.2);
    }
  },
  // تصفيق جماعي قصير (≈ ١.٨ ثانية)
  applause(){
    if(!this.init()) return;
    const now = this.ctx.currentTime + 0.02, dur = 1.8, n = 60;
    for(let i=0;i<n;i++){
      const r = Math.random();
      const t = now + r*dur;
      const fade = r < .75 ? 1 : (1 - (r-.75)/.25);   // يخفت في النهاية
      this.clapHit(t, (0.25 + Math.random()*0.35) * fade);
    }
  },
  tone(freq, t, dur, type="sine", vol=.25){
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t+0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t+dur+0.05);
  },
  success(){ if(!this.init()) return; const t=this.ctx.currentTime;
    [523.25,659.25,783.99,1046.5].forEach((f,i)=>{ this.tone(f,t+i*0.09,.45,"triangle",.22); this.tone(f*2,t+i*0.09,.3,"sine",.05); }); },
  wrong(){ if(!this.init()) return; const t=this.ctx.currentTime;
    this.tone(392,t,.22,"sine",.18); this.tone(311,t+.16,.35,"sine",.16); },
  pop(){ if(!this.init()) return; const t=this.ctx.currentTime;
    this.tone(660,t,.12,"sine",.15); this.tone(990,t+.05,.14,"sine",.1); },
  tick(){ if(!this.init()) return; this.tone(1200,this.ctx.currentTime,.07,"square",.05); },
  bell(){ if(!this.init()) return; const t=this.ctx.currentTime;
    [0,.35,.7].forEach(d=>{ this.tone(880,t+d,1.1,"sine",.25); this.tone(1320,t+d,.8,"sine",.08); }); }
};

/* ==========================================================================
   🎉 المؤثرات البصرية
   ========================================================================== */
const FX = {
  el: null,
  claps(){
    for(let i=0;i<16;i++){
      const s = document.createElement("span");
      s.className = "clapfx"; s.textContent = "👏";
      s.style.left = (600 + Math.random()*400) + "px";
      s.style.top  = (720 + Math.random()*60) + "px";
      s.style.setProperty("--dx", (Math.random()*500-250) + "px");
      s.style.setProperty("--r", (Math.random()*60-30) + "deg");
      s.style.animationDelay = (Math.random()*0.5) + "s";
      s.style.fontSize = (34 + Math.random()*26) + "px";
      this.el.appendChild(s); setTimeout(()=>s.remove(), 2500);
    }
  },
  confetti(x=800, y=420, n=70){
    const colors = ["#6C3FD1","#8B5CF6","#14B8A6","#F59E0B","#EC4899","#C4B5FD"];
    for(let i=0;i<n;i++){
      const p = document.createElement("i");
      p.className = "conf";
      p.style.left = x+"px"; p.style.top = y+"px";
      p.style.background = colors[i%colors.length];
      const a = Math.random()*Math.PI*2, d = 180 + Math.random()*320;
      p.style.setProperty("--x", Math.cos(a)*d + "px");
      p.style.setProperty("--y", (Math.sin(a)*d + 160) + "px");
      p.style.setProperty("--r", (Math.random()*720-360) + "deg");
      p.style.width = (8+Math.random()*10)+"px";
      this.el.appendChild(p); setTimeout(()=>p.remove(), 1400);
    }
  },
  // تحويل موقع عنصر في الشاشة إلى إحداثيات المسرح
  at(el){
    const s = $("#stage").getBoundingClientRect(), r = el.getBoundingClientRect();
    return [(r.left + r.width/2 - s.left)/SCALE, (r.top + r.height/2 - s.top)/SCALE];
  },
  message(txt){
    const m = document.createElement("div"); m.className="bigmsg"; m.innerHTML = txt;
    this.el.appendChild(m); setTimeout(()=>m.remove(), 1700);
  }
};
function celebrate(el){ const [x,y] = el ? FX.at(el) : [800,420]; FX.confetti(x,y); Sound.success(); }
function clap(){ Sound.applause(); FX.claps(); const b=$("#clapBtn"); b.animate([{transform:"scale(1)"},{transform:"scale(1.3)"},{transform:"scale(1)"}],{duration:400}); }

/* ==========================================================================
   ⏱️ المؤقت (يُستخدم في التحديات والنقاش والمجموعات)
   ========================================================================== */
class Timer{
  constructor(host, sec, ring=false){
    this.host = host; this.total = sec; this.left = sec; this.ring = ring; this.iv = null;
    const C = 2*Math.PI*130; this.C = C;
    host.innerHTML = `
      <div class="timer ${ring?"ring":""}">
        ${ring ? `<div class="ringbox"><svg width="300" height="300"><circle class="bg" cx="150" cy="150" r="130" fill="none" stroke-width="22"/>
          <circle class="fg" cx="150" cy="150" r="130" fill="none" stroke-width="22" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>
          <div class="tm-num"></div></div>` : `<div class="tm-num"></div>`}
        <div class="row c"><button class="btn sm tm-go">▶ ابدئي</button><button class="btn sm ghost tm-re">↺</button></div>
      </div>`;
    this.box = $(".timer", host);
    $(".tm-go", host).onclick = () => this.iv ? this.pause() : this.start();
    $(".tm-re", host).onclick = () => this.set(this.total);
    this.draw();
  }
  set(sec){ this.pause(); this.total = this.left = sec; this.box.classList.remove("done","warn"); this.draw(); }
  start(){ if(this.left<=0) this.set(this.total); this.box.classList.remove("done");
    this.iv = setInterval(()=>this.tick(), 1000); $(".tm-go",this.host).textContent = "⏸ إيقاف"; }
  pause(){ clearInterval(this.iv); this.iv = null; $(".tm-go",this.host).textContent = "▶ ابدئي"; }
  tick(){
    this.left--;
    if(this.left <= 10) this.box.classList.add("warn");
    if(this.left > 0 && this.left <= 5) Sound.tick();
    if(this.left <= 0){ this.left = 0; this.pause(); this.box.classList.add("done"); Sound.bell(); }
    this.draw();
  }
  draw(){
    const m = Math.floor(this.left/60), s = this.left%60;
    $(".tm-num", this.host).textContent = toAr(`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    if(this.ring) $("circle.fg", this.host).style.strokeDashoffset = this.C * (1 - this.left/this.total);
  }
}

/* ==========================================================================
   🧱 بناء الشرائح حسب النوع — كل نوع له دالة (html) ودالة تفاعل (init)
   ========================================================================== */
const TYPES = {

  /* ---------- التحضير ---------- */
  prep:{
    html:d => `
      <div class="prep">
        <div class="prep-hero card rv" style="--i:1">
          <div class="wave">👋</div>
          <h1>${d.greeting}</h1>
          <p>${d.sub}</p>
          <div class="date">${LESSON.subject}<small>${LESSON.number}: ${LESSON.title}</small></div>
        </div>
      </div>
      <div class="rules rv" style="--i:3">${d.rules.map(r=>`<span class="chip">${r}</span>`).join("")}</div>`
  },

  /* ---------- بطاقات القلب (مراجعة) ---------- */
  flip:{
    html:d => `${head(d)}
      <div class="body">
        <p class="lead muted rv" style="--i:1">${d.note||""}</p>
        <div class="flips" style="grid-template-columns:repeat(${d.cols||Math.min(4,d.cards.length)},1fr)">${d.cards.map((c,i)=>`
          <button class="flip rv" style="--i:${i+2}"><div class="flip-in">
            <div class="face front"><div class="ic float" style="animation-delay:${i*.3}s">${c.icon}</div><div class="ft">${c.front}</div><div class="tap">اضغطي للقلب 🔄</div></div>
            <div class="face back"><div class="bt">${c.back}</div>${c.ex?`<div class="ex">${c.ex}</div>`:""}</div>
          </div></button>`).join("")}
        </div>
        <div class="row c rv" style="--i:7"><button class="btn teal bbtn">${d.bridgeBtn}</button></div>
        <div class="bridge hidden-step">${d.bridge}</div>
      </div>`,
    init:(el) => {
      $$(".flip",el).forEach(f => f.onclick = () => { f.classList.toggle("on"); Sound.pop(); });
      $(".bbtn",el).onclick = e => { const b=$(".bridge",el); b.classList.add("show"); $$(".flip",el).forEach(f=>f.classList.add("on")); celebrate(b); };
    }
  },

  /* ---------- ماذا تتوقعين؟ ---------- */
  predict:{
    html:d => `${head(d)}
      <div class="predict">
        <div class="scene card rv" style="--i:1"><div class="big float">${d.icon}</div><p>${d.scenario}</p></div>
        <div class="pred-list">
          <h3 class="pred-q rv" style="--i:2">${d.question}</h3>
          ${d.answers.map(a=>`<div class="pred-item hidden-step"><span>${a.icon}</span>${a.text}</div>`).join("")}
          <div class="row rv" style="--i:3"><button class="btn rbtn">${d.revealBtn}</button></div>
          <div class="note hidden-step concl">${d.conclusion}</div>
        </div>
      </div>`,
    init:(el) => {
      const items = $$(".pred-item",el); let k = 0;
      $(".rbtn",el).onclick = () => {
        if(k < items.length){ items[k++].classList.add("show"); Sound.pop(); }
        else { const c=$(".concl",el); if(!c.classList.contains("show")){ c.classList.add("show"); celebrate(c); } }
        if(k === items.length) $(".rbtn",el).textContent = "💡 ما الحل؟";
      };
    }
  },

  /* ---------- العنوان ---------- */
  title:{
    html:d => {
      const pos = [[140,120],[1320,140],[110,560],[1340,540],[380,40],[1080,660]];
      return `<div class="titleS">
        ${(d.icons||[]).map((ic,i)=>`<span class="orbit float" style="left:${pos[i%6][0]}px;top:${pos[i%6][1]}px;animation-delay:${i*.4}s">${ic}</span>`).join("")}
        <div class="kicker rv" style="--i:0">${LESSON.subject} • ${LESSON.unit}</div>
        <div class="badge rv" style="--i:1">${LESSON.number}</div>
        <h1 class="rv" style="--i:2">${LESSON.title}</h1>
        <div class="sub rv" style="--i:3">${d.sub}</div>
        <div class="note tnote rv" style="--i:4">${d.note}</div>
      </div>`;
    }
  },

  /* ---------- قائمة (الأهداف) ---------- */
  list:{
    html:d => `${head(d)}
      <div class="body" style="justify-content:center">
        <div class="olist">${d.items.map((it,i)=>`
          <div class="oitem card rv" style="--i:${i+1}"><span class="n">${it.icon}</span>${it.text}</div>`).join("")}
        </div>
      </div>`
  },

  /* ---------- المعادلة (لاحظ واكتشف) ---------- */
  equation:{
    html:d => `${head(d)}
      <div class="body">
        <p class="lead muted center rv" style="--i:1">👆 ${d.hint}</p>
        <div class="eq rv" style="--i:2">
          ${d.parts.map((p,i)=>`${i?'<span class="eq-op">+</span>':""}<button class="eq-box"><span class="q">؟</span><span class="a"><i>${p.icon}</i><span>${p.label}</span></span></button>`).join("")}
          <span class="eq-op">=</span>
          <button class="eq-box res"><span class="q">؟</span><span class="a"><i>${d.result.icon}</i><span>${d.result.label}</span></span></button>
        </div>
        <div class="row c rv" style="--i:3"><button class="btn dbtn">${d.defBtn}</button></div>
        <div class="defbox card hidden-step">${d.definition}</div>
      </div>`,
    init:(el) => {
      const boxes = $$(".eq-box",el);
      boxes.forEach(b => b.onclick = () => {
        if(b.classList.contains("on")) return;
        b.classList.add("on"); Sound.pop();
        if(boxes.every(x=>x.classList.contains("on"))) celebrate(b);
      });
      $(".dbtn",el).onclick = () => { boxes.forEach(b=>b.classList.add("on")); $(".defbox",el).classList.add("show"); Sound.pop(); };
    }
  },

  /* ---------- التصنيف ---------- */
  sort:{
    html:d => `${head(d)}
      <div class="body">
        <div class="row rv" style="--i:1" >
          <p class="lead" style="flex:1">${d.question}</p>
          <span class="score">✅ <span class="sc">٠</span> / ${toAr(d.items.length)}</span>
        </div>
        <div class="sort-grid">${d.items.map((it,i)=>`
          <div class="sitem card rv" style="--i:${i+2}" data-cat="${it.cat}">
            <div class="si">${it.icon}</div><div class="st">${it.text}</div>
            <div class="sb">${d.cats.map(c=>`<button data-c="${c.id}">${c.icon} ${c.label}</button>`).join("")}</div>
            <div class="done">${(d.cats.find(c=>c.id===it.cat)||{}).icon} ${(d.cats.find(c=>c.id===it.cat)||{}).label}</div>
          </div>`).join("")}
        </div>
        <div class="note hidden-step dmsg center">${d.doneMsg||"🎉 أحسنتِ!"}</div>
      </div>`,
    init:(el,d) => {
      let score = 0;
      $$(".sitem",el).forEach(it => {
        $$(".sb button",it).forEach(b => b.onclick = () => {
          if(b.dataset.c === it.dataset.cat){
            it.classList.add("ok", it.dataset.cat === d.cats[0].id ? "ca" : "cb");
            score++; $(".sc",el).textContent = toAr(score); Sound.pop();
            if(score === d.items.length){ $(".dmsg",el).classList.add("show"); celebrate($(".dmsg",el)); FX.message("أحسنتِ! 👏"); }
          } else {
            b.classList.add("x"); it.classList.remove("shake"); void it.offsetWidth; it.classList.add("shake"); Sound.wrong();
            setTimeout(()=>b.classList.remove("x"), 700);
          }
        });
      });
    }
  },

  /* ---------- بطاقات قابلة للنقر ---------- */
  cards:{
    html:d => `${head(d)}
      <div class="body">
        ${d.intro?`<p class="lead rv" style="--i:1">${d.intro}</p>`:""}
        ${d.chips?`<div class="chips rv" style="--i:2">${d.chips.map((c,i)=>`${i?'<span style="font-size:28px;color:var(--p2)">←</span>':""}<span class="chip">${c}</span>`).join("")}</div>`:""}
        ${d.sub?`<p class="lead rv" style="--i:3;font-weight:800">${d.sub}</p>`:""}
        <div class="cgrid" style="grid-template-columns:repeat(${d.cols||3},1fr)">
          ${d.cards.map((c,i)=>`<button class="ccard card rv" style="--i:${i+3}"><div class="ci">${c.icon}</div><div class="ct">${c.title}</div><div class="cx">${c.text}</div><div class="tap">اضغطي 👆</div></button>`).join("")}
        </div>
        <div class="row" style="justify-content:space-between">
          ${d.footer?`<div class="note rv" style="--i:9;flex:1">${d.footer}</div>`:"<span></span>"}
          <button class="btn sm ghost allbtn rv" style="--i:9">👁️ إظهار الكل</button>
        </div>
      </div>`,
    init:(el) => {
      $$(".ccard",el).forEach(c => c.onclick = () => { c.classList.toggle("open"); Sound.pop(); });
      $(".allbtn",el).onclick = () => { $$(".ccard",el).forEach(c=>c.classList.add("open")); Sound.pop(); };
    }
  },

  /* ---------- مثلث إدارة المشروع ---------- */
  triangle:{
    html:d => `${head(d)}
      <div class="tri">
        <div class="tri-wrap rv" style="--i:1">
          <svg viewBox="0 0 620 500"><defs><marker id="ah" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#8B5CF6"/></marker></defs>
            <polygon points="310,70 535,420 85,420" fill="rgba(139,92,246,.06)" stroke="#8B5CF6" stroke-width="5" stroke-dasharray="14 10" stroke-linejoin="round"/></svg>
          <button class="tnode" data-k="scope" style="left:310px;top:70px"><i>${d.nodes.scope.icon}</i>${d.nodes.scope.label}</button>
          <button class="tnode" data-k="time"  style="left:535px;top:420px"><i>${d.nodes.time.icon}</i>${d.nodes.time.label}</button>
          <button class="tnode" data-k="cost"  style="left:85px;top:420px"><i>${d.nodes.cost.icon}</i>${d.nodes.cost.label}</button>
          <div class="tcenter">${d.center}</div>
        </div>
        <div>
          <div class="tinfo card rv" style="--i:2"><p style="margin:0" class="muted">${d.startText}</p></div>
          <div class="lab card rv" style="--i:3">
            <h4>${d.labTitle}</h4>
            <input type="range" min="1" max="5" value="1" class="rng">
            <div class="barrow"><span>🎯 النطاق</span><div class="bartrack"><div class="barfill b1" style="background:var(--p)"></div></div><span class="v1"></span></div>
            <div class="barrow"><span>⏰ الزمن</span><div class="bartrack"><div class="barfill b2" style="background:var(--ac)"></div></div><span class="v2"></span></div>
            <div class="barrow"><span>💰 التكلفة</span><div class="bartrack"><div class="barfill b3" style="background:var(--am)"></div></div><span class="v3"></span></div>
            <div class="note hidden-step lnote" style="margin-top:12px;font-size:24px">${d.labNote}</div>
          </div>
        </div>
      </div>`,
    init:(el,d) => {
      $$(".tnode",el).forEach(n => n.onclick = () => {
        $$(".tnode",el).forEach(x=>x.classList.remove("on")); n.classList.add("on");
        const nd = d.nodes[n.dataset.k];
        const box = $(".tinfo",el);
        box.innerHTML = `<h3>${nd.icon} ${nd.label}</h3><div>${nd.text}</div>`;
        box.animate([{opacity:0,transform:"translateY(12px)"},{opacity:1,transform:"none"}],{duration:400});
        Sound.pop();
      });
      const labels = ["صغير","متوسط","كبير","كبير جدًا","ضخم"];
      const rng = $(".rng",el);
      const upd = () => {
        const v = +rng.value;
        $(".b1",el).style.width = v*20+"%";
        $(".b2",el).style.width = (12+v*17.6)+"%";
        $(".b3",el).style.width = (10+v*18)+"%";
        $(".v1",el).textContent = labels[v-1];
        $(".v2",el).textContent = toAr(v*2) + " أسابيع";
        $(".v3",el).textContent = toAr(v*1000) + " ريال";
        if(v>=3) $(".lnote",el).classList.add("show");
      };
      rng.oninput = upd; rng.onchange = () => rng.blur(); upd();
    }
  },

  /* ---------- فكّري – زاوجي – شاركي ---------- */
  tps:{
    html:d => `${head(d)}
      <div class="body">
        <div class="tps-q card rv" style="--i:1">${d.question}</div>
        <div class="tps-row">
          ${d.phases.map((p,i)=>`<button class="phase card rv" style="--i:${i+2}" data-s="${p.sec}"><i>${p.icon}</i>${p.label}<small>⏱️ ${toAr(Math.round(p.sec/60*10)/10)} دقيقة</small></button>`).join("")}
          <div class="card rv tbox" style="--i:5"></div>
        </div>
        <div class="row c rv" style="--i:6"><button class="btn teal abtn">${d.answerBtn}</button></div>
        <div class="cmp hidden-step">${d.answer.map(a=>`<div class="col card"><h4>${a.title}</h4><ul>${a.points.map(p=>`<li>${p}</li>`).join("")}</ul></div>`).join("")}</div>
      </div>`,
    init:(el,d) => {
      const t = new Timer($(".tbox",el), d.phases[0].sec);
      $$(".phase",el).forEach(p => p.onclick = () => {
        $$(".phase",el).forEach(x=>x.classList.remove("on")); p.classList.add("on");
        t.set(+p.dataset.s); t.start(); Sound.pop();
      });
      $(".abtn",el).onclick = () => { const c=$(".cmp",el); c.classList.add("show"); Sound.pop(); };
    }
  },

  /* ---------- لعبة الترتيب ---------- */
  order:{
    html:d => `${head(d)}
      <div class="body">
        <div class="row rv" style="--i:1"><p class="lead" style="flex:1">${d.question}</p><button class="btn sm ghost resetO">↺ إعادة</button></div>
        <div class="slots rv" style="--i:2">${d.steps.map((s,i)=>`${i?'<span class="arrow">←</span>':""}<div class="slot"><span class="sn">${toAr(i+1)}</span><span class="sl"></span><span class="sd"></span></div>`).join("")}</div>
        <div class="feedback ofb"></div>
        <div class="pool rv" style="--i:3"></div>
      </div>`,
    init:(el,d) => {
      const pool = $(".pool",el), slots = $$(".slot",el), fb = $(".ofb",el);
      let next = 0;
      const build = () => {
        next = 0; fb.innerHTML = "";
        slots.forEach(s=>{ s.classList.remove("fill"); $(".sl",s).textContent=""; $(".sd",s).textContent=""; });
        let order = shuffle(d.steps.map((_,i)=>i));
        while(order.every((v,i)=>v===i) && d.steps.length>1) order = shuffle(order);
        pool.innerHTML = order.map(i=>`<button data-i="${i}">${d.steps[i].icon} ${d.steps[i].label}</button>`).join("");
        $$("button",pool).forEach(b => b.onclick = () => {
          const i = +b.dataset.i;
          if(i === next){
            const s = slots[next]; s.classList.add("fill");
            $(".sl",s).textContent = d.steps[i].icon + " " + d.steps[i].label;
            $(".sd",s).textContent = d.steps[i].desc || "";
            b.classList.add("used"); next++; Sound.pop(); fb.innerHTML = "";
            if(next === d.steps.length){ fb.innerHTML = `<span class="ok">أحسنتِ! 👏 ترتيب صحيح</span>`; celebrate(fb); }
          } else {
            b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake"); Sound.wrong();
            fb.innerHTML = `<span class="no">حاولي مرة أخرى 💜 ما المرحلة رقم ${toAr(next+1)}؟</span>`;
          }
        });
      };
      $(".resetO",el).onclick = build; build();
    }
  },

  /* ---------- اختيار من متعدد ---------- */
  mcq:{
    html:d => `${head(d)}
      <div class="body">
        <div class="mcq-q card rv" style="--i:1">${d.icon?`<span class="qi float">${d.icon}</span>`:""}<span>${d.question}${d.code?blk(d.code,"inq"):""}</span></div>
        <div class="opts">${d.options.map((o,i)=>`
          <button class="opt rv" style="--i:${i+2}" data-i="${i}"><span class="oi">${o.icon||LETTERS[i]}</span><span>${o.text}</span></button>`).join("")}
        </div>
        <div class="feedback mfb"></div>
        ${d.explain?`<div class="explain hidden-step">${d.explain}</div>`:""}
      </div>`,
    init:(el,d) => {
      const fb = $(".mfb",el);
      let solved = false;
      $$(".opt",el).forEach(o => o.onclick = () => {
        if(solved) return;
        if(+o.dataset.i === d.correct){
          solved = true; o.classList.add("right");
          fb.innerHTML = `<span class="ok">أحسنتِ! 👏 إجابة صحيحة</span>`;
          const ex = $(".explain",el); if(ex) ex.classList.add("show");
          celebrate(o);
        } else {
          o.classList.add("wrong"); o.classList.remove("shake"); void o.offsetWidth; o.classList.add("shake");
          fb.innerHTML = `<span class="no">حاولي مرة أخرى 💜</span>`; Sound.wrong();
        }
      });
    }
  },

  /* ---------- صح أم خطأ ---------- */
  tf:{
    html:d => `${head(d)}
      <div class="body">
        <div class="tf-list${d.compact?" compact":""}">${d.items.map((it,i)=>`
          <div class="tf card rv" style="--i:${i+1}" data-a="${it.answer}">
            <div><span class="tt">${toAr(i+1+(d.start||0))}. ${it.text}</span>${it.fix?`<span class="fix hidden-step">✏️ التصحيح: ${it.fix}</span>`:""}</div>
            <div class="tb"><button class="t" data-v="true">✔ صح</button><button class="f" data-v="false">✖ خطأ</button></div>
          </div>`).join("")}
        </div>
        <div class="feedback tfb"></div>
      </div>`,
    init:(el,d) => {
      let score = 0; const rows = $$(".tf",el);
      rows.forEach(r => $$(".tb button",r).forEach(b => b.onclick = () => {
        if(r.classList.contains("ok")) return;
        if(b.dataset.v === r.dataset.a){
          r.classList.add("ok"); b.classList.add("sel"); Sound.pop(); score++;
          const fx = $(".fix",r); if(fx) fx.classList.add("show");
          if(score === rows.length){ $(".tfb",el).innerHTML = `<span class="ok">أحسنتِ! 👏 أجبتِ عن جميع العبارات</span>`; celebrate($(".tfb",el)); }
        } else {
          b.classList.add("x"); r.classList.remove("shake"); void r.offsetWidth; r.classList.add("shake"); Sound.wrong();
          $(".tfb",el).innerHTML = `<span class="no">حاولي مرة أخرى 💜</span>`;
          setTimeout(()=>b.classList.remove("x"),700);
        }
      }));
    }
  },

  /* ---------- العصف الذهني ---------- */
  brainstorm:{
    html:d => `${head(d)}
      <div class="body">
        <div class="storm rv" style="--i:1"><div class="storm-center">${d.center}</div></div>
        <div class="storm-in rv" style="--i:2">
          <input type="text" placeholder="${d.placeholder}" maxlength="34">
          <button class="btn addI">➕ أضيفي</button>
          <button class="btn teal seedI">${d.seedBtn}</button>
          <button class="btn sm ghost clrI">↺</button>
        </div>
      </div>`,
    init:(el,d) => {
      const area = $(".storm",el), inp = $("input",el);
      let n = 0, seedK = 0;
      // أماكن الأفكار: عمودان على الجانبين + أعلى وأسفل الفكرة المركزية
      const SLOTS = [[84,12],[16,12],[84,31],[16,31],[84,50],[16,50],[84,69],[16,69],[84,88],[16,88],[50,9],[50,91]];
      const place = () => {
        const W = area.clientWidth || 1420, H = area.clientHeight || 520;
        const [px,py] = SLOTS[n % SLOTS.length], ring = Math.floor(n / SLOTS.length);
        n++;
        return [W*px/100 + (px<50? ring*30 : -ring*30), H*py/100 + ring*14];
      };
      const add = (txt, book=false) => {
        if(!txt.trim()) return;
        const [x,y] = place();
        const s = document.createElement("div");
        s.className = "idea" + (book?" book":""); s.textContent = txt;
        s.style.left = x+"px"; s.style.top = y+"px";
        area.appendChild(s); Sound.pop();
      };
      $(".addI",el).onclick = () => { add(inp.value); inp.value=""; inp.focus(); };
      inp.addEventListener("keydown", e => { if(e.key==="Enter"){ add(inp.value); inp.value=""; } e.stopPropagation(); });
      $(".seedI",el).onclick = () => { if(seedK < d.seeds.length) add(d.seeds[seedK++], true); if(seedK===d.seeds.length) $(".seedI",el).disabled=true; };
      $(".clrI",el).onclick = () => { $$(".idea",area).forEach(x=>x.remove()); n=0; seedK=0; $(".seedI",el).disabled=false; };
    }
  },

  /* ---------- تحدي الدقيقة ---------- */
  challenge:{
    html:d => `${head(d)}
      <div class="chal">
        <div class="rv" style="--i:1"><div class="tbox"></div></div>
        <div style="display:flex;flex-direction:column;gap:20px">
          <div class="chal-task card rv" style="--i:2">${d.task}</div>
          <div class="counter card rv" style="--i:3;padding:10px">
            عدد الإجابات:
            <button class="btn sm ghost cminus">−</button><span class="cn">٠</span><button class="btn sm cplus">+</button>
          </div>
          <div class="row rv" style="--i:4"><button class="btn teal ansB">${d.answersBtn}</button></div>
          <div class="ans-grid">${d.answers.map(a=>`<span class="chip hidden-step">${a}</span>`).join("")}</div>
        </div>
      </div>`,
    init:(el,d) => {
      new Timer($(".tbox",el), d.seconds, true);
      let c = 0; const cn = $(".cn",el);
      $(".cplus",el).onclick = () => { c++; cn.textContent = toAr(c); Sound.pop(); };
      $(".cminus",el).onclick = () => { c=Math.max(0,c-1); cn.textContent = toAr(c); };
      $(".ansB",el).onclick = () => { $$(".ans-grid .chip",el).forEach((x,i)=>setTimeout(()=>{x.classList.add("show");Sound.pop();}, i*180)); };
    }
  },

  /* ---------- التعلم التعاوني ---------- */
  groups:{
    html:d => `${head(d)}
      <div class="body">
        <p class="lead rv" style="--i:1">${d.scenario}</p>
        <div class="groups" style="grid-template-columns:repeat(${d.groups.length},1fr)">${d.groups.map((g,i)=>`
          <div class="grp card rv" style="--i:${i+2};--c:${g.color}"><i class="float" style="animation-delay:${i*.3}s">${g.icon}</i><h4>${g.name}</h4><p>${g.task}</p></div>`).join("")}
        </div>
        <div class="gfoot">
          <div class="rv" style="--i:6"><p class="lead" style="font-weight:800;margin-bottom:10px">${d.teamworkTitle||"🤝 لماذا نعمل كفريق؟"}</p>
            <div class="chips">${d.teamwork.map(t=>`<span class="chip">${t}</span>`).join("")}</div></div>
          <div class="card rv tbox" style="--i:7"></div>
        </div>
      </div>`,
    init:(el,d) => { new Timer($(".tbox",el), d.minutes*60); }
  },

  /* ---------- تطبيق عملي: بطاقة المشروع ---------- */
  builder:{
    html:d => `${head(d)}
      <p class="lead rv" style="--i:1;margin-bottom:18px;font-size:27px">${d.scenario}</p>
      <div class="builder">
        <div class="fields">${d.fields.map((f,i)=>`
          <label class="field rv" style="--i:${i+2}"><span>${f.icon} ${f.label}</span><input data-k="${f.key}" placeholder="${f.ph}" maxlength="40"></label>`).join("")}
          <div class="row rv" style="--i:8"><button class="btn apB">${d.approveBtn}</button><button class="btn sm ghost rsB">↺ مسح</button></div>
        </div>
        <div class="pcard card rv" style="--i:3">
          <h3 class="pv-name">📁 اسم المشروع</h3>
          <div class="pstats">
            <div class="pstat"><i>🎯</i><b>النطاق</b><span class="pv-scope">…</span></div>
            <div class="pstat"><i>⏰</i><b>الزمن</b><span class="pv-time">…</span></div>
            <div class="pstat"><i>💰</i><b>التكلفة</b><span class="pv-cost">…</span></div>
          </div>
          <div class="center" style="font-size:22px;font-weight:800;color:var(--mut)">👥 أصحاب المصلحة</div>
          <div class="stk pv-stake"></div>
          <div class="stamp">✅ تم اعتماد خطة المشروع — أحسنتِ!</div>
        </div>
      </div>`,
    init:(el) => {
      const card = $(".pcard",el);
      const upd = () => {
        const v = k => ($(`input[data-k="${k}"]`,el)||{}).value || "";
        $(".pv-name",el).textContent = "📁 " + (v("name") || "اسم المشروع");
        $(".pv-scope",el).textContent = v("scope") || "…";
        $(".pv-time",el).textContent  = v("time")  || "…";
        $(".pv-cost",el).textContent  = v("cost")  || "…";
        $(".pv-stake",el).innerHTML = v("stake").split(/[،,]/).map(s=>s.trim()).filter(Boolean).map(s=>`<span class="chip">${s}</span>`).join("");
        card.classList.remove("approved");
      };
      $$("input",el).forEach(i => { i.oninput = upd; i.addEventListener("keydown", e => e.stopPropagation()); });
      $(".apB",el).onclick = () => { card.classList.add("approved"); celebrate(card); FX.message("خطة رائعة! 👏"); };
      $(".rsB",el).onclick = () => { $$("input",el).forEach(i=>i.value=""); upd(); };
    }
  },

  /* ---------- المراجعة (خريطة ذهنية) ---------- */
  review:{
    html:d => {
      const half = Math.ceil(d.branches.length/2);
      const br = (b,i) => `<button class="branch card rv" style="--i:${i+2}"><div class="bh"><span>${b.icon}</span>${b.label}</div><div class="bp">${b.points}</div></button>`;
      return `${head(d)}
      <div class="mind">
        <div class="mcol">${d.branches.slice(0,half).map((b,i)=>br(b,i)).join("")}</div>
        <div class="mcore rv" style="--i:1">${d.center}</div>
        <div class="mcol">${d.branches.slice(half).map((b,i)=>br(b,i+half)).join("")}</div>
      </div>
      <div class="row c"><button class="btn sm ghost allR">👁️ إظهار الكل</button></div>`;
    },
    init:(el) => {
      $$(".branch",el).forEach(b => b.onclick = () => { b.classList.toggle("open"); Sound.pop(); });
      $(".allR",el).onclick = () => $$(".branch",el).forEach(b=>b.classList.add("open"));
    }
  },

  /* ---------- التقييم الفوري ---------- */
  exit:{
    html:d => `${head(d)}
      <div class="exit">
        <div class="votes card rv" style="--i:1">
          <p class="lead muted" style="margin:0 0 6px;font-size:24px">اضغطي على الوجه عدد الطالبات الرافعات أيديهن ✋</p>
          ${d.levels.map(l=>`<button class="vote"><span class="ve">${l.emoji}</span><span class="vl">${l.label}</span><div class="bartrack"><div class="barfill" style="width:0;background:linear-gradient(90deg,var(--p2),var(--p))"></div></div><span class="vc">٠</span></button>`).join("")}
          <div class="row"><button class="btn sm ghost rsV">↺ تصفير</button></div>
        </div>
        <div class="ticket card rv" style="--i:2"><h3>${d.ticket.title}</h3>${d.ticket.items.map(t=>`<div>${t}</div>`).join("")}</div>
      </div>`,
    init:(el) => {
      const votes = $$(".vote",el); const counts = votes.map(()=>0);
      const draw = () => { const mx = Math.max(1,...counts);
        votes.forEach((v,i)=>{ $(".vc",v).textContent = toAr(counts[i]); $(".barfill",v).style.width = (counts[i]/mx*100)+"%"; }); };
      votes.forEach((v,i) => v.onclick = () => { counts[i]++; draw(); Sound.pop(); });
      $(".rsV",el).onclick = () => { counts.fill(0); draw(); };
    }
  },

  /* ---------- الختام ---------- */
  closing:{
    html:d => `
      <div class="closing">
        <div class="trophy rv" style="--i:0">${d.emoji}</div>
        <h1 class="rv" style="--i:1">${d.title}</h1>
        <p class="rv" style="--i:2">${d.message}</p>
        <div class="note rv" style="--i:3">${d.homework}</div>
        <button class="btn rv clapBig" style="--i:4;font-size:30px;background:linear-gradient(135deg,var(--am),#F97316);box-shadow:0 7px 0 #B45309">${d.clapHint}</button>
      </div>`,
    init:(el) => { $(".clapBig",el).onclick = () => { clap(); FX.confetti(800,300,90); }; }
  }
};


/* ==========================================================================
   🧩 أنواع شرائح إضافية (للدروس ٤–١١)
   match • table • flow • designer • blocks • foodapp • assistant
   ========================================================================== */
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const okMsg = t => `<span class="ok">${t || "أحسنتِ! 👏 إجابة صحيحة"}</span>`;
const noMsg = t => `<span class="no">${t || "حاولي مرة أخرى 💜"}</span>`;
function shakeEl(el){ el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }

/* لبنات مطوّر التطبيقات MIT — تُرسم بألوانها (من اليسار لليمين كما في البرنامج)
   سطر اللبنة: {t:"النص", c:"event|control|var|list|text|logic|comp|math", ind:مستوى الإزاحة} */
const bidi = s => String(s).replace(/"[^"]*"/g, m => `<bdi>${m}</bdi>`);   // كل نص بين علامتي تنصيص يبقى في مكانه
function blk(lines, cls=""){
  return `<div class="blkset ${cls}" dir="ltr">${lines.map((l,i)=>`<div class="blk b-${l.c||"control"}" data-n="${i}" style="margin-left:${(l.ind||0)*34}px">${bidi(l.t)}</div>`).join("")}</div>`;
}

Object.assign(TYPES, {

  /* ---------- مطابقة: اضغطي عنصرًا من العمود الأول ثم ما يناسبه ---------- */
  match:{
    html:d => {
      const order = shuffle(d.pairs.map((_,i)=>i));
      return `${head(d)}
      <div class="body">
        <p class="lead rv" style="--i:1">${d.question || "اضغطي على عنصر من العمود الأول، ثم على ما يناسبه في العمود الثاني"}</p>
        <div class="mt rv" style="--i:2">
          <div class="mt-col">${d.pairs.map((p,i)=>`<button class="mt-i mt-a${p.code?" code":""}" data-i="${i}">${p.code ? blk(p.code,"mini") : p.a}</button>`).join("")}</div>
          <div class="mt-col">${order.map(i=>`<button class="mt-i mt-b" data-i="${i}">${d.pairs[i].b}</button>`).join("")}</div>
        </div>
        <div class="feedback mfb"></div>
        ${d.explain?`<div class="note hidden-step mex">${d.explain}</div>`:""}
      </div>`;
    },
    init:(el,d) => {
      let a = null, b = null, done = 0; const fb = $(".mfb",el);
      const COL = ["#6C3FD1","#14B8A6","#F59E0B","#EC4899","#0EA5E9","#10B981","#F43F5E","#8B5CF6"];
      const tryPair = () => {
        if(!a || !b) return;
        const x = a, y = b; a = b = null; x.classList.remove("sel"); y.classList.remove("sel");
        if(x.dataset.i === y.dataset.i){
          const c = COL[done % COL.length]; done++;
          [x,y].forEach(e => { e.classList.add("ok"); e.style.setProperty("--mc", c); e.dataset.badge = toAr(done); });
          Sound.pop(); fb.innerHTML = okMsg("صحيح 👏");
          if(done === d.pairs.length){ fb.innerHTML = okMsg("أحسنتِ! 👏 أكملتِ المطابقة"); const ex=$(".mex",el); if(ex) ex.classList.add("show"); celebrate(fb); }
        } else { shakeEl(x); shakeEl(y); Sound.wrong(); fb.innerHTML = noMsg(); }
      };
      $$(".mt-a",el).forEach(e => e.onclick = () => { if(e.classList.contains("ok")) return; $$(".mt-a",el).forEach(z=>z.classList.remove("sel")); a = e; e.classList.add("sel"); tryPair(); });
      $$(".mt-b",el).forEach(e => e.onclick = () => { if(e.classList.contains("ok")) return; $$(".mt-b",el).forEach(z=>z.classList.remove("sel")); b = e; e.classList.add("sel"); tryPair(); });
    }
  },

  /* ---------- جدول مقارنة يُكشف صفًّا صفًّا ---------- */
  table:{
    html:d => `${head(d)}
      <div class="body">
        ${d.intro?`<p class="lead rv" style="--i:1">${d.intro}</p>`:""}
        <table class="ctable card rv" style="--i:2"><thead><tr>${d.cols.map(c=>`<th>${c}</th>`).join("")}</tr></thead>
          <tbody>${d.rows.map(r=>`<tr class="trow"><th>${r.k}</th>${r.v.map(v=>`<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table>
        <div class="row c rv" style="--i:3"><button class="btn tnext">▶ الصف التالي</button><button class="btn sm ghost tall">👁️ إظهار الكل</button></div>
        ${d.note?`<div class="note hidden-step tnote">${d.note}</div>`:""}
      </div>`,
    init:(el) => {
      const rows = $$(".trow",el); let k = 0;
      const step = () => { if(k < rows.length){ rows[k++].classList.add("show"); Sound.pop(); }
        if(k === rows.length){ $(".tnext",el).disabled = true; const n=$(".tnote",el); if(n) n.classList.add("show"); } };
      $(".tnext",el).onclick = step; $(".tall",el).onclick = () => { while(k < rows.length) step(); };
    }
  },

  /* ---------- بناء مخطط سير العمل: اختاري الشكل المناسب لكل خطوة ---------- */
  flow:{
    html:d => {
      const SH = [["start","⬭","البداية أو النهاية"],["process","▭","العملية"],["decision","◇","القرار"],["document","🗎","المستند"],["io","▱","الإدخال أو الإخراج"]];
      return `${head(d)}
      <div class="flow">
        <div class="fl-side">
          <p class="lead rv" style="--i:1;font-size:24px">${d.question || "ما الشكل المناسب لهذه الخطوة في مُخطّط سير العمل؟"}</p>
          <div class="fl-step card rv" style="--i:2"><small>الخطوة <b class="fl-n">١</b> من ${toAr(d.steps.length)}</small><div class="fl-t"></div></div>
          <div class="fl-shapes rv" style="--i:3">${SH.map(s=>`<button class="fl-sh" data-s="${s[0]}"><span class="fs fs-${s[0]}"></span>${s[2]}</button>`).join("")}</div>
          <div class="feedback ffb" style="min-height:50px;font-size:26px"></div>
        </div>
        <div class="fl-canvas card scrollable rv" style="--i:2"><div class="fl-title">${d.diagramTitle||"مُخطّط سير العمل"}</div><div class="fl-nodes"></div></div>
      </div>`;
    },
    init:(el,d) => {
      let k = 0; const nodes = $(".fl-nodes",el), fb = $(".ffb",el), cv = $(".fl-canvas",el);
      const show = () => { if(k < d.steps.length){ $(".fl-n",el).textContent = toAr(k+1); $(".fl-t",el).innerHTML = d.steps[k].text; } };
      show();
      $$(".fl-sh",el).forEach(b => b.onclick = () => {
        if(k >= d.steps.length) return;
        const st = d.steps[k];
        if(b.dataset.s !== st.shape){ shakeEl(b); Sound.wrong(); fb.innerHTML = noMsg(st.hint || "حاولي مرة أخرى 💜 فكّري: ماذا تمثل هذه الخطوة؟"); return; }
        if(st.branch){   // فرع جانبي (مثل «لا ← تقرير الخطأ») يُرسم بجانب الخطوة السابقة
          const last = nodes.lastElementChild;
          last.insertAdjacentHTML("beforeend", `<div class="fl-branch"><span class="bl">${st.via||""} ←</span><div class="nd nd-${st.shape} sm"><span>${st.text}</span></div></div>`);
        } else {
          if(k) nodes.insertAdjacentHTML("beforeend", `<div class="fl-arrow">${st.via?`<span>${st.via}</span>`:""}</div>`);
          nodes.insertAdjacentHTML("beforeend", `<div class="fl-node"><div class="nd nd-${st.shape}"><span>${st.text}</span></div>${st.side?`<div class="fl-side-note">${st.side}</div>`:""}</div>`);
        }
        cv.scrollTop = cv.scrollHeight; k++; Sound.pop(); fb.innerHTML = okMsg("صحيح 👏");
        if(k === d.steps.length){ $(".fl-step",el).innerHTML = `<div class="fl-t">🎉 اكتمل المُخطّط!</div>`; fb.innerHTML = okMsg(d.doneMsg || "أحسنتِ! 👏 أكملتِ مُخطّط سير العمل"); celebrate(fb); }
        else show();
      });
    }
  },

  /* ---------- مصمّم الواجهات: محاكي صفحة Designer في مطوّر التطبيقات MIT ---------- */
  designer:{
    html:d => `${head(d)}
      <div class="dz">
        <div class="dz-pal card rv" style="--i:1">
          <h4>🧰 Palette <small>اللوحة</small></h4>
          ${["Button","Label","Image","ListPicker","TextBox"].filter(t=>!d.palette||d.palette.includes(t)).map(t=>`<button class="dz-add" data-t="${t}">${({Button:"🔘",Label:"🔤",Image:"🖼️",ListPicker:"📋",TextBox:"⌨️"})[t]} ${t}</button>`).join("")}
          <h4 style="margin-top:12px">🌳 Components <small>المكونات</small></h4>
          <div class="dz-tree"></div>
        </div>
        <div class="dz-phone rv" style="--i:2"><div class="ph"><div class="ph-bar"><span class="ph-title"></span></div><div class="ph-screen"></div></div></div>
        <div class="dz-right">
          <div class="dz-mis card scrollable rv" style="--i:3"><h4>🎯 المهام</h4><div class="dz-ml"></div></div>
          <div class="dz-props card scrollable rv" style="--i:4"></div>
        </div>
      </div>`,
    init:(el,d) => {
      const S = { title:"Screen1", align:"left", valign:"top", bg:"#FFFFFF", bgImage:"", comps:[], sel:"screen", n:{} };
      const COLORS = [["#FFFFFF","أبيض"],["#C8E6C9","أخضر فاتح"],["#BBDEFB","أزرق فاتح"],["#FFF59D","أصفر"],["#F8BBD0","وردي"],["#2E7D32","أخضر"],["#6C3FD1","بنفسجي"],["#000000","أسود"]];
      const PICS = ["🥗","🍎","🐟","🥛","🌰","🍞","🏛️","🕌"];
      const opt = (list,v) => list.map(([k,t])=>`<option value="${k}"${k===v?" selected":""}>${t}</option>`).join("");
      const comp = id => S.comps.find(c=>c.id===id);
      const missions = d.missions || [];
      const done = new Set();
      const test = m => {
        const C = S.comps;
        switch(m.test){
          case "title": return S.title.trim() === m.value;
          case "align": return S.align === m.value;
          case "valign": return S.valign === m.value;
          case "bgImage": return !!S.bgImage;
          case "screenBg": return S.bg !== "#FFFFFF";
          case "has": return C.filter(c=>c.type===m.value).length >= (m.count||1);
          case "name": return C.some(c=>c.name === m.value);
          case "text": return C.some(c=>(c.text||"").trim() === m.value);
          case "bold": return C.some(c=>c.type===m.value && c.bold);
          case "color": return C.some(c=>c.type===m.value && c.bg !== "#E0E0E0");
          case "pic": return C.some(c=>c.type==="Image" && c.pic);
          default: return false;
        }
      };
      const draw = () => {
        // الشجرة
        $(".dz-tree",el).innerHTML = `<button class="dz-node${S.sel==="screen"?" on":""}" data-id="screen">📱 Screen1</button>` +
          S.comps.map(c=>`<button class="dz-node child${S.sel===c.id?" on":""}" data-id="${c.id}">↳ ${esc(c.name)}</button>`).join("");
        // الهاتف
        $(".ph-title",el).textContent = S.title;
        const sc = $(".ph-screen",el); sc.style.background = S.bg; sc.style.alignItems = ({left:"flex-start",center:"center",right:"flex-end"})[S.align];
        sc.style.justifyContent = ({top:"flex-start",center:"center",bottom:"flex-end"})[S.valign];
        sc.dataset.bgimg = S.bgImage || "";
        sc.innerHTML = S.comps.length ? S.comps.map(c => {
          const st = `font-weight:${c.bold?900:500};color:${c.color};font-size:${c.size}px`;
          if(c.type==="Button"||c.type==="ListPicker") return `<div class="ph-btn${S.sel===c.id?" sel":""}" data-id="${c.id}" style="${st};background:${c.bg}">${esc(c.text)}</div>`;
          if(c.type==="Label") return `<div class="ph-lbl${S.sel===c.id?" sel":""}" data-id="${c.id}" style="${st}">${esc(c.text)}</div>`;
          if(c.type==="TextBox") return `<div class="ph-tb${S.sel===c.id?" sel":""}" data-id="${c.id}">${esc(c.text)||"<i>Hint for TextBox</i>"}</div>`;
          return `<div class="ph-img${S.sel===c.id?" sel":""}" data-id="${c.id}">${c.pic||"🖼️"}</div>`;
        }).join("") : `<div class="ph-empty">اضغطي على مكوّن من اللوحة لإضافته إلى الشاشة</div>`;
        // الخصائص
        const p = $(".dz-props",el);
        if(S.sel === "screen"){
          p.innerHTML = `<h4>⚙️ Properties <small>Screen1</small></h4>
            <label>Title <small>العنوان</small><input data-p="title" value="${esc(S.title)}"></label>
            <label>AlignHorizontal <small>محاذاة أفقية</small><select data-p="align">${opt([["left","Left : 1"],["center","Center : 3"],["right","Right : 2"]],S.align)}</select></label>
            <label>AlignVertical <small>محاذاة عمودية</small><select data-p="valign">${opt([["top","Top : 1"],["center","Center : 2"],["bottom","Bottom : 3"]],S.valign)}</select></label>
            <label>BackgroundColor <small>لون الخلفية</small><select data-p="bg">${opt(COLORS,S.bg)}</select></label>
            <label>BackgroundImage <small>صورة الخلفية</small><select data-p="bgImage">${opt([["","None"],["🥗","salad.png 🥗"],["🍎","fruits.png 🍎"],["🌿","leaves.png 🌿"]],S.bgImage)}</select></label>`;
        } else {
          const c = comp(S.sel), t = c.type;
          p.innerHTML = `<h4>⚙️ Properties <small>${esc(c.name)}</small></h4>
            <label>Rename <small>إعادة التسمية</small><input data-p="name" value="${esc(c.name)}"></label>
            ${t!=="Image"?`<label>Text <small>النص</small><input data-p="text" value="${esc(c.text)}"></label>`:""}
            ${t==="Button"||t==="ListPicker"?`<label>BackgroundColor <small>لون الخلفية</small><select data-p="bg">${opt([["#E0E0E0","Default"]].concat(COLORS),c.bg)}</select></label>`:""}
            ${t!=="Image"&&t!=="TextBox"?`<label class="chk"><input type="checkbox" data-p="bold"${c.bold?" checked":""}> FontBold <small>خط غامق</small></label>
              <label>FontSize <small>حجم الخط</small><select data-p="size">${opt([["14","14"],["18","18"],["24","24"],["30","30"]],String(c.size))}</select></label>
              <label>TextColor <small>لون النص</small><select data-p="color">${opt([["#000000","Black"],["#FFFFFF","White"],["#6C3FD1","Purple"],["#2E7D32","Green"],["#C62828","Red"]],c.color)}</select></label>`:""}
            ${t==="Image"?`<label>Picture <small>الصورة</small><select data-p="pic">${opt([["","None"]].concat(PICS.map(x=>[x,x])),c.pic||"")}</select></label>`:""}
            <button class="btn sm ghost dz-del">🗑️ Delete</button>`;
        }
        // المهام
        missions.forEach((m,i)=>{ if(!done.has(i) && test(m)){ done.add(i); Sound.pop(); } });
        $(".dz-ml",el).innerHTML = missions.map((m,i)=>`<div class="${done.has(i)?"ok":""}">${done.has(i)?"✅":"⬜"} ${m.text}</div>`).join("");
        if(missions.length && done.size === missions.length && !S.cele){ S.cele = true; celebrate($(".dz-mis",el)); FX.message("واجهة رائعة! 👏"); }
      };
      el.addEventListener("click", e => {
        const a = e.target.closest(".dz-add");
        if(a){ const t = a.dataset.t; S.n[t] = (S.n[t]||0)+1; const id = t+S.n[t];
          S.comps.push({ id, type:t, name:id, text:({Button:"Text for "+id,Label:"Text for "+id,ListPicker:"Text for "+id,TextBox:""})[t]||"", bold:false, size:14, color:"#000000", bg:"#E0E0E0", pic:"" });
          S.sel = id; Sound.pop(); return draw(); }
        const n = e.target.closest("[data-id]");
        if(n && el.contains(n)){ S.sel = n.dataset.id; return draw(); }
        if(e.target.closest(".dz-del")){ S.comps = S.comps.filter(c=>c.id!==S.sel); S.sel = "screen"; return draw(); }
      });
      el.addEventListener("change", e => {
        const k = e.target.dataset.p; if(!k) return;
        const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        if(S.sel === "screen") S[k] = v; else { const c = comp(S.sel); c[k] = k==="size" ? +v : v; }
        draw();
      });
      el.addEventListener("input", e => {   // تحديث المعاينة أثناء الكتابة دون فقدان التركيز
        const k = e.target.dataset.p; if(!k || e.target.tagName !== "INPUT" || e.target.type === "checkbox") return;
        if(S.sel === "screen") { S[k] = e.target.value; $(".ph-title",el).textContent = S.title; }
        else { const c = comp(S.sel); c[k] = e.target.value; const pv = $(`.ph-screen [data-id="${c.id}"]`,el); if(pv && k==="text") pv.textContent = c.text; if(k==="name"){ const tn=$(`.dz-node[data-id="${c.id}"]`,el); if(tn) tn.textContent = "↳ "+c.name; } }
        missions.forEach((m,i)=>{ if(!done.has(i) && test(m)){ done.add(i); Sound.pop(); $(".dz-ml",el).innerHTML = missions.map((m,j)=>`<div class="${done.has(j)?"ok":""}">${done.has(j)?"✅":"⬜"} ${m.text}</div>`).join(""); if(done.size===missions.length && !S.cele){ S.cele=true; celebrate($(".dz-mis",el)); } } });
      });
      draw();
    }
  },

  /* ---------- رتّبي اللبنات البرمجية لبناء البرنامج ---------- */
  blocks:{
    html:d => {
      const pool = shuffle(d.lines.map((l,i)=>({...l,i})).concat((d.distractors||[]).map(l=>({...l,i:-1}))));
      return `${head(d)}
      <div class="bk">
        <div class="bk-side">
          <p class="lead rv" style="--i:1;font-size:24px">${d.question}</p>
          <div class="bk-pool rv" style="--i:2">${pool.map((l,k)=>`<button class="bk-pc" data-i="${l.i}" data-k="${k}" dir="ltr"><span class="blk b-${l.c}">${bidi(l.t)}</span></button>`).join("")}</div>
          <div class="feedback bfb" style="min-height:50px;font-size:25px"></div>
        </div>
        <div class="bk-main">
          <div class="bk-ws card rv" style="--i:2"><div class="bk-h">🧩 منطقة البرمجة <small>Viewer</small><button class="btn sm ghost bk-reset">↺</button></div><div class="bk-code" dir="ltr"></div></div>
          ${d.result?`<div class="bk-run hidden-step"><button class="btn teal bk-go">▶ تشغيل التطبيق</button><div class="bk-out"></div></div>`:""}
        </div>
      </div>`;
    },
    init:(el,d) => {
      let k = 0; const code = $(".bk-code",el), fb = $(".bfb",el);
      const reset = () => { k = 0; code.innerHTML = `<div class="bk-empty">اضغطي على اللبنات بالترتيب الصحيح 👈</div>`; $$(".bk-pc",el).forEach(b=>b.classList.remove("used")); fb.innerHTML = ""; const r=$(".bk-run",el); if(r){ r.classList.remove("show"); $(".bk-out",el).innerHTML=""; } };
      reset();
      $$(".bk-pc",el).forEach(b => b.onclick = () => {
        if(b.classList.contains("used") || k >= d.lines.length) return;
        if(+b.dataset.i === k){
          if(!k) code.innerHTML = "";
          const l = d.lines[k];
          code.insertAdjacentHTML("beforeend", `<div class="blk b-${l.c} snap" style="margin-left:${(l.ind||0)*34}px">${bidi(l.t)}</div>`);
          b.classList.add("used"); k++; Sound.pop(); fb.innerHTML = "";
          if(k === d.lines.length){ fb.innerHTML = okMsg(d.doneMsg || "أحسنتِ! 👏 البرنامج مكتمل"); celebrate(fb); const r=$(".bk-run",el); if(r) r.classList.add("show"); }
        } else {
          shakeEl(b); Sound.wrong();
          fb.innerHTML = noMsg(+b.dataset.i < 0 ? "هذه اللبنة لا تنتمي لهذا البرنامج 🤔" : (d.lines[k].hint || "ليست هذه اللبنة التالية… ماذا يجب أن يحدث أولًا؟"));
        }
      });
      $(".bk-reset",el).onclick = reset;
      const go = $(".bk-go",el); if(go) go.onclick = () => { $(".bk-out",el).innerHTML = d.result; Sound.success(); };
    }
  },

  /* ---------- محاكاة تطبيق الغذاء الصحي: القائمة والمتغيرات والشرط ---------- */
  foodapp:{
    html:d => `${head(d)}
      <div class="fa">
        <div class="fa-phone rv" style="--i:1"><div class="ph"><div class="ph-bar"><span class="ph-title">Home</span></div><div class="ph-screen fa-scr"></div></div></div>
        <div class="fa-side">
          <div class="fa-var card rv" style="--i:2">🧮 قيمة المتغير <code dir="ltr">global selection</code> = <b class="fa-sel" dir="ltr">" "</b></div>
          <div class="fa-code card scrollable rv" style="--i:3">${blk(d.code)}</div>
          <p class="note rv" style="--i:4;font-size:20px;margin:0">👆 جرّبي التطبيق على الهاتف، وراقبي أي لبنة تعمل الآن وكيف تتغير قيمة المتغير.</p>
        </div>
      </div>`,
    init:(el,d) => {
      const scr = $(".fa-scr",el), title = $(".ph-title",el), selEl = $(".fa-sel",el);
      const hl = ns => { $$(".fa-code .blk",el).forEach(b=>b.classList.remove("run")); (ns||[]).forEach(n=>{ const b=$(`.fa-code .blk[data-n="${n}"]`,el); if(b){ b.classList.add("run"); b.scrollIntoView({block:"nearest"}); } }); };
      const back = `<button class="fa-back">◀ رجوع</button>`;
      const home = () => { title.textContent = "Home"; scr.innerHTML = d.home.map(b=>`<div class="ph-btn fa-b" data-go="${b.go}" style="background:${b.bg||"#E0E0E0"};font-weight:900">${b.text}</div>`).join(""); hl([]); };
      const list = (items, ns) => { hl(ns); scr.innerHTML = `<div class="fa-list">${items.map(x=>`<div class="fa-it" data-it="${esc(x)}">${x}</div>`).join("")}</div>`; };
      const screen = s => { title.textContent = s.name; scr.innerHTML = `${back}${s.pic?`<div class="ph-img">${s.pic}</div>`:""}${s.labels.map(t=>`<div class="ph-lbl" style="font-weight:700">${t}</div>`).join("")}`; };
      let items = d.foods;
      scr.addEventListener("click", e => {
        const b = e.target.closest(".fa-b");
        if(b){ Sound.pop();
          if(b.dataset.go === "tips"){ hl(d.hl.tips); screen(d.tips); }
          else { items = d.foods; selEl.textContent = `" "`; list(items, d.hl.before); }
          return; }
        if(e.target.closest(".fa-back")) return home();
        const it = e.target.closest(".fa-it");
        if(it){ const v = it.dataset.it; selEl.textContent = `"${v}"`; selEl.classList.remove("pop"); void selEl.offsetWidth; selEl.classList.add("pop"); Sound.pop();
          const tgt = d.targets[v];
          if(tgt && tgt.sub){ hl(d.hl.after.concat(tgt.hl)); setTimeout(()=>list(tgt.sub, d.hl.after.concat(tgt.hl)), 500); }
          else if(tgt){ hl(d.hl.after.concat(tgt.hl)); setTimeout(()=>screen(tgt.screen), 500); }
          else { hl(d.hl.after); scr.innerHTML = `${back}<div class="fa-msg">لم تُبرمج شاشة «${esc(v)}» بعد 🛠️<br><small>أكملي التطبيق بتكرار نفس الخطوات (تدريب ٢)</small></div>`; }
        }
      });
      home();
    }
  },

  /* ---------- محاكي المساعد الصوتي ---------- */
  assistant:{
    html:d => `${head(d)}
      <div class="as">
        <div class="as-phone rv" style="--i:1"><div class="ph"><div class="ph-bar"><span class="ph-title">MY VOICE ASSISTANT</span></div>
          <div class="ph-screen as-scr" style="background:#A5C2FD;align-items:center">
            <div class="as-row" dir="ltr"><span>Name:</span><input class="as-name" placeholder="..."><button class="as-save">Save</button></div>
            <div class="as-bot">🤖</div><div class="as-greet" dir="auto"></div>
            <button class="as-mic" title="اضغطي للسؤال">🎤</button>
            <div class="as-help">How can I help?</div>
            <div class="as-ask"><input class="as-q" dir="auto" placeholder="اكتبي سؤالك هنا…"><button class="as-send">↵</button></div>
            <div class="as-web"></div>
          </div></div></div>
        <div class="as-side">
          <div class="as-pipe card rv" style="--i:2">
            <div class="as-st" data-s="1"><i>🎤</i><b>التعرف على الكلام</b><small>Speech recognition: الصوت ← نص</small></div>
            <div class="as-st" data-s="2"><i>🧠</i><b>معالجة اللغة الطبيعية</b><small>NLP: فهم المعنى</small></div>
            <div class="as-st" data-s="3"><i>🔊</i><b>تحويل النص إلى كلام</b><small>Text-to-speech: الرد الصوتي</small></div>
          </div>
          <div class="as-log card rv scrollable" style="--i:3"><h4>📜 ما يحدث داخل التطبيق</h4><div class="as-ll"></div></div>
        </div>
      </div>`,
    init:(el,d) => {
      let name = "";
      const log = t => { $(".as-ll",el).insertAdjacentHTML("afterbegin", `<div>${t}</div>`); };
      const step = s => { $$(".as-st",el).forEach(x=>x.classList.toggle("on", +x.dataset.s === s)); };
      const say = (txt, lang) => { try{ if(window.speechSynthesis){ const u = new SpeechSynthesisUtterance(txt); u.lang = lang || "en-US"; speechSynthesis.cancel(); speechSynthesis.speak(u); } }catch(e){} };
      const norm = s => s.toLowerCase().replace(/[?؟!.,،]/g,"").replace(/\s+/g," ").trim();
      const answer = q => {
        step(2); log(`🧠 NLP: يحلل الجملة «${esc(q)}»`);
        setTimeout(() => {
          const hit = (d.replies||[]).find(r => r.q.some(x => norm(x) === norm(q)));
          if(hit){ step(3); log(`🔊 TextToSpeech: «${esc(hit.a)}»`); $(".as-greet",el).textContent = hit.a; say(hit.a, hit.lang); $(".as-web",el).innerHTML = ""; }
          else { step(0); const url = "https://www.google.com/search?q=" + encodeURIComponent(q);
            log(`🌐 لا يوجد رد محفوظ ← WebViewer يفتح بحث جوجل`);
            $(".as-web",el).innerHTML = `<div class="as-wv" dir="ltr">🔎 google.com/search?q=<bdi>${esc(q)}</bdi></div><a class="btn sm teal" href="${url}" target="_blank" rel="noopener">فتح البحث</a>`; }
          Sound.pop();
        }, 700);
      };
      const ask = q => { q = (q||"").trim(); if(!q) return; step(1); log(`🎤 SpeechRecognizer → النص: «${esc(q)}»`); setTimeout(()=>answer(q), 600); };
      $(".as-save",el).onclick = () => { name = $(".as-name",el).value.trim() || "friend";
        const g = `Hello, ${name}! How can I help you?`; $(".as-greet",el).textContent = g; step(3); say(g); $(".as-help",el).textContent = "Press here to ask..."; log(`💾 Save: global name = «${esc(name)}» ← TextToSpeech يرحّب`); Sound.pop(); };
      $(".as-send",el).onclick = () => { ask($(".as-q",el).value); $(".as-q",el).value = ""; };
      $(".as-q",el).addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); $(".as-send",el).click(); } });
      $(".as-mic",el).onclick = () => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if(!SR){ log("ℹ️ الميكروفون غير مدعوم في هذا المتصفح — اكتبي السؤال في المربع"); $(".as-q",el).focus(); return; }
        try{ const r = new SR(); r.lang = d.micLang || "en-US"; step(1); log("🎤 أستمع…");
          r.onresult = ev => ask(ev.results[0][0].transcript);
          r.onerror = () => { log("⚠️ تعذّر سماع الصوت — اكتبي السؤال في المربع"); step(0); };
          r.start(); }catch(e){ log("⚠️ تعذّر تشغيل الميكروفون — اكتبي السؤال في المربع"); }
      };
    }
  }
});

/* ==========================================================================
   🧭 نظام التنقل بين الشرائح
   ========================================================================== */
const holder = $("#slides");
const slidesEls = SLIDES.map((d, i) => {
  const s = document.createElement("section");
  s.className = "slide"; s.dataset.anim = d.anim || "fade"; s.dataset.dir = "next";
  const T = TYPES[d.type];
  s.innerHTML = T ? T.html(d) : `<h2>نوع غير معروف: ${d.type}</h2>`;
  holder.appendChild(s);
  if(T && T.init) T.init(s, d);
  return s;
});
const N = slidesEls.length;
let cur = -1;

function go(i){
  if(i < 0 || i >= N || i === cur) return;
  const dir = i > cur ? "next" : "prev";
  if(cur >= 0){
    const old = slidesEls[cur];
    old.classList.remove("active"); old.classList.add("leaving");
    setTimeout(()=>old.classList.remove("leaving"), 460);
  }
  const s = slidesEls[i];
  s.dataset.dir = dir;
  s.classList.remove("leaving");
  void s.offsetWidth;                 // إعادة تشغيل الحركات
  s.classList.add("active");
  cur = i;
  $("#count").textContent = `${toAr(cur+1)} / ${toAr(N)}`;
  $("#progress").style.width = ((cur+1)/N*100) + "%";
  try{ history.replaceState(null, "", "#" + (cur+1)); }catch(e){}
}
const next = () => go(cur + 1);
const prev = () => go(cur - 1);

/* أزرار الشريط */
$("#nextBtn").onclick = next;
$("#prevBtn").onclick = prev;
$("#clapBtn").onclick = clap;
$("#fsBtn").onclick = toggleFS;
function toggleFS(){
  if(!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(()=>{});
  else document.exitFullscreen?.();
}

/* لوحة المفاتيح */
document.addEventListener("keydown", e => {
  const tgt = e.target;
  if(tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.tagName === "SELECT")){
    if(e.key === "Escape") tgt.blur();
    return;                                 // لا نتدخل أثناء الكتابة
  }
  Sound.init();
  switch(true){
    case e.key === "ArrowRight" || e.key === " " || e.code === "Space" || e.key === "PageDown":
      e.preventDefault(); next(); break;
    case e.key === "ArrowLeft" || e.key === "PageUp":
      e.preventDefault(); prev(); break;
    case e.key === "Home": e.preventDefault(); go(0); break;
    case e.key === "End":  e.preventDefault(); go(N-1); break;
    case e.key === "ت" || e.code === "KeyJ":      // حرف ت (نفس زر J في لوحة المفاتيح)
      e.preventDefault(); clap(); break;
    case e.key === "f" || e.key === "F" || e.key === "ب":
      e.preventDefault(); toggleFS(); break;
    case e.key === "ArrowUp" || e.key === "ArrowDown":
      e.preventDefault(); break;
  }
  showBar();
});

/* إلغاء التركيز عن الأزرار بعد الضغط حتى لا يضغطها Space مرة أخرى */
document.addEventListener("click", e => { Sound.init(); const b = e.target.closest("button"); if(b) b.blur(); });
/* منع أي تمرير بعجلة الفأرة أو اللمس */
window.addEventListener("wheel", e => { if(!e.target.closest(".scrollable")) e.preventDefault(); }, {passive:false});
document.addEventListener("touchmove", e => { if(!e.target.closest("input,.scrollable")) e.preventDefault(); }, {passive:false});

/* إخفاء شريط التحكم تلقائيًا عند عدم تحريك الماوس */
let idleT;
function showBar(){
  document.body.classList.remove("idle");
  clearTimeout(idleT);
  idleT = setTimeout(()=>{ if(!$("#bar").matches(":hover")) document.body.classList.add("idle"); }, 1800);
}
["mousemove","pointerdown","touchstart"].forEach(ev => document.addEventListener(ev, showBar, {passive:true}));

/* ملاءمة المسرح (16:9) لحجم الشاشة دون تمرير */
function fit(){
  SCALE = Math.min(window.innerWidth/1600, window.innerHeight/900);
  $("#stage").style.transform = `translate(-50%,-50%) scale(${SCALE})`;
}
window.addEventListener("resize", fit);
/* إعادة أي إزاحة داخلية للصفر (مثلاً عند التركيز على حقل كتابة) */
document.addEventListener("scroll", e => { const t = e.target; if(t && t.scrollTop !== undefined){ t.scrollTop = 0; t.scrollLeft = 0; } }, true);

/* التشغيل */
FX.el = $("#fx");
fit();
const start = parseInt((location.hash||"").slice(1)) || 1;
go(Math.min(Math.max(start,1),N) - 1);
showBar();
