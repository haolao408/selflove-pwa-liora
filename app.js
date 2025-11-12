
// ====== helpers ======
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const ls = {
  get(k, fb){ try{ return JSON.parse(localStorage.getItem(k) ?? 'null') ?? fb; } catch { return fb; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); } catch{} }
};
const QUOTES = [
  'Ты — источник света. Наполни себя, и мир засияет ярче.',
  'Любовь к себе — это не эгоизм, а забота о корнях твоей души.',
  'Каждый день — шанс сказать себе «я достаточно».',
  'Твоя мягкость — твоя сила.',
  'Принятие себя — начало настоящей свободы.',
  'Ты растёшь, даже когда отдыхаешь. Доверься процессу.'
];
const todayKey = () => new Date().toISOString().slice(0,10);
function notify(title, body){
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") { new Notification(title, { body }); return true; }
  return false;
}

// ====== tabs ======
function initTabs(){
  $$(".tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".tabs button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const v = btn.dataset.tab;
      $$("main > section").forEach(sec => sec.classList.add("hidden"));
      $("#tab-"+v).classList.remove("hidden");
    });
  });
}

// ====== Club (quotes + notif) ======
function initClub(){
  const quote = QUOTES[new Date().getDate() % QUOTES.length];
  $("#dailyQuote").textContent = quote;

  const toggle = $("#quoteNotifToggle");
  const hour = $("#quoteHour");
  toggle.checked = ls.get("daily_quote_enabled", true);
  hour.value = ls.get("daily_quote_hour", 8);

  toggle.addEventListener("change", () => ls.set("daily_quote_enabled", toggle.checked));
  hour.addEventListener("change", () => ls.set("daily_quote_hour", parseInt(hour.value||"8")));

  $("#testNotif").addEventListener("click", () => {
    if (Notification.permission !== "granted") Notification.requestPermission().then(p => { if (p==="granted") notify("Утреннее послание (тест)", quote); });
    else notify("Утреннее послание (тест)", quote);
  });

  // schedule loop
  setInterval(() => {
    if (!ls.get("daily_quote_enabled", true)) return;
    const at = new Date(); at.setHours(parseInt(ls.get("daily_quote_hour", 8)),0,0,0);
    const now = new Date();
    const diff = at.getTime() - now.getTime();
    if (diff <= 0 && diff > -60000) notify("Утреннее послание", QUOTES[new Date().getDate() % QUOTES.length]);
  }, 15000);
}

// ====== Wheel of Life ======
const DEFAULT_WHEEL = ["Здоровье","Тело и красота","Отношения","Секс и близость","Самореализация","Деньги","Дом и быт","Отдых и творчество"];
function renderWheel(values, labels){
  const size = 300, cx = size/2, cy = size/2, maxR = size*0.42, step = (Math.PI*2)/values.length;
  const polar = (r,a) => [cx + r*Math.cos(a), cy + r*Math.sin(a)];
  const pts = values.map((v,i)=>{
    const r = (v/10)*maxR, a = -Math.PI/2 + step*i;
    const [x,y] = polar(r,a); return `${x},${y}`;
  }).join(" ");
  return `
<svg width="${size}" height="${size}">
  <defs><radialGradient id="pink" cx="50%" cy="50%" r="60%"><stop offset="0%" stop-color="#ffe4ec"/><stop offset="100%" stop-color="#ffd0e1"/></radialGradient></defs>
  <circle cx="${cx}" cy="${cy}" r="${maxR}" fill="url(#pink)" opacity="0.6"/>
  ${[2,4,6,8,10].map(t=> `<circle cx="${cx}" cy="${cy}" r="${(t/10)*maxR}" fill="none" stroke="#f5a3bf" stroke-dasharray="4 6" opacity="0.5"/>`).join("")}
  ${labels.map((lab,i)=>{ const a=-Math.PI/2+step*i; const x=cx+(maxR+12)*Math.cos(a); const y=cy+(maxR+12)*Math.sin(a); return `<text x="${x}" y="${y}" font-size="10" text-anchor="middle" fill="#9b1c60">${lab}</text>`; }).join("")}
  <polygon points="${pts}" fill="#ff7fb4" opacity="0.45" stroke="#ff4d97" stroke-width="2"/>
  ${values.map((v,i)=>{ const r=(v/10)*maxR; const a=-Math.PI/2+step*i; const x=cx+r*Math.cos(a), y=cy+r*Math.sin(a); return `<circle cx="${x}" cy="${y}" r="4" fill="#e11d72"/>`; }).join("")}
</svg>`;
}
function initWheel(){
  let labels = ls.get("wheel_labels", DEFAULT_WHEEL.slice());
  let values = ls.get("wheel_values", Array(labels.length).fill(5));
  const note = $("#wheelNote");
  note.value = ls.get("wheel_note", "");

  const wrap = $("#areasWrap");
  const wheel = $("#wheelSvgWrap");
  const planList = $("#planList");

  function recomputePlan(){
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const minIdx = values.indexOf(minV);
    const maxIdx = values.indexOf(maxV);
    const plan = [
      `Самая проседающая сфера: «${labels[minIdx]}». 1 микро‑шаг на 10–15 минут в ближайшие 48 часов.`,
      `Сфера‑опора: «${labels[maxIdx]}». Что из неё можно перелить в слабую: навык, контакт, ресурс?`,
      `Цель формулируй как процесс, не результат: «15 минут прогулки 3 раза».`
    ];
    planList.innerHTML = plan.map(p=> `<li>${p}</li>`).join("");
  }

  function render(){
    wheel.innerHTML = renderWheel(values, labels);
    wrap.innerHTML = labels.map((lab,i)=>`
      <div class="card soft">
        <div class="row"><span class="muted">${lab}</span></div>
        <div class="row gap">
          <input type="range" min="0" max="10" step="1" value="${values[i]}" data-idx="${i}">
          <input type="text" value="${lab}" data-label="${i}" style="width:140px">
          <button class="btn secondary" data-del="${i}">−</button>
        </div>
      </div>
    `).join("");
    recomputePlan();
  }

  wrap.addEventListener("input", (e)=>{
    if (e.target.matches('input[type="range"]')){
      const i = parseInt(e.target.dataset.idx);
      values[i] = parseInt(e.target.value);
      ls.set("wheel_values", values); render();
    }
    if (e.target.matches('input[type="text"][data-label]')){
      const i = parseInt(e.target.dataset.label);
      labels[i] = e.target.value;
      ls.set("wheel_labels", labels); render();
    }
  });
  wrap.addEventListener("click", (e)=>{
    if (e.target.dataset.del){
      const i = parseInt(e.target.dataset.del);
      labels.splice(i,1); values.splice(i,1);
      ls.set("wheel_labels", labels); ls.set("wheel_values", values);
      render();
    }
  });

  $("#addArea").addEventListener("click", ()=>{
    if (labels.length >= 12) return;
    labels.push("Моя сфера"); values.push(5);
    ls.set("wheel_labels", labels); ls.set("wheel_values", values); render();
  });
  $("#resetVals").addEventListener("click", ()=>{
    values = Array(labels.length).fill(5);
    ls.set("wheel_values", values); render();
  });
  note.addEventListener("input", ()=> ls.set("wheel_note", note.value));

  render();
}

// ====== Habits ======
function computeStreak(log){
  let s=0; const t=new Date();
  for (let i=0;i<365;i++){
    const d=new Date(); d.setDate(t.getDate()-i);
    const k=d.toISOString().slice(0,10);
    const ok=(log?.[k]||0)>0;
    if (i===0 && !ok) break;
    if (!ok) break;
    s++;
  }
  return s;
}
function habitCard(h){
  const today = todayKey();
  const doneToday = (h.log?.[today]||0) >= h.target;
  const streak = computeStreak(h.log||{});
  const days = 28; const now = new Date();
  let cal = "";
  for (let i=0;i<days;i++){
    const d=new Date(); d.setDate(now.getDate()-(days-1-i)); const k=d.toISOString().slice(0,10);
    const ok=(h.log?.[k]||0)>0;
    cal += `<div class="dot ${ok?'on':'off'}" title="${k}"></div>`;
  }
  return `
  <div class="card soft" data-id="${h.id}">
    <div class="grid">
      <div>
        <input type="text" value="${h.name}" data-edit="name">
        <div class="row">
          Цель в день: <input type="number" min="1" max="10" value="${h.target}" data-edit="target" style="width:70px"> <span class="muted">${h.unit}</span>
        </div>
        <div class="row space">
          <div class="row"><input type="checkbox" ${h.remind?'checked':''} data-edit="remind"> Напоминание</div>
          <div class="row">Время: <input type="number" min="0" max="23" value="${h.hour}" data-edit="hour" style="width:70px"> ч</div>
        </div>
        <button class="btn secondary" data-action="delete">Удалить</button>
      </div>
      <div>
        <div class="muted">Сегодня</div>
        <div class="row"><button class="btn" data-action="toggle">${doneToday?'Выполнено':'Отметить'}</button><div class="muted">${(h.log?.[today]||0)} / ${h.target}</div></div>
        <div class="muted">Стрик: ${streak} дней подряд</div>
      </div>
      <div>
        <div class="muted">Последние 28 дней</div>
        <div class="cal">${cal}</div>
      </div>
    </div>
  </div>
  `;
}
function initHabits(){
  let habits = ls.get("habits", [{ id:1, name:"Утренний танец пробуждения", target:1, unit:"раз/день", remind:true, hour:7, log:{} }]);
  const wrap = $("#habitsWrap");
  const rerender = () => wrap.innerHTML = habits.map(habitCard).join("");

  $("#addHabit").addEventListener("click", ()=>{
    habits.push({ id: Date.now(), name:"Моя привычка", target:1, unit:"раз/день", remind:false, hour:9, log:{} });
    ls.set("habits", habits); rerender();
  });
  wrap.addEventListener("click", (e)=>{
    const card = e.target.closest("[data-id]"); if (!card) return;
    const id = +card.dataset.id;
    if (e.target.dataset.action === "delete"){
      habits = habits.filter(h=>h.id!==id); ls.set("habits", habits); rerender(); return;
    }
    if (e.target.dataset.action === "toggle"){
      const h = habits.find(x=>x.id===id); const k=todayKey();
      const n = (h.log?.[k]||0) < h.target ? 1 : -1;
      h.log = h.log || {}; h.log[k] = Math.max(0, (h.log[k]||0) + n);
      ls.set("habits", habits); rerender(); return;
    }
  });
  wrap.addEventListener("input", (e)=>{
    const card = e.target.closest("[data-id]"); if (!card) return; const id = +card.dataset.id;
    const h = habits.find(x=>x.id===id);
    const t = e.target.dataset.edit;
    if (t==="name") h.name = e.target.value;
    if (t==="target") h.target = parseInt(e.target.value||"1");
    if (t==="remind") h.remind = e.target.checked;
    if (t==="hour") h.hour = parseInt(e.target.value||"9");
    ls.set("habits", habits);
  });

  // notif loop
  setInterval(()=>{
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const now = new Date();
    habits.forEach(h=>{
      if (!h.remind) return;
      const at = new Date(); at.setHours(h.hour,0,0,0);
      const diff = at.getTime() - now.getTime();
      if (diff<=0 && diff>-60000) notify(h.name, "Мягкое напоминание: маленький шаг — уже победа");
    });
  }, 15000);

  rerender();
}

// ====== Practices ======
const PRACTICES = [
  { id:"wheel-of-life", title:"Колесо баланса", minutes:10, goal:"Увидеть свою карту жизни и мягко отбалансировать сферы", steps:["Выбери сферы","Оцени 0–10","Посмотри форму колеса","Запланируй 1 микро‑шаг"] },
  { id:"mirror", title:"Зеркало: голое тело и принятие", minutes:7, goal:"Принять своё тело без нападок и сравнения", steps:["Уединись и выровняй дыхание","Посмотри без оценки","Назови 3 части тела с благодарностью","Скажи: я достойна любви в любом состоянии"] },
  { id:"self-hug", title:"Объятие себя", minutes:3, goal:"Успокоить нервную систему и вернуть опору", steps:["Ладони на плечи","6 медленных вдохов‑выдохов","Фраза: я с тобой"] },
  { id:"gratitude-3", title:"3 благодарности", minutes:2, goal:"Сдвиг фокуса на хорошее", steps:["Запиши 3 благодарности","Одну свяжи с собой","Заметь ощущение в теле"] },
  { id:"dance", title:"Танец пробуждения", minutes:3, goal:"Проснуть тело и настроение", steps:["Открой плейлист в Telegram","Задай темп дыхания","Позволь телу двигаться свободно"], link:"https://t.me/lyorasakha" }
];
function initPractices(){
  const wrap = $("#practicesWrap");
  wrap.innerHTML = PRACTICES.map(p=>`
    <div class="card soft">
      <div class="row space">
        <div>
          <div><strong>${p.title}</strong></div>
          <div class="muted">Цель: ${p.goal}</div>
        </div>
        <div class="row gap">
          ${p.link ? `<a class="btn secondary" href="${p.link}" target="_blank">Музыка</a>`:''}
          <button class="btn" data-run="${p.id}">${p.minutes} мин</button>
        </div>
      </div>
    </div>
  `).join("");

  const dlg = $("#practiceModal");
  const pmTitle = $("#pmTitle");
  const pmGoal = $("#pmGoal");
  const pmSteps = $("#pmSteps");
  const pmTimer = $("#pmTimer");
  const pmStart = $("#pmStart");
  const pmReset = $("#pmReset");
  const pmClose = $("#pmClose");
  let timer=0, left=0;

  wrap.addEventListener("click", (e)=>{
    if (!e.target.dataset.run) return;
    const p = PRACTICES.find(x=>x.id===e.target.dataset.run);
    pmTitle.textContent = p.title;
    pmGoal.textContent = p.goal;
    pmSteps.innerHTML = p.steps.map(s=> `<li>${s}</li>`).join("");
    left = p.minutes*60; pmTimer.textContent = "0"+Math.floor(left/60)+":"+String(left%60).padStart(2,'0');
    dlg.showModal();
  });
  pmStart.addEventListener("click", (e)=>{
    e.preventDefault();
    if (timer) { clearInterval(timer); timer=0; pmStart.textContent="Старт"; return; }
    pmStart.textContent = "Пауза";
    timer = setInterval(()=>{
      left = Math.max(0, left-1);
      const mm = String(Math.floor(left/60)).padStart(2,'0');
      const ss = String(left%60).padStart(2,'0');
      pmTimer.textContent = mm+":"+ss;
      if (left===0){ clearInterval(timer); timer=0; notify("Класс!", "Практика завершена"); }
    }, 1000);
  });
  pmReset.addEventListener("click", (e)=>{ e.preventDefault(); const t=pmTitle.textContent; const p=PRACTICES.find(x=>x.title===t); left=p.minutes*60; pmTimer.textContent="0"+Math.floor(left/60)+":"+String(left%60).padStart(2,'0'); });
  pmClose.addEventListener("click", ()=> dlg.close());
}

// ====== Missions ======
const MISSIONS = [
  { id: "public", title: "Выход в свет", text: "Нарядись для себя. Маленький выход: кофе, прогулка, цветы. Задача — быть замеченной самой собой.", tip: "Фото для себя, не для оценок." },
  { id: "grat-journal", title: "Дневник достоинств", text: "Запиши 10 своих качеств, которые помогают тебе жить. Повесь на видное место.", tip: "Через неделю добавь ещё 5." },
  { id: "boundaries", title: "Одно ясное «нет»", text: "Выбери область, где ты устаёшь. Скажи одно спокойное «нет» без оправданий.", tip: "Заметь ощущения в теле после." },
  { id: "ritual", title: "Ритуал ведьмы", text: "Свеча, чай, 10 минут записи мыслей. Спроси: чего я хочу на самом деле?", tip: "Сделай один шаг в течение 24 часов." }
];
function initMissions(){
  const wrap = $("#missionsWrap");
  const done = ls.get("missions_done", {});
  function render(){
    wrap.innerHTML = MISSIONS.map(m=>`
      <div class="card soft">
        <div class="row space">
          <div>
            <div><strong>${m.title}</strong></div>
            <div class="muted">${m.text}</div>
            <div class="muted" style="font-size:12px">Подсказка: ${m.tip}</div>
          </div>
          <button class="btn" data-id="${m.id}">${done[m.id]?'Сделано':'Отметить'}</button>
        </div>
      </div>
    `).join("");
  }
  wrap.addEventListener("click", (e)=>{
    const id = e.target.dataset.id; if (!id) return;
    done[id] = !done[id]; ls.set("missions_done", done); render();
  });
  render();
}

// ====== Sync ======
function getAllData(){
  return {
    wheel_labels: ls.get("wheel_labels", null),
    wheel_values: ls.get("wheel_values", null),
    wheel_note: ls.get("wheel_note", null),
    habits: ls.get("habits", null),
    missions_done: ls.get("missions_done", null),
    daily_quote_enabled: ls.get("daily_quote_enabled", null),
    daily_quote_hour: ls.get("daily_quote_hour", null),
    version: 1,
    saved_at: new Date().toISOString()
  };
}
function setAllData(d){
  if (!d || typeof d!=='object') return;
  Object.entries(d).forEach(([k,v])=>{
    if (k==='version' || k==='saved_at') return;
    ls.set(k,v);
  });
}
function initSync(){
  $("#exportJson").addEventListener("click", ()=>{
    const data = getAllData();
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `selflove-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    ls.set('last_backup_at', new Date().toISOString());
    $("#lastBackup").textContent = "Последний бэкап: " + new Date().toLocaleString();
    $("#backupCode").value = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  });
  $("#importJson").addEventListener("change", (e)=>{
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try{ const d = JSON.parse(r.result); setAllData(d); location.reload(); }catch{} };
    r.readAsText(f);
  });
  $("#genCode").addEventListener("click", ()=>{
    $("#backupCode").value = btoa(unescape(encodeURIComponent(JSON.stringify(getAllData()))));
  });
  $("#restoreCode").addEventListener("click", ()=>{
    try{
      const d = JSON.parse(decodeURIComponent(escape(atob($("#backupCode").value.trim()))));
      setAllData(d); location.reload();
    }catch(e){ alert("Код не распознан"); }
  });
  $("#lastBackup").textContent = "Последний бэкап: " + (ls.get('last_backup_at', null) ? new Date(ls.get('last_backup_at')).toLocaleString() : "ещё не было");
}

// ====== PWA install + SW ======
function initPWA(){
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
  let deferredPrompt = null;
  const btn = $("#installBtn");
  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault(); deferredPrompt = e; btn.disabled = false;
  });
  btn.addEventListener('click', async ()=>{
    if (!deferredPrompt){ alert("Если кнопка не сработала: открой меню браузера и выбери Добавить на экран"); return; }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted'){ btn.textContent = "Установлено"; btn.disabled = true; }
    deferredPrompt = null;
  });
}

// ====== boot ======
window.addEventListener("load", ()=>{
  initTabs();
  initClub();
  initWheel();
  initHabits();
  initPractices();
  initMissions();
  initSync();
  initPWA();
  try{ if (Notification && Notification.permission === "default") Notification.requestPermission(); }catch{}
});

