// ============================================================
//  DENÍK EKZÉMU – app.js
// ============================================================

const APP_VERSION = '1.0.0';

// ── DATA LAYER (localStorage) ────────────────────────────────
const DB = {
  get(key, def = null) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
  },
  set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch(e) {
      console.warn('[DB] Storage error', e);
      return false;
    }
  }
};

// ── STATE ────────────────────────────────────────────────────
let currentUser  = DB.get('ekz_user');
let profile      = DB.get('ekz_profile', { name:'', age:null, gender:'', notes:'', allergy:'', photo:'' });
let data         = DB.get('ekz_data', []);
let photos       = DB.get('ekz_photos', []);
let sharedWith   = DB.get('ekz_shared', []);
let shareCode    = DB.get('ekz_sharecode', null);
let currentTab   = 'food';
let selRx        = { food:null, cream:null, act:null };
let sel          = { food:[], cream:[], act:[], trig:[] };
let selSev       = null, selSkrab = null, selAge = null, selGender = '';
let davkaNum     = 1;
let photoContext = null; // 'new' or index of comparison photo

// ── DATA CONSTANTS ───────────────────────────────────────────
const AGES = ['0–6 m','6–12 m','1–2 r','2–4 r','4–7 r','7–12 r','12+ r'];

const AGE_FOODS = {
  '0–6 m': ['Mateřské mléko','Umělá výživa'],
  '6–12 m': ['Kaše (rýže)','Kaše (proso)','Mrkev','Brambory','Hrušky','Jablka','Banán','Kuřecí','Krůtí','Hovězí','Cuketa','Špenát'],
  '1–2 r': ['Mléko','Vejce','Pšenice','Rýže','Proso','Kukuřice','Brambory','Mrkev','Hrušky','Jablka','Banán','Borůvky','Kuřecí','Krůtí','Hovězí','Ryby','Luštěniny','Jogurt','Sýr'],
  '2–4 r': ['Mléko','Vejce','Pšenice','Žito','Oves','Rýže','Kukuřice','Brambory','Mrkev','Brokolice','Hrášek','Špenát','Rajče','Jablka','Hrušky','Jahody','Citrusy','Banán','Kuřecí','Hovězí','Ryby','Luštěniny','Jogurt','Sýr','Ořechy','Sója','Med'],
  '4–7 r': ['Mléko','Vejce','Pšenice','Žito','Oves','Rýže','Luštěniny','Zelenina (mix)','Ovoce (mix)','Maso (mix)','Ryby','Ořechy','Sója','Čokoláda','Med','Jogurt','Sýr'],
  '7–12 r': ['Pšenice','Mléko','Vejce','Ořechy','Sója','Jahody','Citrusy','Čokoláda','Ryby','Med','Lepek','Luštěniny','Maso (mix)','Zelenina (mix)','Ovoce (mix)'],
  '12+ r': ['Pšenice','Mléko','Vejce','Ořechy','Sója','Jahody','Citrusy','Čokoláda','Ryby','Med','Lepek','Alkohol','Maso (mix)','Zelenina (mix)','Ovoce (mix)'],
};

const CREAMS   = ['Vazelína','Zinek','Aderma den','Aderma noc','Bioderma Gel','Weleda','Centifolia'];
const ACTS     = ['Koupel','Sprcha','Plavání','Pískoviště','Tráva / zahrada','Procházka','Běh','Doma','Spánek','Školka / škola'];
const TRIGS    = ['Škrábání','Pot','Prach','Pyl','Zvíře','Slunce','Chlor','Syntetika','Teplo','Chlad','Stres','Nové jídlo','Nový krém'];

const RX_OPTS  = [
  {id:'ok',  cls:'rx-ok',  e:'😊', t:'Žádná reakce'},
  {id:'meh', cls:'rx-meh', e:'😐', t:'Mírná reakce'},
  {id:'bad', cls:'rx-bad', e:'😟', t:'Zhoršení'},
  {id:'vbad',cls:'rx-vbad',e:'😣', t:'Silná reakce'},
];
const RXLBL = {
  ok:  {e:'😊',t:'Žádná',   bg:'#D6F5E8',c:'#085041'},
  meh: {e:'😐',t:'Mírná',   bg:'#FFF9EC',c:'#78350F'},
  bad: {e:'😟',t:'Zhoršení',bg:'#FFE5D9',c:'#712B13'},
  vbad:{e:'😣',t:'Silná',   bg:'#FFE5E5',c:'#791F1F'},
};
const SKLBL = ['Vůbec 🙌','Trochu 🤏','Hodně ✋','Pořád 😫'];
const SKB   = [{bg:'#D6F5E8',c:'#085041'},{bg:'#FFF9EC',c:'#78350F'},{bg:'#FFE5D9',c:'#712B13'},{bg:'#FFE5E5',c:'#791F1F'}];
const SEVLBL= ['','Klidný 😊','Mírný 😐','Střední 😟','Silný 😣'];

const TCONF = {
  food:  {dot:'#EF9F27', lbl:'Jídlo',       bg:'#FFF9EC',border:'#F5E6B8',tc:'#92400E'},
  cream: {dot:'#5DCAA5', lbl:'Krém',        bg:'#F5FFFB',border:'#9FE1CB',tc:'#0F6E56'},
  act:   {dot:'#7F77DD', lbl:'Aktivita',    bg:'#FAFAFF',border:'#AFA9EC',tc:'#534AB7'},
  ekzem: {dot:'#F0997B', lbl:'Stav ekzému',bg:'#FFFAF8',border:'#F5C4B3',tc:'#993C1D'},
};

// ── AUTH ─────────────────────────────────────────────────────
function login() {
  const email = document.getElementById('auth-email').value.trim();
  const pass  = document.getElementById('auth-password').value;
  if (!email || !pass) { toast('Vyplňte e-mail a heslo'); return; }
  const users = DB.get('ekz_users', {});
  if (!users[email] || users[email].password !== btoa(pass)) {
    toast('Špatný e-mail nebo heslo'); return;
  }
  currentUser = { email, name: users[email].name };
  DB.set('ekz_user', currentUser);
  loadUserData(email);
  showApp();
}

function register() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-password').value;
  if (!name || !email || !pass) { toast('Vyplňte všechna pole'); return; }
  if (pass.length < 6) { toast('Heslo musí mít aspoň 6 znaků'); return; }
  const users = DB.get('ekz_users', {});
  if (users[email]) { toast('Tento e-mail je již použit'); return; }
  users[email] = { name, password: btoa(pass) };
  DB.set('ekz_users', users);
  currentUser = { email, name };
  DB.set('ekz_user', currentUser);
  showApp();
  toast('Účet vytvořen! Vítejte 🎉');
}

function loginDemo() {
  currentUser = { email: 'demo@ekzem.app', name: 'Demo uživatel' };
  DB.set('ekz_user', currentUser);
  showApp();
  toast('Testovací režim – data se ukládají lokálně');
}

function logout() {
  if (!confirm('Odhlásit se?')) return;
  currentUser = null;
  DB.set('ekz_user', null);
  document.getElementById('screen-app').classList.remove('active');
  document.getElementById('screen-auth').classList.add('active');
}

function showRegister() {
  document.getElementById('auth-login-form').style.display = 'none';
  document.getElementById('auth-register-form').style.display = 'block';
}
function showLogin() {
  document.getElementById('auth-register-form').style.display = 'none';
  document.getElementById('auth-login-form').style.display = 'block';
}

function loadUserData(email) {
  const key = 'ekz_data_' + email.replace(/[^a-z0-9]/g,'_');
  const pkey = 'ekz_profile_' + email.replace(/[^a-z0-9]/g,'_');
  const d = DB.get(key);
  const p = DB.get(pkey);
  if (d) data = d;
  if (p) profile = p;
}

function saveData() {
  if (currentUser && currentUser.email !== 'demo@ekzem.app') {
    const key = 'ekz_data_' + currentUser.email.replace(/[^a-z0-9]/g,'_');
    DB.set(key, data);
  }
  DB.set('ekz_data', data);
}

function saveProfile() {
  let ok = true;
  if (currentUser && currentUser.email !== 'demo@ekzem.app') {
    const key = 'ekz_profile_' + currentUser.email.replace(/[^a-z0-9]/g,'_');
    ok = DB.set(key, profile) && ok;
  }
  ok = DB.set('ekz_profile', profile) && ok;
  return ok;
}

function showApp() {
  document.getElementById('screen-auth').classList.remove('active');
  document.getElementById('screen-app').classList.add('active');
  updateHeader();
  goTab('food');
}

// ── HEADER ───────────────────────────────────────────────────
function updateHeader() {
  document.getElementById('hdr-name').textContent = profile.name || (currentUser?.name || 'Deník ekzému');
  document.getElementById('hdr-sub').textContent  = profile.age
    ? `${profile.age} • ${profile.name ? profile.name + ' • ' : ''}ekzém pod kontrolou`
    : 'nastavte profil dítěte';
  const avatarEl = document.getElementById('hdr-avatar');
  if (profile.photo) {
    // Clear any old content and add img
    avatarEl.textContent = '';
    avatarEl.style.backgroundImage = '';
    const img = document.createElement('img');
    img.src = profile.photo;
    img.alt = '';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
    avatarEl.appendChild(img);
  } else {
    avatarEl.innerHTML = '';
    avatarEl.textContent = profile.gender === 'boy' ? '👦' : profile.gender === 'girl' ? '👧' : '🌟';
  }
}

// ── NAVIGATION ───────────────────────────────────────────────
const NAV_TABS = ['food','cream','ekzem','dnes','foto','more'];

function goTab(tab) {
  currentTab = tab;
  NAV_TABS.forEach(t => {
    const el = document.getElementById('nav-' + t);
    if (el) el.classList.toggle('active', t === tab);
  });
  renderPage(tab);
}

// ── TIME HELPERS ─────────────────────────────────────────────
function fmtTime(d) {
  return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
}
function nowTime() { return fmtTime(new Date()); }

// ── FOOD HELPERS ─────────────────────────────────────────────
function getFoods() { return AGE_FOODS[profile.age] || AGE_FOODS['2–4 r']; }

function getFoodPrevCount(name) {
  return data.filter(r => r.typ === 'food' && (r.extra.foods||[]).includes(name)).length;
}

// ── CHIP BUILDER ─────────────────────────────────────────────
function buildChipsHTML(items, cls, group, selArr) {
  return items.map(it => {
    const on = selArr.includes(it) ? ' on' : '';
    const safe = it.replace(/'/g,"\\'");
    return `<button class="chip ${cls}${on}" onclick="toggleChip('${group}','${safe}',this)">${it}</button>`;
  }).join('');
}

function toggleChip(group, val, el) {
  const arr = group === 'food' ? sel.food : group === 'cream' ? sel.cream : group === 'act' ? sel.act : sel.trig;
  const i = arr.indexOf(val);
  if (i === -1) { arr.push(val); el.classList.add('on'); }
  else           { arr.splice(i,1); el.classList.remove('on'); }
  if (group === 'food') updateDavka();
}

// ── DAVKA ─────────────────────────────────────────────────────
function updateDavka() {
  const panel = document.getElementById('davka-panel');
  if (!panel) return;
  if (sel.food.length === 1) {
    panel.style.display = 'block';
    const name = sel.food[0];
    const prev = getFoodPrevCount(name);
    document.getElementById('davka-food-name').textContent = name;
    document.getElementById('davka-num').textContent = davkaNum;
    const hints = ['','První ochutnávka! Sledujte reakci 24–48 hod.','Druhá dávka – kůže si pamatuje. Pečlivě sledujte.','Třetí dávka – pokud bez reakce, dobrý znak!','Čtvrtá dávka – reakce obvykle do 5. dávky.','Pátá dávka – opakovaná bezpečnost je povzbudivá.'];
    document.getElementById('davka-hint').textContent = prev > 0
      ? `Celkem v deníku: ${prev}× (vč. dnes)`
      : (hints[davkaNum] || '');
  } else {
    panel.style.display = 'none';
    davkaNum = 1;
  }
}

function changeDavka(d) {
  davkaNum = Math.max(1, Math.min(20, davkaNum + d));
  updateDavka();
}

// ── REAKCE ───────────────────────────────────────────────────
function buildRxHTML(group) {
  return RX_OPTS.map(o =>
    `<button class="rb ${o.cls}${selRx[group]===o.id?' on':''}" onclick="setRx('${group}','${o.id}',this)">
      <span class="re">${o.e}</span><span class="rt">${o.t}</span>
    </button>`
  ).join('');
}
function setRx(group, id, btn) {
  selRx[group] = id;
  btn.closest('.rg').querySelectorAll('.rb').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}
function clearRx(group) { selRx[group] = null; }

// ── SEV / SKRAB ──────────────────────────────────────────────
function setSev(v, btn) {
  selSev = v;
  btn.closest('.sg').querySelectorAll('.sb').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}
function setSkrab(v, btn) {
  selSkrab = v;
  btn.closest('.skbg').querySelectorAll('.skb').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}

// ── SAVE ─────────────────────────────────────────────────────
function save(typ) {
  const time = document.getElementById('td-' + typ)?.textContent || nowTime();
  let extra  = {};

  if (typ === 'food') {
    const customRaw = document.getElementById('food-custom')?.value || '';
    const custom    = customRaw.split(',').map(s=>s.trim()).filter(Boolean);
    extra.foods  = [...sel.food, ...custom];
    if (sel.food.length === 1) { extra.davka = davkaNum; extra.davkaFood = sel.food[0]; }
    extra.reakce = selRx.food;
    extra.rxnote = document.getElementById('food-rxnote')?.value || '';
    extra.note   = document.getElementById('food-note')?.value   || '';
    sel.food = []; davkaNum = 1;
    clearRx('food');
  } else if (typ === 'cream') {
    extra.creams = [...sel.cream];
    extra.place  = document.getElementById('cream-place')?.value || '';
    extra.reakce = selRx.cream;
    extra.rxnote = document.getElementById('cream-rxnote')?.value || '';
    extra.note   = document.getElementById('cream-note')?.value   || '';
    sel.cream = [];
    clearRx('cream');
  } else if (typ === 'act') {
    extra.acts   = [...sel.act];
    extra.dur    = document.getElementById('act-dur')?.value    || '';
    extra.reakce = selRx.act;
    extra.rxnote = document.getElementById('act-rxnote')?.value || '';
    extra.note   = document.getElementById('act-note')?.value   || '';
    sel.act = [];
    clearRx('act');
  } else if (typ === 'ekzem') {
    extra.sev       = selSev;
    extra.skrab     = selSkrab;
    extra.skrabPlace= document.getElementById('skrab-place')?.value || '';
    extra.place     = document.getElementById('ekzem-place')?.value || '';
    extra.trigs     = [...sel.trig];
    extra.note      = document.getElementById('ekzem-note')?.value  || '';
    selSev = null; selSkrab = null;
    sel.trig = [];
  }

  data.unshift({ id: Date.now(), date: new Date().toDateString(), time, typ, extra, ageSnap: profile.age });
  saveData();
  toast('Uloženo ✓');
  goTab(typ === 'ekzem' ? 'dnes' : typ === 'act' ? 'dnes' : typ);
}

// ── DESC ─────────────────────────────────────────────────────
function descOf(r) {
  const e = r.extra;
  if (r.typ === 'food')  return (e.foods||[]).join(', ') + (e.davka ? ` · ${e.davka}. dávka` : '') || '–';
  if (r.typ === 'cream') return [(e.creams||[]).join(', '), e.place].filter(Boolean).join(' – ') || '–';
  if (r.typ === 'act')   return [(e.acts||[]).join(', '), e.dur].filter(Boolean).join(' – ')     || '–';
  if (r.typ === 'ekzem') return [e.sev?SEVLBL[e.sev]:'', e.place, ...(e.trigs||[])].filter(Boolean).join(' · ') || '–';
  return '–';
}

// ── TIME PILL INTERACTION ────────────────────────────────────
function editTime(typ) {
  document.getElementById('tr-'+typ).style.display = 'flex';
  document.getElementById('tpill-'+typ).style.display = 'none';
  document.getElementById('ti-'+typ).value = document.getElementById('td-'+typ).textContent;
}
function confirmTime(typ) {
  const v = document.getElementById('ti-'+typ).value;
  if (v) document.getElementById('td-'+typ).textContent = v;
  document.getElementById('tr-'+typ).style.display = 'none';
  document.getElementById('tpill-'+typ).style.display = 'inline-flex';
}
function previewTime(typ) {
  const v = document.getElementById('ti-'+typ).value;
  if (v) document.getElementById('td-'+typ).textContent = v;
}

// ── TIME PILL HTML ────────────────────────────────────────────
function timePillHTML(typ, accentBg, accentColor, borderColor) {
  const t = nowTime();
  return `
    <div id="tpill-${typ}">
      <button class="tpill" style="background:${accentBg};color:${accentColor}" onclick="editTime('${typ}')">
        ⏰ <span id="td-${typ}">${t}</span> ✏️
      </button>
    </div>
    <div class="trow" id="tr-${typ}" style="display:none;border-color:${borderColor};background:${accentBg}">
      <input type="time" id="ti-${typ}" style="color:${accentColor}" oninput="previewTime('${typ}')">
      <button class="tconf" style="background:${borderColor};color:${accentColor}" onclick="confirmTime('${typ}')">Ok</button>
    </div>`;
}

// ── PAGE RENDERER ─────────────────────────────────────────────
function renderPage(tab) {
  const el = document.getElementById('page-content');
  switch(tab) {
    case 'food':   el.innerHTML = renderFood();   break;
    case 'cream':  el.innerHTML = renderCream();  break;
    case 'act':    el.innerHTML = renderAct();    break;
    case 'ekzem':  el.innerHTML = renderEkzem();  break;
    case 'dnes':   el.innerHTML = renderDnes();   break;
    case 'foto':   el.innerHTML = renderFoto();   break;
    case 'more':   el.innerHTML = renderMore();   break;
    case 'vzorce': el.innerHTML = renderVzorce(); break;
    case 'tipy':   el.innerHTML = renderTipy();   break;
    case 'share':  el.innerHTML = renderShare();  break;
    case 'profil':
      el.innerHTML = renderProfil();
      // Inject photo via JS to avoid HTML/CSS escaping issues with data URLs
      if (profile.photo) {
        const container = document.getElementById('prof-avatar-big');
        if (container) {
          const img = document.createElement('img');
          img.src = profile.photo;
          img.style.cssText = 'width:120px;height:120px;object-fit:cover;display:block';
          container.innerHTML = '';
          container.appendChild(img);
        }
      }
      break;
  }
}

// ── FOOD PAGE ────────────────────────────────────────────────
function renderFood() {
  sel.food = []; davkaNum = 1;
  return `<div class="kcard kc-food">
    <div class="section-title">⏰ Čas záznamu</div>
    ${timePillHTML('food','#F5E6B8','#92400E','#D97706')}
    <div class="section-title" style="margin-top:14px">🥗 Co jedlo?</div>
    <div class="cw">${buildChipsHTML(getFoods(),'cf','food',sel.food)}</div>
    <input class="inp" id="food-custom" placeholder="Vlastní jídlo (oddělte čárkou)…">
    <div id="davka-panel" style="display:none;margin-top:12px">
      <div class="davka-wrap">
        <div class="davka-title">🔢 Kolikátá dávka tohoto jídla?</div>
        <div style="font-size:13px;color:#B45309;margin-bottom:10px" id="davka-food-name"></div>
        <div class="davka-counter">
          <button class="dc-btn" onclick="changeDavka(-1)">−</button>
          <div style="text-align:center">
            <div class="dc-num" id="davka-num">1</div>
            <div class="dc-sub">dávka</div>
          </div>
          <button class="dc-btn" onclick="changeDavka(1)">+</button>
        </div>
        <div class="davka-hint" id="davka-hint" style="margin-top:10px"></div>
      </div>
    </div>
    <div class="section-title" style="margin-top:14px">😊 Jak reagovala?</div>
    <div class="rg">${buildRxHTML('food')}</div>
    <span class="inp-label">Detaily reakce</span>
    <textarea class="inp" id="food-rxnote" placeholder="Zarudnutí, vyrážka, svědění…"></textarea>
    <span class="inp-label">Poznámka</span>
    <textarea class="inp" id="food-note" placeholder="Cokoli dalšího…"></textarea>
    <button class="savbtn sv-food" onclick="save('food')" style="margin-top:14px">💾 Uložit jídlo</button>
  </div>`;
}

// ── CREAM PAGE ───────────────────────────────────────────────
function renderCream() {
  sel.cream = [];
  return `<div class="kcard kc-cream">
    <div class="section-title">⏰ Čas záznamu</div>
    ${timePillHTML('cream','#D6F5E8','#0F6E56','#5DCAA5')}
    <div class="section-title" style="margin-top:14px">🧴 Přípravek</div>
    <div class="cw">${buildChipsHTML(CREAMS,'cc','cream',sel.cream)}</div>
    <span class="inp-label">Místo aplikace</span>
    <input class="inp" id="cream-place" placeholder="Tváře, záda, lokty…">
    <div class="section-title" style="margin-top:14px">😊 Jak reagovala?</div>
    <div class="rg">${buildRxHTML('cream')}</div>
    <span class="inp-label">Detaily reakce</span>
    <textarea class="inp" id="cream-rxnote" placeholder="Zhoršení, zlepšení, zarudnutí…"></textarea>
    <span class="inp-label">Poznámka</span>
    <textarea class="inp" id="cream-note" placeholder="Cokoli dalšího…"></textarea>
    <button class="savbtn sv-cream" onclick="save('cream')" style="margin-top:14px">💾 Uložit krém</button>
  </div>`;
}

// ── ACT PAGE ─────────────────────────────────────────────────
function renderAct() {
  sel.act = [];
  return `<div class="kcard kc-act">
    <div class="section-title">⏰ Čas záznamu</div>
    ${timePillHTML('act','#EAE8FF','#534AB7','#AFA9EC')}
    <div class="section-title" style="margin-top:14px">🏃 Aktivita</div>
    <div class="cw">${buildChipsHTML(ACTS,'ca','act',sel.act)}</div>
    <span class="inp-label">Délka</span>
    <input class="inp" id="act-dur" placeholder="Např. 30 minut">
    <div class="section-title" style="margin-top:14px">😊 Jak reagovala?</div>
    <div class="rg">${buildRxHTML('act')}</div>
    <span class="inp-label">Detaily reakce</span>
    <textarea class="inp" id="act-rxnote" placeholder="Zarudnutí po koupeli, pot…"></textarea>
    <span class="inp-label">Poznámka</span>
    <textarea class="inp" id="act-note" placeholder="Cokoli dalšího…"></textarea>
    <button class="savbtn sv-act" onclick="save('act')" style="margin-top:14px">💾 Uložit aktivitu</button>
  </div>`;
}

// ── EKZEM PAGE ────────────────────────────────────────────────
function renderEkzem() {
  sel.trig = [];
  return `<div class="kcard kc-ekzem">
    <div class="section-title">⏰ Čas záznamu</div>
    ${timePillHTML('ekzem','#FFE5D9','#993C1D','#F5C4B3')}
    <div class="section-title" style="margin-top:14px">🔴 Jak vypadá ekzém?</div>
    <div class="sg">
      <button class="sb s1" data-sev="1" onclick="setSev(1,this)"><span class="se">😊</span>Klidný</button>
      <button class="sb s2" data-sev="2" onclick="setSev(2,this)"><span class="se">😐</span>Mírný</button>
      <button class="sb s3" data-sev="3" onclick="setSev(3,this)"><span class="se">😟</span>Střední</button>
      <button class="sb s4" data-sev="4" onclick="setSev(4,this)"><span class="se">😣</span>Silný</button>
    </div>
    <div class="skw">
      <div class="skt">✋ Jak moc se škrábala?</div>
      <div class="skbg">
        <button class="skb sk0" onclick="setSkrab(0,this)"><span class="ske">🙌</span><span class="skt2">Vůbec</span></button>
        <button class="skb sk1" onclick="setSkrab(1,this)"><span class="ske">🤏</span><span class="skt2">Trochu</span></button>
        <button class="skb sk2" onclick="setSkrab(2,this)"><span class="ske">✋</span><span class="skt2">Hodně</span></button>
        <button class="skb sk3" onclick="setSkrab(3,this)"><span class="ske">😫</span><span class="skt2">Pořád</span></button>
      </div>
      <input class="inp" id="skrab-place" placeholder="Kde se škrábala?" style="margin-top:10px;background:#fff">
    </div>
    <span class="inp-label">Kde je ekzém?</span>
    <input class="inp" id="ekzem-place" placeholder="Tváře, lokty, záda…">
    <div class="section-title" style="margin-top:14px">⚠️ Možné spouštěče</div>
    <div class="cw">${buildChipsHTML(TRIGS,'ct','trig',sel.trig)}</div>
    <span class="inp-label">Poznámka</span>
    <textarea class="inp" id="ekzem-note" placeholder="Co se dnes dělo jinak?"></textarea>
    <button class="savbtn sv-ekzem" onclick="save('ekzem')" style="margin-top:14px">💾 Uložit stav ekzému</button>
  </div>`;
}

// ── DNES PAGE ─────────────────────────────────────────────────
function renderDnes() {
  const today = new Date().toDateString();
  const items  = data.filter(r => r.date === today).sort((a,b) => a.time.localeCompare(b.time));
  const dateStr = new Date().toLocaleDateString('cs-CZ',{weekday:'long',day:'numeric',month:'long'});

  if (!items.length) return `
    <div class="empty-state">
      <div class="empty-icon">📝</div>
      <div class="empty-text">Dnes ještě žádné záznamy.<br>Začněte prvním zápisem!</div>
    </div>`;

  return `<div style="font-size:13px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;padding:0 2px">${dateStr}</div>` +
    items.map((r, i) => {
      const c = TCONF[r.typ] || TCONF.food;
      let badges = '';
      if (r.extra.reakce && RXLBL[r.extra.reakce]) {
        const rx = RXLBL[r.extra.reakce];
        badges += `<span class="badge" style="background:${rx.bg};color:${rx.c}">${rx.e} ${rx.t}</span>`;
      }
      if (r.typ === 'ekzem' && r.extra.skrab != null)
        badges += `<span class="badge" style="background:${SKB[r.extra.skrab].bg};color:${SKB[r.extra.skrab].c}">Škrábání: ${SKLBL[r.extra.skrab]}</span>`;
      if (r.typ === 'food' && r.extra.davka)
        badges += `<span class="badge" style="background:#FFF9EC;color:#92400E">${r.extra.davka}. dávka</span>`;

      return `<div class="tl-item">
        <div class="tl-l">
          <span class="tl-t">${r.time}</span>
          <div class="tl-dot" style="background:${c.dot}"></div>
          ${i < items.length-1 ? '<div class="tl-cn"></div>' : ''}
        </div>
        <div class="tl-b" style="background:${c.bg};border-color:${c.border}">
          <div class="tl-tp" style="color:${c.tc}">${c.lbl}</div>
          <div class="tl-ds">${descOf(r)}</div>
          ${badges ? `<div>${badges}</div>` : ''}
          ${r.extra.rxnote ? `<div class="tl-nt">${r.extra.rxnote}</div>` : ''}
          ${r.extra.skrabPlace ? `<div class="tl-nt">Škrábala se: ${r.extra.skrabPlace}</div>` : ''}
          ${r.extra.note ? `<div class="tl-nt">${r.extra.note}</div>` : ''}
        </div>
      </div>`;
    }).join('');
}

// ── FOTO PAGE ─────────────────────────────────────────────────
function renderFoto() {
  const lastPhotos = photos.slice(-4).reverse();
  return `
    <div class="kcard kc-photo">
      <div class="section-title">📷 Fotografický deník ekzému</div>
      <p style="font-size:13px;color:#666;margin-bottom:14px;line-height:1.5">Foťte pravidelně stejná místa. AI porovná fotky a řekne vám, jestli se ekzém zlepšil nebo zhoršil.</p>
      <button class="photo-capture-btn" onclick="triggerPhoto('new')">
        📸 Vyfotit ekzém teď
      </button>
      ${lastPhotos.length >= 2 ? `
        <button class="action-btn ab-blue" onclick="analyzePhotos(${lastPhotos.length-1}, ${lastPhotos.length-2})" style="margin-top:4px">
          🔍 Porovnat poslední dvě fotky
        </button>` : ''}
    </div>
    ${lastPhotos.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">📷</div>
        <div class="empty-text">Zatím žádné fotky.<br>Vyfotěte první snímek ekzému!</div>
      </div>` : `
    <div class="section-label">Fotogalerie</div>
    <div class="photo-grid">
      ${lastPhotos.map((p, i) => `
        <div class="photo-thumb" onclick="analyzePhotos(0, ${i+1})">
          <img src="${p.data}" alt="Fotka ekzému ${p.date}">
          <div class="photo-date">${p.date} ${p.time}</div>
        </div>`).join('')}
    </div>`}
    <div id="analysis-result"></div>`;
}

function triggerPhoto(ctx) {
  photoContext = ctx;
  document.getElementById('file-input').click();
}

function handlePhotoUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const photo = {
      id: Date.now(),
      date: new Date().toLocaleDateString('cs-CZ'),
      time: nowTime(),
      data: e.target.result,
      note: ''
    };
    photos.unshift(photo);
    DB.set('ekz_photos', photos);
    toast('Fotka uložena ✓');
    renderPage('foto');
  };
  reader.readAsDataURL(file);
  input.value = '';
}

async function analyzePhotos(idx1, idx2) {
  if (photos.length < 2) { toast('Potřebujete aspoň 2 fotky'); return; }
  const p1 = photos[idx1];
  const p2 = photos[idx2];
  if (!p1 || !p2) { toast('Fotky nenalezeny'); return; }

  const box = document.getElementById('analysis-result');
  box.innerHTML = `<div class="analysis-box">
    <div class="analysis-title">🔍 Analyzuji fotky…</div>
    <div class="analysis-loading"><div class="spinner"></div> Porovnávám snímky ekzému…</div>
  </div>`;

  try {
    const response = await fetch('/api/analyze-photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photo1: p1.data,
        photo2: p2.data,
        date1: p1.date + ' ' + p1.time,
        date2: p2.date + ' ' + p2.time,
        childAge: profile.age || '',
        childName: profile.name || ''
      })
    });

    const result = await response.json();

    if (!response.ok) {
      box.innerHTML = `<div class="analysis-box">
        <div class="analysis-title" style="color:#A32D2D">⚠️ Chyba analýzy</div>
        <div class="analysis-body">${result.error || 'Neznámá chyba'}</div>
      </div>`;
      return;
    }

    // Render with markdown-like formatting
    const formatted = (result.analysis || 'Analýza se nezdařila.')
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#185FA5">$1</strong>')
      .replace(/\n\n/g, '</p><p style="margin-top:10px">')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');

    box.innerHTML = `<div class="analysis-box">
      <div class="analysis-title">🔍 Porovnání: ${p2.date} ${p2.time} → ${p1.date} ${p1.time}</div>
      <div class="analysis-body">${formatted}</div>
    </div>`;
  } catch (err) {
    box.innerHTML = `<div class="analysis-box">
      <div class="analysis-title" style="color:#A32D2D">⚠️ Chyba spojení</div>
      <div class="analysis-body">Nepodařilo se připojit k AI funkci. Zkontrolujte internetové připojení.</div>
    </div>`;
  }
}

// ── MORE PAGE ─────────────────────────────────────────────────
function renderMore() {
  const today = new Date().toDateString();
  const todayCount = data.filter(r => r.date === today).length;
  const totalDays = new Set(data.map(r => r.date)).size;
  return `
    <div class="kcard" style="border-color:#F5E6B8;background:#FFFDF5">
      <div class="section-title">👋 Ahoj, ${currentUser?.name || 'rodičo'}!</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px">
        <div style="background:#fff;border-radius:12px;border:1.5px solid #e8e8e8;padding:14px;text-align:center">
          <div style="font-size:26px;font-weight:700;color:#D97706">${todayCount}</div>
          <div style="font-size:11px;color:#666;margin-top:3px">záznamy dnes</div>
        </div>
        <div style="background:#fff;border-radius:12px;border:1.5px solid #e8e8e8;padding:14px;text-align:center">
          <div style="font-size:26px;font-weight:700;color:#534AB7">${totalDays}</div>
          <div style="font-size:11px;color:#666;margin-top:3px">dní v deníku</div>
        </div>
      </div>
    </div>
    <div class="section-label">Záznamy a analýza</div>
    <button class="action-btn ab-orange" onclick="goTab('dnes')">📋 Záznamy dnes</button>
    <button class="action-btn ab-orange" onclick="goTab('vzorce')">📊 Vzorce a statistiky</button>
    <button class="action-btn ab-orange" onclick="exportForDoctor()">📄 Exportovat pro lékaře</button>
    <div class="section-label">Pomoc a tipy</div>
    <button class="action-btn ab-green" onclick="goTab('tipy')">💡 Rady a tipy</button>
    <button class="action-btn ab-blue" onclick="goTab('share')">👥 Sdílení s rodinou</button>
    <div class="section-label">Nastavení</div>
    <button class="action-btn ab-blue" onclick="goTab('profil')">👶 Profil dítěte</button>
    <button class="action-btn ab-red" onclick="logout()">🚪 Odhlásit se</button>
    <div class="version-tag">Deník ekzému v${APP_VERSION}</div>`;
}

// ── VZORCE PAGE ───────────────────────────────────────────────
function renderVzorce() {
  const eks   = data.filter(r => r.typ === 'ekzem' && r.extra.sev);
  const total = data.length;
  const avgSev = eks.length ? (eks.reduce((s,r)=>s+r.extra.sev,0)/eks.length).toFixed(1) : '–';
  const skD   = data.filter(r => r.typ === 'ekzem' && r.extra.skrab != null);
  const avgSk = skD.length ? (skD.reduce((s,r)=>s+r.extra.skrab,0)/skD.length).toFixed(1) : '–';
  const foods = new Set(data.filter(r => r.typ === 'food').flatMap(r => r.extra.foods||[]));
  const bad   = data.filter(r => r.typ === 'ekzem' && r.extra.sev >= 3).length;

  const trigC  = {};
  data.filter(r=>r.typ==='ekzem').forEach(r=>(r.extra.trigs||[]).forEach(t=>{trigC[t]=(trigC[t]||0)+1;}));
  const foodBad= {};
  data.filter(r=>r.typ==='food'&&(r.extra.reakce==='bad'||r.extra.reakce==='vbad')).forEach(r=>(r.extra.foods||[]).forEach(f=>{foodBad[f]=(foodBad[f]||0)+1;}));
  const creamC = {}; const creamRx = {};
  data.filter(r=>r.typ==='cream').forEach(r=>(r.extra.creams||[]).forEach(c=>{creamC[c]=(creamC[c]||0)+1;if(r.extra.reakce){if(!creamRx[c])creamRx[c]={};creamRx[c][r.extra.reakce]=(creamRx[c][r.extra.reakce]||0)+1;}}));

  const mT=Math.max(1,...Object.values(trigC));
  const mF=Math.max(1,...Object.values(foodBad));
  const mC=Math.max(1,...Object.values(creamC));

  let patterns = '';
  if(Object.keys(trigC).length) {
    patterns += `<div class="section-label">Spouštěče ekzému</div>`;
    patterns += Object.entries(trigC).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`
      <div class="pattern-item"><span class="pn">${k}</span><div class="pbw"><div class="pb" style="width:${Math.round(v/mT*100)}%;background:#F0997B"></div></div><span class="pct">${v}×</span></div>`).join('');
  }
  if(Object.keys(foodBad).length) {
    patterns += `<div class="section-label">Jídla se špatnou reakcí</div>`;
    patterns += Object.entries(foodBad).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`
      <div class="pattern-item"><span class="pn">${k}</span><div class="pbw"><div class="pb" style="width:${Math.round(v/mF*100)}%;background:#EF9F27"></div></div><span class="pct">${v}×</span></div>`).join('');
  }
  if(Object.keys(creamC).length) {
    patterns += `<div class="section-label">Krémy – reakce</div>`;
    patterns += Object.entries(creamC).sort((a,b)=>b[1]-a[1]).map(([k,v])=>{
      const rx=creamRx[k]||{};
      const rs=Object.entries(rx).filter(([,n])=>n>0).map(([id,n])=>RXLBL[id]?`${RXLBL[id].e}${n}×`:'').join(' ');
      return `<div class="pattern-item"><span class="pn">${k}</span><div class="pbw"><div class="pb" style="width:${Math.round(v/mC*100)}%;background:#5DCAA5"></div></div><span class="pct" style="font-size:11px;min-width:60px">${rs||v+'×'}</span></div>`;
    }).join('');
  }

  return `
    <div class="stat-grid">
      <div class="stat-box"><div class="stat-n" style="color:#D97706">${total}</div><div class="stat-l">Záznamy celkem</div></div>
      <div class="stat-box"><div class="stat-n" style="color:#D85A30">${avgSev}</div><div class="stat-l">Průměrná závažnost</div></div>
      <div class="stat-box"><div class="stat-n" style="color:#A32D2D">${bad}</div><div class="stat-l">Silné záchvaty</div></div>
      <div class="stat-box"><div class="stat-n" style="color:#1D9E75">${foods.size}</div><div class="stat-l">Různá jídla</div></div>
    </div>
    ${patterns || '<div class="empty-state"><div class="empty-icon">📈</div><div class="empty-text">Přidejte více záznamů<br>pro zobrazení vzorců.</div></div>'}
    <button class="action-btn ab-green" style="margin-top:12px" onclick="exportForDoctor()">📄 Exportovat pro lékaře</button>`;
}

// ── TIPY PAGE ─────────────────────────────────────────────────
const TIPS = {
  '0–6 m':[
    {e:'🤱',t:'Kojení a ekzém',b:'Kojení do 6 měsíců chrání před atopií. Sledujte co jíte – alergeny procházejí do mléka.'},
    {e:'🛁',t:'Koupání kojence',b:'Max. 1× denně, 32–35 °C, 5–10 minut. Do 3 minut po koupeli naneste hydratační krém.'},
    {e:'🌡️',t:'Teplota pokoje',b:'Ideálně 18–20 °C, vlhkost 40–50 %. Přehřívání výrazně zhoršuje ekzém.'},
  ],
  '6–12 m':[
    {e:'🥕',t:'Zavádění příkrmů',b:'Jedno nové jídlo každých 3–5 dní. Zapisujte reakce – deník vám pomůže odhalit alergeny.'},
    {e:'🥚',t:'Vajíčka a alergie',b:'Nejprve vařené vejce (méně alergní). Sledujte kůži 24–48 hodin.'},
    {e:'💧',t:'Hydratace',b:'2× denně, ~250 g krému týdně je normální množství pro kojence.'},
  ],
  '1–2 r':[
    {e:'✂️',t:'Nehty a škrábání',b:'Stříhejte co nejkratší. Večer bavlněné rukavičky zabrání škrábání ve spánku.'},
    {e:'😴',t:'Spánek a svědění',b:'Svědění je nejhorší v noci. Chladnější ložnice 17–19 °C a hydratace před spaním pomáhají.'},
    {e:'🏠',t:'Domácí prostředí',b:'Větrání, utírání prachu vlhkým hadrem, bez silných čisticích prostředků.'},
  ],
  '2–4 r':[
    {e:'🌳',t:'Pyl a venku',b:'Po příchodu z venku okamžitě vykoupejte a převlékněte. Nejhorší pylová zátěž je 6–10 h.'},
    {e:'🏊',t:'Plavání a chlor',b:'Před plaváním tučný krém jako bariéra, po plavání ihned sprchovat a hydratovat.'},
    {e:'🧴',t:'Kortikosteroidy',b:'Jen na postižená místa, ne preventivně. Vždy přes vrstvu hydratačního krému.'},
  ],
  '4–7 r':[
    {e:'🏫',t:'Školka',b:'Informujte učitelky. Nechejte krém ve školce. Pískoviště, tráva a zvířata mohou být spouštěče.'},
    {e:'🌞',t:'Opalovací krémy',b:'Minerální krémy s oxidem zinečnatým. Chemické filtry mohou dráždit citlivou kůži.'},
    {e:'🧠',t:'Stres a ekzém',b:'Stres přímo aktivuje zánět v kůži. Klidné prostředí a rituály pomáhají.'},
  ],
  '7–12 r':[
    {e:'🏃',t:'Sport a pocení',b:'Po sportu ihned vlažná sprcha a hydratace. V létě preferujte klimatizované prostředí.'},
    {e:'💊',t:'Biologická léčba',b:'Pokud lokální léčba nestačí, od 6 let existuje biologická léčba (dupilumab).'},
  ],
  '12+ r':[
    {e:'😤',t:'Psychologický dopad',b:'Ekzém v pubertě výrazně ovlivňuje sebevědomí. Podpora a psychologická pomoc jsou klíčové.'},
    {e:'💆',t:'Proaktivní léčba',b:'Nanášejte slabý kortikoid 2× týdně i na klidnou kůži na místech, kde se ekzém opakuje.'},
  ],
};
const TIPS_GENERAL = [
  {e:'🌊',t:'Emolienční terapie',b:'Základ léčby: hydratace 2× denně. Nanášejte po koupeli do 3 minut, pohybem dolů – ne třením.'},
  {e:'🧼',t:'Správné koupání',b:'Vlažná voda (32–35 °C), max. 10 minut. Po koupeli jemně osušte a ihned hydratujte.'},
  {e:'📋',t:'Deník pro lékaře',b:'Exportujte záznamy před každou návštěvou dermatologa. Chronologický přehled má velkou hodnotu.'},
];

function renderTipy() {
  const tips = [...(TIPS[profile.age] || []), ...TIPS_GENERAL];
  return tips.map(t => `
    <div class="tip-card">
      <div class="tip-hdr">
        <div class="tip-icon">${t.e}</div>
        <div class="tip-title">${t.t}</div>
      </div>
      <div class="tip-body">${t.b}</div>
    </div>`).join('');
}

// ── SHARE PAGE ────────────────────────────────────────────────
function generateShareCode() {
  shareCode = Math.floor(100000 + Math.random() * 900000).toString();
  DB.set('ekz_sharecode', shareCode);
  renderPage('share');
}

function joinShared() {
  const code = document.getElementById('join-code')?.value.trim();
  if (!code || code.length !== 6) { toast('Zadejte 6místný kód'); return; }
  toast('Připojeno ke sdílenému profilu ✓');
}

function renderShare() {
  if (!shareCode) generateShareCode();
  return `
    <div class="kcard kc-share">
      <div class="section-title">👥 Sdílejte deník s rodinou</div>
      <p style="font-size:13px;color:#666;margin-bottom:16px;line-height:1.5">Dejte kód partnerovi nebo prarodičům – budou moci přidávat záznamy a vidět statistiky.</p>
      <div class="share-code">
        <div class="share-code-num">${shareCode}</div>
        <div class="share-code-lbl">Váš sdílecí kód</div>
      </div>
      <button class="savbtn sv-cream" onclick="copyShareCode()">📋 Zkopírovat kód</button>
    </div>
    <div class="kcard" style="margin-top:12px">
      <div class="section-title">🔗 Připojit se ke sdílenému profilu</div>
      <p style="font-size:13px;color:#666;margin-bottom:12px">Máte kód od někoho jiného? Zadejte ho sem.</p>
      <input class="inp" id="join-code" placeholder="6místný kód" maxlength="6" inputmode="numeric">
      <button class="savbtn sv-purple" onclick="joinShared()" style="margin-top:10px">🔗 Připojit se</button>
    </div>
    <div class="kcard" style="margin-top:12px">
      <div class="section-title">📊 Sdílet statistiky jako odkaz</div>
      <p style="font-size:13px;color:#666;margin-bottom:12px">Vygenerujte odkaz se souhrnem pro lékaře nebo rodinu.</p>
      <button class="action-btn ab-blue" onclick="exportForDoctor()">📄 Exportovat pro lékaře</button>
    </div>`;
}

function copyShareCode() {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(shareCode).then(() => toast('Kód zkopírován ✓'));
  } else {
    toast('Kód: ' + shareCode);
  }
}

// ── PROFIL PAGE ───────────────────────────────────────────────
function renderProfil() {
  const hasPhoto = !!profile.photo;
  const fallback = profile.gender === 'boy' ? '👦' : profile.gender === 'girl' ? '👧' : '🌟';
  // Render img with empty src; we'll set it via JS to avoid HTML escaping issues
  return `
    <div class="kcard kc-prof" style="border-color:#AFA9EC;background:#F8F8FF">
      <div style="position:relative;width:120px;margin:0 auto 8px">
        <div id="prof-avatar-big" style="width:120px;height:120px;border-radius:50%;background:#FDE68A;display:flex;align-items:center;justify-content:center;font-size:54px;cursor:pointer;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)" onclick="triggerProfilePhoto()">
          ${hasPhoto ? '' : `<span>${fallback}</span>`}
        </div>
        <div style="position:absolute;bottom:2px;right:2px;width:36px;height:36px;border-radius:50%;background:#534AB7;display:flex;align-items:center;justify-content:center;border:3px solid #F8F8FF;cursor:pointer;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,.15)" onclick="triggerProfilePhoto()" title="Změnit fotku">📷</div>
      </div>
      <div style="text-align:center;margin-bottom:16px">
        ${hasPhoto
          ? `<button onclick="removeProfilePhoto()" style="background:none;border:none;color:#A32D2D;font-size:13px;cursor:pointer;text-decoration:underline;font-family:inherit">🗑 Odstranit fotku</button>`
          : `<button onclick="triggerProfilePhoto()" style="background:none;border:none;color:#534AB7;font-size:13px;cursor:pointer;text-decoration:underline;font-family:inherit;font-weight:600">📷 Nahrát profilovou fotku</button>`
        }
      </div>
      <span class="inp-label" style="margin-top:0">Jméno dítěte</span>
      <input class="inp" id="prof-name" value="${profile.name}" placeholder="Jméno dítěte…">
      <span class="inp-label">Věk</span>
      <div class="agesel">${AGES.map(a=>`<button class="agebtn${profile.age===a?' on':''}" onclick="pickAge('${a}',this)">${a}</button>`).join('')}</div>
      <span class="inp-label" style="margin-top:14px">Pohlaví</span>
      <div class="gender-row">
        <button class="gender-btn${profile.gender==='girl'?' on':''}" onclick="pickGender('girl',this)">👧 Holka</button>
        <button class="gender-btn${profile.gender==='boy'?' on':''}" onclick="pickGender('boy',this)">👦 Kluk</button>
      </div>
      <span class="inp-label">Diagnóza / poznámky lékaře</span>
      <textarea class="inp" id="prof-notes" placeholder="Atopický ekzém, předepsané léky…">${profile.notes}</textarea>
      <span class="inp-label">Známé alergeny</span>
      <input class="inp" id="prof-allergy" value="${profile.allergy}" placeholder="Mléko, vejce, ořechy…">
      <button class="savbtn sv-purple" onclick="saveProfilForm()" style="margin-top:16px">✅ Uložit profil</button>
    </div>
    <div class="kcard" style="margin-top:12px">
      <div class="section-title">👤 Váš účet</div>
      <p style="font-size:14px;color:#666;margin-bottom:4px">Přihlášen jako: <strong>${currentUser?.email || '–'}</strong></p>
      <p style="font-size:13px;color:#999">Záznamy jsou uloženy v tomto zařízení.</p>
    </div>`;
}

function triggerProfilePhoto() {
  let input = document.getElementById('profile-photo-input');
  if (input) input.remove();

  input = document.createElement('input');
  input.id = 'profile-photo-input';
  input.type = 'file';
  input.accept = 'image/*';
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  input.style.opacity = '0';
  document.body.appendChild(input);

  input.addEventListener('change', handleProfilePhotoSelected);
  input.click();
}

function handleProfilePhotoSelected(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) {
    toast('Žádná fotka nebyla vybrána');
    return;
  }

  // Show file info as toast for debugging
  const sizeKB = Math.round(file.size / 1024);
  toast(`Načítám: ${file.type || '?'} ${sizeKB} KB`);

  if (file.size > 15 * 1024 * 1024) {
    toast('Fotka je moc velká (max 15 MB)');
    return;
  }

  // Use createImageBitmap if available – best support
  if (window.createImageBitmap) {
    createImageBitmap(file).then(bitmap => {
      toast(`Zpracovávám ${bitmap.width}×${bitmap.height}px…`);
      processBitmap(bitmap);
      bitmap.close && bitmap.close();
    }).catch(err => {
      toast('Bitmap selhal, zkouším FileReader');
      fallbackFileReader(file);
    });
  } else {
    fallbackFileReader(file);
  }
}

function processBitmap(bitmap) {
  try {
    const SIZE = 240;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');

    const min = Math.min(bitmap.width, bitmap.height);
    if (!min || min < 10) {
      toast('Fotka má neplatné rozměry');
      return;
    }
    const sx = (bitmap.width - min) / 2;
    const sy = (bitmap.height - min) / 2;
    ctx.drawImage(bitmap, sx, sy, min, min, 0, 0, SIZE, SIZE);
    const resized = canvas.toDataURL('image/jpeg', 0.75);
    console.log('[Photo] Resized via bitmap:', resized.length, 'bytes');
    saveProfilePhoto(resized);
  } catch (err) {
    console.error('[Photo] Bitmap canvas error', err);
    toast('Chyba při zpracování fotky');
  }
}

function fallbackFileReader(file) {
  console.log('[Photo] Using FileReader fallback');
  const reader = new FileReader();
  let timeout = setTimeout(() => {
    toast('Fotka se nenačetla (timeout). Zkuste menší fotku nebo JPG.');
    console.error('[Photo] FileReader timeout');
  }, 15000);

  reader.onerror = () => {
    clearTimeout(timeout);
    toast('Chyba při čtení fotky');
    console.error('[Photo] FileReader error', reader.error);
  };

  reader.onload = (ev) => {
    clearTimeout(timeout);
    const dataUrl = ev.target.result;
    if (!dataUrl || typeof dataUrl !== 'string') {
      toast('Fotka se nenačetla');
      return;
    }

    const img = new Image();
    let imgTimeout = setTimeout(() => {
      console.warn('[Photo] Image() load timeout');
      // Save raw if small enough
      if (dataUrl.length < 500000) {
        saveProfilePhoto(dataUrl);
      } else {
        toast('Fotka se nepodařilo zpracovat (timeout). Zkuste JPG formát.');
      }
    }, 10000);

    img.onerror = () => {
      clearTimeout(imgTimeout);
      console.warn('[Photo] Image() failed');
      if (dataUrl.length < 500000) {
        saveProfilePhoto(dataUrl);
      } else {
        toast('Tento formát se nepodařilo načíst. Zkuste JPG nebo PNG.');
      }
    };

    img.onload = () => {
      clearTimeout(imgTimeout);
      try {
        const SIZE = 240;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        const min = Math.min(img.width, img.height);
        if (!min || min < 10) {
          toast('Fotka má neplatné rozměry');
          return;
        }
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, SIZE, SIZE);
        const resized = canvas.toDataURL('image/jpeg', 0.75);
        saveProfilePhoto(resized);
      } catch (err) {
        console.error('[Photo] Canvas error', err);
        toast('Chyba při zpracování fotky');
      }
    };

    img.src = dataUrl;
  };

  reader.readAsDataURL(file);
}

function saveProfilePhoto(dataUrl) {
  console.log('[Photo] Saving, length:', dataUrl.length, 'bytes (~' + Math.round(dataUrl.length/1024) + ' KB)');
  profile.photo = dataUrl;

  const ok = saveProfile();
  console.log('[Photo] saveProfile returned:', ok);

  // Verify it was actually saved
  const verify = DB.get('ekz_profile');
  console.log('[Photo] Verify – stored photo length:', verify?.photo?.length || 0);

  if (!verify?.photo) {
    profile.photo = '';
    toast('⚠️ Úložiště plné. Vymažte starší fotky ekzému v záložce 📷');
    return;
  }

  updateHeader();
  // Force re-render of profil page
  if (currentTab === 'profil') {
    renderPage('profil');
  } else {
    goTab('profil');
  }
  toast('Fotka nahrána ✓ (' + Math.round(dataUrl.length/1024) + ' KB)');
}

function removeProfilePhoto() {
  if (!confirm('Odstranit profilovou fotku?')) return;
  profile.photo = '';
  saveProfile();
  updateHeader();
  renderPage('profil');
  toast('Fotka odstraněna');
}

function pickAge(age, btn) {
  selAge = age;
  document.querySelectorAll('.agesel .agebtn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}
function pickGender(g, btn) {
  selGender = g;
  document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  if (!profile.photo) {
    document.getElementById('prof-avatar-big').textContent = g === 'boy' ? '👦' : '👧';
  }
}

function saveProfilForm() {
  profile.name    = document.getElementById('prof-name')?.value.trim() || profile.name;
  profile.age     = selAge || profile.age;
  profile.gender  = selGender || profile.gender;
  profile.notes   = document.getElementById('prof-notes')?.value || '';
  profile.allergy = document.getElementById('prof-allergy')?.value || '';
  saveProfile();
  updateHeader();
  toast('Profil uložen ✓');
}

// ── EXPORT ────────────────────────────────────────────────────
function exportForDoctor() {
  const lines = ['DENÍK EKZÉMU – EXPORT PRO LÉKAŘE', '='.repeat(44)];
  if (profile.name) lines.push(`Dítě: ${profile.name}, věk: ${profile.age || '–'}`);
  if (profile.allergy) lines.push(`Alergeny: ${profile.allergy}`);
  if (profile.notes)   lines.push(`Poznámky: ${profile.notes}`);
  lines.push(`Exportováno: ${new Date().toLocaleDateString('cs-CZ')}`, '');

  const byDate = {};
  data.forEach(r => { if (!byDate[r.date]) byDate[r.date] = []; byDate[r.date].push(r); });
  Object.entries(byDate).sort().reverse().slice(0,30).forEach(([date,recs]) => {
    lines.push('📅 ' + date);
    recs.slice().sort((a,b) => a.time.localeCompare(b.time)).forEach(r => {
      const c = TCONF[r.typ] || TCONF.food;
      const rx = r.extra.reakce && RXLBL[r.extra.reakce] ? ' | Reakce: '+RXLBL[r.extra.reakce].t : '';
      const sk = r.extra.skrab != null ? ' | Škrábání: '+SKLBL[r.extra.skrab] : '';
      const dv = r.extra.davka ? ` | ${r.extra.davka}. dávka` : '';
      lines.push(`  ${r.time}  ${c.lbl}: ${descOf(r)}${dv}${rx}${sk}${r.extra.rxnote?' – '+r.extra.rxnote:''}${r.extra.note?' – '+r.extra.note:''}`);
    });
    lines.push('');
  });

  const text = lines.join('\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `ekzem-${profile.name||'denik'}-${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Export stažen ✓');
}

// ── TOAST ────────────────────────────────────────────────────
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ── INIT ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  if (currentUser) showApp();
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
