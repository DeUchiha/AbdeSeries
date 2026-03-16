// AbdeSeries — App Logic

const CATALOG = {
  all:     ['tt0903747','tt0944947','tt1475582','tt4574334','tt5180504','tt7366338','tt0386676','tt0773262','tt2707408','tt0455275','tt1520211','tt2861424'],
  series:  ['tt0903747','tt0944947','tt1475582','tt4574334','tt5180504','tt7366338','tt0386676','tt6048596','tt4052886','tt2741602','tt3398228','tt6741278'],
  anime:   ['tt0988824','tt0245429','tt2560140','tt1409055','tt11743610','tt0421220','tt0364731','tt8111088','tt0318871','tt2098220','tt0348725','tt0409591'],
  cartoon: ['tt0182576','tt0096697','tt0461952','tt0417299','tt1695360','tt2861424','tt0203082','tt0118421','tt0149460','tt0213338','tt0112453','tt4574334'],
  movie:   ['tt4154796','tt1375666','tt0816692','tt0468569','tt1853728','tt0110912','tt6751668','tt4154756','tt0133093','tt0137523','tt0109830','tt0167260']
};
const SC = ['#e8a000','#3d7fff','#22d37a','#ff4757','#c084fc','#38bdf8','#fb923c','#a3e635','#f472b6','#34d399','#60a5fa','#fbbf24'];
const AVATAR_COLORS = ['#e8a000','#3d7fff','#22d37a','#ff4757','#c084fc','#f97316','#06b6d4','#ec4899','#a3e635','#f43f5e'];

// State
let currentUser    = null;
let currentShow    = null;
let seasons        = {};
let savg           = [];
let myEpRatings    = {};
let chartInst      = null;
let curChartSeason = 1;
let totSeasons     = 1;
let epWidth        = 55;
let smoothLine     = true;
let prevPage       = 'home';
let epRateTarget   = null;
let reviewRating   = 0;
let epRating       = 0;
let chartsTab      = 'top';
let activeListTab  = 'favorites';
let activeProfileTab = 'profile';

// ─── INIT ────────────────────────────────────────────
(async function init() {
  if (API.getToken()) {
    try { currentUser = await API.me(); renderLoggedIn(); }
    catch { API.setToken(null); }
  }
  setupSearch();
  loadTrending('all');
})();

// ─── AUTH ─────────────────────────────────────────────
async function doSignup() {
  const username = gv('s-name'), email = gv('s-email'), password = gv('s-pass');
  clearMsg('authErr');
  try {
    const d = await API.register({ username, email, password, displayName: username });
    API.setToken(d.token); currentUser = d.user;
    closeModal('auth'); renderLoggedIn();
    showToast('Welcome, ' + (currentUser.displayName || currentUser.username) + '! 🎉');
  } catch(e) { showMsg('authErr', e.message); }
}

async function doLogin() {
  const email = gv('l-email'), password = gv('l-pass');
  clearMsg('authErr');
  try {
    const d = await API.login(email, password);
    API.setToken(d.token); currentUser = d.user;
    closeModal('auth'); renderLoggedIn();
    showToast('Welcome back, ' + (currentUser.displayName || currentUser.username) + ' 👋');
  } catch(e) { showMsg('authErr', e.message); }
}

function doLogout() {
  currentUser = null; API.setToken(null);
  closeModal('profile'); renderLoggedOut();
  showToast('Logged out.'); goHome();
}

function renderLoggedIn() {
  const color = currentUser.avatarColor || '#e8a000';
  const ini   = (currentUser.displayName || currentUser.username || '?').slice(0,2).toUpperCase();
  document.getElementById('headerRight').innerHTML = `
    <button class="hbtn" onclick="goPage('stats')">📊 Stats</button>
    <div class="user-chip" onclick="openModal('profile')">
      <div class="avatar" style="background:${color}">${ini}</div>
      <span class="uname">${currentUser.displayName || currentUser.username}</span>
    </div>`;
}

function renderLoggedOut() {
  document.getElementById('headerRight').innerHTML = `
    <button class="hbtn" onclick="openModal('auth','login')">Log in</button>
    <button class="hbtn primary" onclick="openModal('auth','signup')">Sign up</button>`;
}

// ─── MODALS ───────────────────────────────────────────
function openModal(id, sub) {
  document.getElementById('modal-' + id)?.classList.add('show');
  if (id === 'auth' && sub) switchAuthTab(sub);
  if (id === 'profile') renderProfile();
  clearMsg('authErr');
}
function closeModal(id) { document.getElementById('modal-' + id)?.classList.remove('show'); }
function overlayClose(e, id) { if (e.target === document.getElementById('modal-' + id)) closeModal(id); }
function switchAuthTab(t) {
  ['login','signup'].forEach(x => {
    document.getElementById('atab-' + x)?.classList.toggle('active', x === t);
    document.getElementById('aform-' + x)?.classList.toggle('active', x === t);
  });
}

// ─── PROFILE ──────────────────────────────────────────
function renderProfile() {
  if (!currentUser) { closeModal('profile'); openModal('auth','login'); return; }
  const u = currentUser;
  const color = u.avatarColor || '#e8a000';
  const ini   = (u.displayName || u.username).slice(0,2).toUpperCase();
  document.getElementById('profileContent').innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar-lg" style="background:${color}">${ini}</div>
      <div>
        <div class="profile-name">${u.displayName || u.username}</div>
        <div class="profile-sub">@${u.username} · ${u.email || ''}</div>
        ${u.bio ? `<div style="font-size:.79rem;color:var(--m2);margin-top:5px">${u.bio}</div>` : ''}
        ${u.country ? `<div style="font-size:.75rem;color:var(--mu);margin-top:3px">📍 ${u.country}</div>` : ''}
      </div>
    </div>
    <div class="profile-tabs">
      ${[['profile','✏️ Edit Profile'],['settings','⚙️ Settings'],['password','🔑 Password']].map(([t,l]) =>
        `<button class="ptab ${activeProfileTab===t?'active':''}" onclick="switchProfileTab('${t}')">${l}</button>`
      ).join('')}
    </div>
    <div id="profileTabContent"></div>`;
  renderProfileTab(activeProfileTab);
}

function switchProfileTab(t) {
  activeProfileTab = t;
  document.querySelectorAll('.ptab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.ptab').forEach((b,i) => { if(['profile','settings','password'][i]===t) b.classList.add('active'); });
  renderProfileTab(t);
}

function renderProfileTab(t) {
  const u = currentUser;
  const c = document.getElementById('profileTabContent');
  if (!c) return;
  if (t === 'profile') {
    c.innerHTML = `
      <div class="err-msg" id="pErr"></div><div class="ok-msg" id="pOk"></div>
      <div class="field"><label>Display Name</label><input type="text" id="p-dname" value="${u.displayName||''}"></div>
      <div class="field"><label>Username</label><input type="text" id="p-uname" value="${u.username||''}"></div>
      <div class="field"><label>Bio</label><input type="text" id="p-bio" value="${u.bio||''}" placeholder="Tell us about yourself…" maxlength="300"></div>
      <div class="field"><label>Country</label><input type="text" id="p-country" value="${u.country||''}" placeholder="e.g. Morocco"></div>
      <div class="field"><label>Website</label><input type="text" id="p-web" value="${u.website||''}" placeholder="https://…"></div>
      <div class="field">
        <label>Avatar Color</label>
        <div class="color-swatches">${AVATAR_COLORS.map(col =>
          `<div class="swatch ${col===u.avatarColor?'active':''}" style="background:${col}" onclick="pickColor('${col}')"></div>`).join('')}
        </div>
      </div>
      <button class="mbtn" onclick="saveProfile()">Save Changes</button>
      <button class="mbtn ghost" onclick="doLogout()">Log Out</button>`;
  }
  if (t === 'settings') {
    const s = u.settings || {};
    c.innerHTML = `
      <div class="ok-msg" id="pOk"></div>
      <div class="settings-row">
        <div><div class="settings-label">Default Category</div><div class="settings-desc">Homepage landing tab</div></div>
        <select id="set-cat" onchange="saveSetting('defaultCategory',this.value)" style="background:var(--s3);border:1px solid var(--br);border-radius:7px;padding:6px 10px;color:var(--tx);font-family:'Syne',sans-serif;font-size:.8rem;width:120px">
          ${['all','series','anime','cartoon','movie'].map(o=>`<option value="${o}" ${s.defaultCategory===o?'selected':''}>${o}</option>`).join('')}
        </select>
      </div>
      ${[['publicProfile','Public Profile','Let others view your profile'],['publicLists','Public Lists','Show your lists to others'],['showSpoilers','Show Spoilers','Show full review content'],['emailNotifications','Email Notifications','Receive email updates']].map(([key,label,desc])=>`
        <div class="settings-row">
          <div><div class="settings-label">${label}</div><div class="settings-desc">${desc}</div></div>
          <label class="toggle"><input type="checkbox" ${s[key]?'checked':''} onchange="saveSetting('${key}',this.checked)"><span class="toggle-slider"></span></label>
        </div>`).join('')}`;
  }
  if (t === 'password') {
    c.innerHTML = `
      <div class="err-msg" id="pErr"></div><div class="ok-msg" id="pOk"></div>
      <div class="field"><label>Current Password</label><input type="password" id="p-cur" placeholder="••••••••"></div>
      <div class="field"><label>New Password</label><input type="password" id="p-new" placeholder="Min. 6 characters"></div>
      <div class="field"><label>Confirm New Password</label><input type="password" id="p-conf" placeholder="Repeat new password"></div>
      <button class="mbtn" onclick="savePassword()">Change Password</button>`;
  }
}

function pickColor(col) {
  document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s.style.background===col||s.style.backgroundColor===col));
  currentUser.avatarColor = col;
}

async function saveProfile() {
  clearMsg('pErr'); clearMsg('pOk');
  try {
    const updated = await API.updateProfile({ username:gv('p-uname'), displayName:gv('p-dname'), bio:gv('p-bio'), country:gv('p-country'), website:gv('p-web'), avatarColor:currentUser.avatarColor });
    currentUser = { ...currentUser, ...updated };
    renderLoggedIn(); showMsg('pOk','✓ Profile saved!'); showToast('Profile updated ✓');
  } catch(e) { showMsg('pErr', e.message); }
}

async function saveSetting(key, value) {
  try {
    const updated = await API.updateSettings({ [key]: value });
    currentUser.settings = { ...currentUser.settings, ...updated };
    showToast('Saved ✓');
  } catch(e) { showToast('Error: ' + e.message); }
}

async function savePassword() {
  clearMsg('pErr'); clearMsg('pOk');
  const cur = gv('p-cur'), nw = gv('p-new'), conf = gv('p-conf');
  if (nw !== conf) { showMsg('pErr','Passwords do not match.'); return; }
  try {
    await API.changePassword({ currentPassword:cur, newPassword:nw });
    showMsg('pOk','✓ Password changed!');
    ['p-cur','p-new','p-conf'].forEach(id => document.getElementById(id).value='');
  } catch(e) { showMsg('pErr', e.message); }
}

// ─── LISTS ────────────────────────────────────────────
async function toggleList(type) {
  if (!currentUser) { openModal('auth','login'); return; }
  try {
    const r = await API.toggleList(type, { imdbID:currentShow.imdbID, title:currentShow.Title, poster:currentShow.Poster, year:currentShow.Year, rating:currentShow.imdbRating });
    const msgs = { favorites:r.action==='added'?'❤️ Added to Favorites':'Removed from Favorites', watchLater:r.action==='added'?'🕐 Watch Later saved':'Removed from Watch Later', watching:r.action==='added'?'▶️ Watching':'Removed from Watching', completed:r.action==='added'?'🏁 Marked Complete':'Removed from Completed' };
    showToast(msgs[type]||(r.action==='added'?'Added':'Removed'));
    renderActionRow();
  } catch(e) { showToast('Error: '+e.message); }
}

async function renderActionRow() {
  let lists = { favorites:[], watchLater:[], watching:[], completed:[] };
  if (currentUser) { try { const d = await API.getLists(); lists = d; } catch {} }
  const has = type => lists[type]?.some(x => x.imdbID===currentShow?.imdbID);
  const sr = myShowRating;
  const srLabel = sr ? `⭐ ${sr.rating}/10` : '☆ Rate Show';
  document.getElementById('actionRow').innerHTML = `
    <button class="act-btn ${has('favorites')?'fav-on':''}" onclick="toggleList('favorites')">${has('favorites')?'❤️':'🤍'} ${has('favorites')?'Favorited':'Favorite'}</button>
    <button class="act-btn ${has('watchLater')?'on':''}" onclick="toggleList('watchLater')">${has('watchLater')?'✅':'🕐'} Watch Later</button>
    <button class="act-btn ${has('watching')?'on':''}" onclick="toggleList('watching')">${has('watching')?'▶️ Watching':'▶️ Watching'}</button>
    <button class="act-btn ${has('completed')?'on':''}" onclick="toggleList('completed')">${has('completed')?'🏁 Done':'🏁 Complete'}</button>
    <button class="act-btn ${sr?'on':''}" id="rateShowBtn" onclick="openRateShowModal()">${srLabel}</button>`;
}

// TABS definition — single source of truth
const LIST_TABS = {
  favorites:  '❤️ Favorites',
  watchLater: '🕐 Watch Later',
  watching:   '▶️ Watching',
  completed:  '🏁 Completed',
  epratings:  '⭐ Ep. Ratings',
};

function renderListTabs(counts={}) {
  return `<div class="ltabs">${Object.entries(LIST_TABS).map(([k,l]) => {
    const cnt = counts[k] != null ? ` (${counts[k]})` : '';
    return `<button class="ltab ${activeListTab===k?'active':''}" onclick="switchListTab('${k}')">${l}${cnt}</button>`;
  }).join('')}</div>`;
}

async function goLists() {
  goPage('lists');
  const c = document.getElementById('listsContent');
  if (!currentUser) {
    c.innerHTML = `<div class="lock-wall"><div class="li">🔒</div><h3>Sign In First</h3><p>Create an account to save your lists.</p><div class="lw-btns"><button class="hbtn" onclick="openModal('auth','login')">Log In</button><button class="hbtn primary" onclick="openModal('auth','signup')">Sign Up</button></div></div>`;
    return;
  }
  if (activeListTab === 'epratings') {
    renderEpRatingsTab(c); return;
  }
  try {
    const lists = await API.getLists();
    const counts = {
      favorites: lists.favorites?.length||0,
      watchLater: lists.watchLater?.length||0,
      watching: lists.watching?.length||0,
      completed: lists.completed?.length||0,
    };
    c.innerHTML = renderListTabs(counts) + `<div id="listGrid"></div>`;
    renderListGrid(lists[activeListTab]||[]);
  } catch(e) { c.innerHTML=`<p style="color:var(--ba)">${e.message}</p>`; }
}

async function renderEpRatingsTab(c) {
  c.innerHTML = renderListTabs() + `<div id="listGrid"><div class="loader-inline">Loading episode ratings…</div></div>`;
  const g = document.getElementById('listGrid');
  try {
    const ratings = await API.getMyEpRatings();
    if (!ratings.length) {
      g.innerHTML = `<div class="empty-list"><div class="ei">⭐</div><h3>No episode ratings yet</h3><p>Click any cell on the heatmap to rate an episode.</p></div>`;
      return;
    }
    // Group by show
    const byShow = {};
    ratings.forEach(r => {
      if (!byShow[r.imdbID]) byShow[r.imdbID] = { imdbID:r.imdbID, allRatings:[], eps:[] };
      byShow[r.imdbID].allRatings.push(r.rating);
      byShow[r.imdbID].eps.push(r);
    });
    // Fetch titles + posters in parallel
    const showList = Object.values(byShow);
    await Promise.allSettled(showList.map(async s => {
      try {
        const info = await API.getShow(s.imdbID);
        s.title  = info.Title  || s.imdbID;
        s.poster = info.Poster && info.Poster !== 'N/A' ? info.Poster : '';
      } catch { s.title = s.imdbID; s.poster = ''; }
      s.avg = parseFloat((s.allRatings.reduce((a,b)=>a+b,0)/s.allRatings.length).toFixed(1));
    }));
    showList.sort((a,b) => b.avg - a.avg);

    g.innerHTML = `
      <div style="font-size:.8rem;color:var(--mu);margin-bottom:16px">${ratings.length} episodes rated across ${showList.length} show${showList.length!==1?'s':''}</div>
      ${showList.map(show => {
        const {bg} = rColor(show.avg);
        const sortedEps = show.eps.sort((a,b) => b.rating - a.rating);
        return `
          <div style="margin-bottom:28px">
            <div style="display:flex;align-items:center;gap:12px;padding-bottom:10px;margin-bottom:8px;border-bottom:2px solid var(--br);cursor:pointer" onclick="selectShow('${show.imdbID}')">
              ${show.poster ? `<img src="${show.poster}" style="width:36px;height:52px;border-radius:6px;object-fit:cover;flex-shrink:0">` : ''}
              <div style="flex:1">
                <div style="font-size:.95rem;font-weight:700;color:var(--tx)">${show.title}</div>
                <div style="font-size:.73rem;color:var(--mu)">${show.eps.length} ep${show.eps.length!==1?'s':''} rated</div>
              </div>
              <div style="font-family:'DM Mono',monospace;font-size:1.1rem;font-weight:700;padding:6px 14px;border-radius:8px;background:${bg};color:#fff">⭐ ${show.avg}</div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${sortedEps.map(r => {
                const {bg:cbg,text} = rColor(r.rating);
                return `<div title="S${String(r.season).padStart(2,'0')} E${String(r.episode).padStart(2,'0')}${r.note?' · '+r.note:''}" onclick="openEpisodePage('${show.imdbID}',${r.season},${r.episode})" style="display:flex;flex-direction:column;align-items:center;background:var(--s2);border-radius:8px;padding:6px 10px;min-width:54px;cursor:pointer;transition:transform .15s" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                  <div style="font-size:.65rem;color:var(--mu);margin-bottom:2px">S${String(r.season).padStart(2,'0')}E${String(r.episode).padStart(2,'0')}</div>
                  <div style="font-family:'DM Mono',monospace;font-size:.9rem;font-weight:700;color:${cbg}">${r.rating}</div>
                </div>`;
              }).join('')}
            </div>
          </div>`;
      }).join('')}`;
  } catch(e) { g.innerHTML=`<p style="color:var(--ba)">${e.message}</p>`; }
}

function switchListTab(t) { activeListTab=t; goLists(); }

function renderListGrid(items) {
  const g = document.getElementById('listGrid');
  if (!g) return;
  if (!items.length) { g.innerHTML=`<div class="empty-list"><div class="ei">📭</div><h3>Nothing here yet</h3></div>`; return; }
  g.innerHTML = `<div class="tgrid">${items.map(s=>`
    <div class="tcard" onclick="selectShow('${s.imdbID}')">
      <div class="tpwrap">
        <img class="tposter" src="${s.poster&&s.poster!=='N/A'?s.poster:''}" loading="lazy" onerror="this.style.opacity=0">
        <div class="toverlay"></div>
        <div class="trbadge">⭐ ${s.rating||'–'}</div>
      </div>
      <div class="tinfo"><div class="ttitle">${s.title}</div><div class="tmeta">${s.year||''}</div></div>
    </div>`).join('')}</div>`;
}

// ─── ROUTING ──────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+id)?.classList.add('active');
  window.scrollTo({ top:0, behavior:'smooth' });
}
function goHome() { showPage('home'); }
function goBack() { showPage(prevPage||'home'); }
function goPage(id) {
  prevPage = document.querySelector('.page.active')?.id?.replace('page-','')||'home';
  showPage(id);
  if (id==='stats')  loadStatsPage();
  if (id==='charts') loadChartsPage();
}

// ─── SEARCH ───────────────────────────────────────────
let stimer;
function setupSearch() {
  const inp  = document.getElementById('homeSearch');
  const drop = document.getElementById('homeDrop');
  inp.addEventListener('input', () => {
    clearTimeout(stimer);
    const q = inp.value.trim();
    if (q.length < 2) { drop.classList.remove('show'); return; }
    stimer = setTimeout(async () => {
      try {
        const d = await API.searchShows(q);
        if (!d.Search) { drop.classList.remove('show'); return; }
        drop.innerHTML = d.Search.slice(0,6).map(s=>`
          <div class="ditem" onclick="selectShow('${s.imdbID}')">
            <img class="dposter" src="${s.Poster&&s.Poster!=='N/A'?s.Poster:''}" onerror="this.style.opacity=0" loading="lazy">
            <div><div class="dtitle">${s.Title}</div><div class="dsub">${s.Year} · ${s.Type}</div></div>
          </div>`).join('');
        drop.classList.add('show');
      } catch {}
    }, 300);
  });
  inp.addEventListener('keydown', e => { if(e.key==='Enter') doSearch(); if(e.key==='Escape') drop.classList.remove('show'); });
  document.addEventListener('click', e => { if(!e.target.closest('.sbox')) drop.classList.remove('show'); });
}

async function doSearch() {
  const q = document.getElementById('homeSearch').value.trim();
  if (!q) return;
  document.getElementById('homeDrop').classList.remove('show');
  try { const d = await API.searchShows(q); if(d.Search) selectShow(d.Search[0].imdbID); } catch {}
}

// ─── SELECT SHOW ──────────────────────────────────────
let _activeShowId  = null;
let myShowRating   = null; // current user's show rating

async function selectShow(id) {
  _activeShowId = id;
  document.getElementById('homeDrop').classList.remove('show');
  goPage('show');
  seasons={}; savg=[]; myEpRatings={}; curChartSeason=1;
  if (chartInst) { chartInst.destroy(); chartInst=null; }
  ['showHero','statStrip'].forEach(i=>document.getElementById(i).style.display='none');
  ['heatCard','chartCard','compareCard','castCard'].forEach(i=>document.getElementById(i).style.display='none');
  document.getElementById('showLoader').style.display='flex';
  switchShowTab('heatmap');
  try {
    const s = await API.getShow(id);
    if (_activeShowId !== id) return;
    currentShow=s; totSeasons=parseInt(s.totalSeasons)||1;
    renderShowHero(s); renderStatStrip(s); buildSNavs(totSeasons);
    document.getElementById('showLoader').style.display='none';
    if (currentUser) {
      try { myEpRatings=await API.getMyRatings(id); } catch {}
      try { myShowRating=await API.getMyShowRating(id); } catch { myShowRating=null; }
    } else { myShowRating=null; }
    bgLoadAll(id, totSeasons);
    loadCast(id);
    loadReviews(id);
  } catch(e) { console.error(e); }
}

function renderShowHero(s) {
  document.getElementById('showPoster').src = s.Poster&&s.Poster!=='N/A'?s.Poster:'';
  document.getElementById('showTitle').textContent = s.Title;
  document.getElementById('showPlot').textContent  = s.Plot&&s.Plot!=='N/A'?s.Plot:'';
  document.getElementById('showBadges').innerHTML  = `
    <span class="badge gold">⭐ ${s.imdbRating||'–'}</span>
    ${s.Year?`<span class="badge">${s.Year}</span>`:''}
    ${s.totalSeasons?`<span class="badge blue">${s.totalSeasons} Seasons</span>`:''}
    ${s.Genre?`<span class="badge">${s.Genre.split(',')[0]}</span>`:''}
    ${s.Rated&&s.Rated!=='N/A'?`<span class="badge">${s.Rated}</span>`:''}
    ${s.Type?`<span class="badge">${s.Type}</span>`:''}`;
  renderActionRow();
  document.getElementById('showHero').style.display='flex';
}

function renderStatStrip(s) {
  const v = s.imdbVotes?s.imdbVotes.replace(/,\d{3}$/,'K+'):'–';
  document.getElementById('statStrip').innerHTML = [
    [s.imdbRating||'–','IMDB Score'],[s.totalSeasons||'–','Seasons'],
    [s.Year?.split('–')[0]||'–','Since'],[v,'Votes']
  ].map(([v,k])=>`<div class="sc"><div class="sv">${v}</div><div class="sk">${k}</div></div>`).join('');
  document.getElementById('statStrip').style.display='grid';
}

function buildSNavs(n) {
  document.getElementById('sNavChart').innerHTML = Array.from({length:Math.min(n,20)},(_,i)=>
    `<button class="snb${i===0?' active':''}" onclick="switchChartSeason(${i+1})">S${String(i+1).padStart(2,'0')}</button>`).join('');
}

function switchShowTab(name) {
  const tabs=['heatmap','chart','compare','cast','reviews'];
  document.querySelectorAll('.stab').forEach((b,i)=>b.classList.toggle('active',tabs[i]===name));
  document.querySelectorAll('.tpanel').forEach(p=>p.classList.remove('active'));
  document.getElementById('panel-'+name)?.classList.add('active');
}

// ─── LOAD ALL SEASONS ─────────────────────────────────
async function bgLoadAll(id, total) {
  for (let s=1; s<=Math.min(total,15); s++) {
    if (_activeShowId !== id) return;
    if (!seasons[s]) {
      try { const d=await API.getSeason(id,s); seasons[s]=d.Episodes||[]; }
      catch { seasons[s]=[]; }
    }
    if (_activeShowId !== id) return;
    const rs=(seasons[s]||[]).map(e=>parseFloat(e.imdbRating)).filter(x=>!isNaN(x)&&x>0);
    savg[s]={ avg:rs.length?(rs.reduce((a,b)=>a+b,0)/rs.length).toFixed(1)*1:0, color:SC[(s-1)%SC.length] };
  }
  if (_activeShowId !== id) return;
  renderHeatmap(); renderCompare(); renderChart(1);
}

// ─── HEATMAP ──────────────────────────────────────────
function rColor(r) {
  // Absolute Cinema (9+): deep blue
  // Awesome (8-8.9):      teal/cyan
  // Great (7-7.9):        green
  // Good (6-6.9):         yellow-green
  // Regular (5-5.9):      yellow/amber
  // Bad (4-4.9):          orange-red
  // Garbage (<4):         dark red/purple
  if (isNaN(r)||r<=0) return {bg:'#131c2b',text:'#3a4f68'};
  if (r>=9.0) return {bg:'#1d4ed8',text:'#bfdbfe'}; // Absolute Cinema — blue
  if (r>=8.0) return {bg:'#0d9488',text:'#ccfbf1'}; // Awesome — teal
  if (r>=7.0) return {bg:'#16a34a',text:'#dcfce7'}; // Great — green
  if (r>=6.0) return {bg:'#65a30d',text:'#ecfccb'}; // Good — lime
  if (r>=5.0) return {bg:'#ca8a04',text:'#fef9c3'}; // Regular — amber
  if (r>=4.0) return {bg:'#dc2626',text:'#fee2e2'}; // Bad — red
  return {bg:'#7c3aed',text:'#ede9fe'};              // Garbage — purple
}

function renderHeatmap() {
  const wrap=document.getElementById('hmGrid');
  const sNums=Object.keys(seasons).map(Number).sort((a,b)=>a-b);
  if (!sNums.length) return;
  const grid=document.createElement('div'); grid.className='hm-grid';
  sNums.forEach(s=>{
    const eps=seasons[s]||[];
    if (!eps.length) return;
    const row=document.createElement('div'); row.className='hm-row';
    const lbl=document.createElement('div'); lbl.className='hm-lbl'; lbl.textContent=`S${String(s).padStart(2,'0')}`;
    const cells=document.createElement('div'); cells.className='hm-cells';
    eps.forEach(ep=>{
      const raw=ep.imdbRating, r=parseFloat(raw);
      const valid=!isNaN(r)&&r>0&&raw!=='N/A'&&raw!=='0.0'&&raw!=='0';
      const {bg,text}=rColor(valid?r:NaN);
      const myKey=`S${s}E${ep.Episode}`;
      const hasMyRating=!!myEpRatings[myKey];
      const cell=document.createElement('div');
      cell.className='hm-cell'+(valid?'':' na')+(hasMyRating?' my-rated':'');
      cell.style.background=bg; cell.style.color=text;
      cell.textContent=valid?r.toFixed(1):'N/A';
      cell.dataset.s=s; cell.dataset.e=ep.Episode; cell.dataset.name=ep.Title||''; cell.dataset.r=valid?r:'N/A'; cell.dataset.votes=ep.imdbVotes&&ep.imdbVotes!=='N/A'?ep.imdbVotes:'—'; cell.dataset.imdbid=ep.imdbID||'';
      cell.addEventListener('mousemove',showHMTT);
      cell.addEventListener('mouseleave',hideHMTT);
      cell.addEventListener('click',()=>{ openEpisodePage(currentShow.imdbID, parseInt(s), parseInt(ep.Episode)); });
      cells.appendChild(cell);
    });
    row.appendChild(lbl); row.appendChild(cells); grid.appendChild(row);
  });
  wrap.innerHTML=''; wrap.appendChild(grid);
  document.getElementById('heatCard').style.display='block';
  const RATING_LABELS = [
    {r:9.5,l:'Absolute Cinema'},{r:8.5,l:'Awesome'},{r:7.5,l:'Great'},
    {r:6.5,l:'Good'},{r:5.5,l:'Regular'},{r:4.5,l:'Bad'},{r:2.0,l:'Garbage'}
  ];
  document.getElementById('hmLegend').innerHTML=
    RATING_LABELS.map(({r,l})=>{const {bg,text}=rColor(r);return `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:10px"><span style="width:11px;height:11px;border-radius:50%;background:${bg};display:inline-block;flex-shrink:0"></span><span style="font-size:.72rem;color:var(--tx)">${l}</span></span>`;}).join('')
    +`<span style="display:inline-flex;align-items:center;gap:5px;margin-right:10px"><span style="width:11px;height:11px;border-radius:50%;background:#131c2b;border:1px dashed #3a4f68;display:inline-block;flex-shrink:0"></span><span style="font-size:.72rem;color:var(--mu)">N/A</span></span>`
    +`<span style="font-size:.67rem;color:var(--mu);margin-left:4px">· ★ = your rating</span>`;
}

const tt=document.getElementById('hmtt');
function showHMTT(e) {
  const c=e.currentTarget, r=parseFloat(c.dataset.r);
  const valid=!isNaN(r);
  const myKey=`S${c.dataset.s}E${c.dataset.e}`;
  const myR=myEpRatings[myKey];
  document.getElementById('ttEp').textContent=`S${String(c.dataset.s).padStart(2,'0')} E${String(c.dataset.e).padStart(2,'0')}`;
  document.getElementById('ttTitle').textContent=c.dataset.name||'Unknown';
  const {bg}=valid?rColor(r):{bg:'var(--mu)'};
  document.getElementById('ttR').innerHTML=valid?`<span style="color:${bg}">⭐ ${r.toFixed(1)}</span>${myR?` <span style="color:#a78bfa;font-size:.82rem">· Mine: ${myR.rating}/10</span>`:''}`:`<span style="color:var(--mu)">No rating yet</span>`;
  document.getElementById('ttV').textContent=valid&&c.dataset.votes!=='—'?c.dataset.votes+' votes':'';
  // IMDB link
  const ttImdb = document.getElementById('ttImdb');
  if (ttImdb) {
    if (c.dataset.imdbid && c.dataset.imdbid !== 'N/A' && c.dataset.imdbid !== '') {
      ttImdb.href = `https://www.imdb.com/title/${c.dataset.imdbid}/`;
      ttImdb.style.display = 'inline-flex';
    } else {
      // fallback: search IMDB by show + episode
      const q = encodeURIComponent(`${currentShow?.Title||''} S${String(c.dataset.s).padStart(2,'0')}E${String(c.dataset.e).padStart(2,'0')}`);
      ttImdb.href = `https://www.imdb.com/search/title/?series=${currentShow?.imdbID||''}&season=${c.dataset.s}&episode=${c.dataset.e}`;
      ttImdb.style.display = 'inline-flex';
    }
  }
  tt.classList.add('show'); posTT(e);
}
function hideHMTT() { tt.classList.remove('show'); }
function posTT(e) {
  let x=e.clientX+14, y=e.clientY-12;
  if(x+190>window.innerWidth) x=e.clientX-200;
  if(y+110>window.innerHeight) y=e.clientY-110;
  tt.style.left=x+'px'; tt.style.top=y+'px';
}
document.addEventListener('mousemove',e=>{ if(tt.classList.contains('show')) posTT(e); });

// ─── CHART — FIXED: shows ALL episodes ───────────────
function switchChartSeason(n) {
  curChartSeason=n;
  document.querySelectorAll('#sNavChart .snb').forEach((b,i)=>b.classList.toggle('active',i+1===n));
  renderChart(n);
}

function renderChart(n) {
  const eps=seasons[n]||[];
  if (!eps.length) return;

  const labels  = eps.map(e=>`E${String(e.Episode).padStart(2,'0')}`);
  const imdbRaw = eps.map(e=>{
    const r=parseFloat(e.imdbRating);
    return (!isNaN(r)&&r>0&&e.imdbRating!=='N/A'&&e.imdbRating!=='0.0') ? r : null;
  });
  const myRaw = eps.map(e=>{
    const k=`S${n}E${e.Episode}`;
    return myEpRatings[k]?myEpRatings[k].rating:null;
  });
  const validImdb=imdbRaw.filter(r=>r!==null);
  const avg=validImdb.length?validImdb.reduce((a,b)=>a+b,0)/validImdb.length:0;

  document.getElementById('chartTitle').textContent=`SEASON ${n} — EPISODE RATINGS`;
  document.getElementById('epCountLabel').textContent=`${eps.length} episodes · ${validImdb.length} rated`;
  document.getElementById('chartCard').style.display='block';

  // ── THE FIX: set canvas size manually before Chart.js touches it ──
  const H = 260;
  const W = Math.max(600, eps.length * epWidth);

  if (chartInst) { chartInst.destroy(); chartInst=null; }

  const canvas = document.getElementById('lineChart');
  // Must set BOTH the attribute AND style
  canvas.setAttribute('width',  W);
  canvas.setAttribute('height', H);
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const inner = document.getElementById('chartInner');
  inner.style.width  = W + 'px';
  inner.style.height = H + 'px';

  document.getElementById('chartHint').textContent = eps.length > 12 ? '← Scroll to see all episodes →' : '';
  const scrollEl = document.getElementById('chartScroll');
  if (scrollEl) scrollEl.scrollLeft = 0;

  const ctx = canvas.getContext('2d');
  chartInst = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [
      {
        label:'IMDB', data:imdbRaw,
        borderColor:'#e8a000',
        backgroundColor: c => {
          const {chartArea,ctx:cv}=c.chart;
          if(!chartArea) return 'transparent';
          const g=cv.createLinearGradient(0,chartArea.top,0,chartArea.bottom);
          g.addColorStop(0,'rgba(232,160,0,.22)'); g.addColorStop(1,'rgba(232,160,0,0)');
          return g;
        },
        borderWidth:2.4, fill:true, tension:smoothLine?.38:0, spanGaps:true,
        pointRadius:imdbRaw.map(r=>r===null?0:5),
        pointBackgroundColor:imdbRaw.map(r=>r===null?'transparent':r>=8.5?'#22d37a':r>=7?'#e8a000':r>=6?'#f5c542':'#ff4757'),
        pointBorderColor:'#0c0f18', pointBorderWidth:2, pointHoverRadius:7,
      },
      {
        label:'Mine', data:myRaw,
        borderColor:'#a78bfa', backgroundColor:'transparent',
        borderWidth:2, fill:false, tension:0.3, spanGaps:true, borderDash:[4,3],
        pointRadius:myRaw.map(r=>r===null?0:6),
        pointBackgroundColor:'#a78bfa', pointBorderColor:'#0c0f18', pointBorderWidth:2, pointHoverRadius:8,
      },
      {
        label:'Average', data:imdbRaw.map(r=>r===null?null:parseFloat(avg.toFixed(2))),
        borderColor:'rgba(61,127,255,.4)', borderWidth:1.5, borderDash:[7,5],
        pointRadius:0, tension:0, fill:false, spanGaps:false,
      }
    ]},
    options: {
      responsive: false,          // ← CRITICAL: stops Chart.js resizing the canvas
      maintainAspectRatio: false,
      animation: {duration:500, easing:'easeOutQuart'},
      interaction: {mode:'index', intersect:false},
      plugins: {
        legend: {display:false},
        tooltip: {
          backgroundColor:'#111520', borderColor:'#1a2235', borderWidth:1,
          titleColor:'#dde4f0', bodyColor:'#7a8fa8', padding:12,
          callbacks:{label:c=>c.parsed.y===null?null:` ${c.dataset.label}: ${c.parsed.y}`}
        }
      },
      scales: {
        x: {
          grid:{color:'rgba(26,34,53,.45)'},
          ticks:{
            color:'#4a5a75', font:{family:'DM Mono',size:11},
            maxRotation:0,
            autoSkip:false   // ← CRITICAL: never hide episode labels
          }
        },
        y: {
          min:0, max:10,
          grid:{color:'rgba(26,34,53,.45)'},
          ticks:{color:'#4a5a75',font:{family:'DM Mono',size:11},stepSize:1,callback:v=>v===0?'':v}
        }
      }
    }
  });
}

function zoomChart(delta) { epWidth=Math.max(28,Math.min(120,epWidth+delta)); renderChart(curChartSeason); }
function toggleSmooth() {
  smoothLine=!smoothLine;
  document.getElementById('smoothBtn').classList.toggle('on',smoothLine);
  renderChart(curChartSeason);
}

// ─── COMPARE ──────────────────────────────────────────
function renderCompare() {
  const ns=Object.keys(savg).map(Number).sort((a,b)=>a-b).filter(n=>savg[n]?.avg>0);
  if (ns.length<2) return;
  document.getElementById('cbars').innerHTML=ns.map(s=>{
    const {avg,color}=savg[s];
    const pct=((avg/10)*100).toFixed(1);
    return `<div class="crow"><div class="clbl">Season ${s}</div><div class="ctrack"><div class="cfill" data-p="${pct}" style="background:${color};width:0%"></div></div><div class="cval" style="color:${color}">${avg}</div></div>`;
  }).join('');
  document.getElementById('compareCard').style.display='block';
  requestAnimationFrame(()=>setTimeout(()=>{ document.querySelectorAll('#cbars .cfill').forEach(el=>el.style.width=el.dataset.p+'%'); },80));
}

// ─── CAST ─────────────────────────────────────────────
async function loadCast(imdbID) {
  const card=document.getElementById('castCard');
  const grid=document.getElementById('castGrid');
  card.style.display='block';
  grid.innerHTML=`<div class="loader-inline">Loading cast…</div>`;
  try {
    const data=await API.getCast(imdbID);
    if (!data.cast?.length) { grid.innerHTML=`<p style="color:var(--mu)">No cast data.</p>`; return; }
    grid.innerHTML=data.cast.map(a=>`
      <div class="cast-card">
        ${a.photo?`<img class="cast-photo" src="${a.photo}" alt="${a.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`:``}
        <div class="cast-no-photo" style="${a.photo?'display:none':''}">🎭</div>
        <div class="cast-real">${a.name}</div>
        <div class="cast-char">${a.character||'Cast Member'}</div>
      </div>`).join('');
  } catch { grid.innerHTML=`<p style="color:var(--mu);font-size:.83rem;padding:12px">Cast unavailable.</p>`; }
}

// ─── REVIEWS ──────────────────────────────────────────
function renderReviewCard(r, opts={}) {
  const ini=(r.user?.displayName||r.user?.username||'?').slice(0,2).toUpperCase();
  const color=r.user?.avatarColor||'#e8a000';
  const date=new Date(r.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const isOwner = currentUser && (r.user?._id===currentUser._id || r.user===currentUser._id);
  const showTitle = opts.showTitle ? `<div style="font-size:.78rem;color:var(--mu);margin-bottom:4px;cursor:pointer" onclick="selectShow('${r.imdbID||''}')">📺 ${r.showTitle||''}</div>` : '';
  return `<div class="review-card" data-rid="${r._id}" data-imdbid="${r.imdbID||currentShow?.imdbID||''}">
    ${showTitle}
    <div class="review-header">
      <div class="rev-avatar" style="background:${color}">${ini}</div>
      <div style="flex:1"><div class="rev-user">${r.user?.displayName||r.user?.username||'User'}</div><div class="rev-date">${date}</div></div>
      ${r.rating?`<div class="rev-score">⭐ ${r.rating}/10</div>`:''}
    </div>
    ${r.containsSpoilers?'<div class="rev-spoiler">⚠️ Contains Spoilers</div>':''}
    ${r.title?`<div class="rev-title">${r.title}</div>`:''}
    ${r.body?`<div class="rev-body">${r.body}</div>`:''}
    <div class="rev-actions">
      <button class="rev-like-btn" onclick="likeReview('${r._id}',this)">❤️ ${r.likesCount||0}</button>
      ${isOwner?`<button class="rev-edit-btn" onclick="openEditReview('${r._id}','${r.imdbID||currentShow?.imdbID||''}')">✏️ Edit</button><button class="rev-del-btn" onclick="deleteReview('${r._id}','${r.imdbID||currentShow?.imdbID||''}')">🗑️ Delete</button>`:''}
    </div>
  </div>`;
}

async function loadReviews(imdbID) {
  const list=document.getElementById('reviewsList');
  list.innerHTML=`<div class="loader-inline">Loading reviews…</div>`;
  try {
    const reviews=await API.getReviews(imdbID);
    if (!reviews.length) { list.innerHTML=`<div class="no-reviews"><div class="nr-icon">💬</div><p>No reviews yet. Be the first!</p></div>`; return; }
    list.innerHTML=reviews.map(r=>renderReviewCard(r)).join('');
  } catch { list.innerHTML=`<p style="color:var(--mu)">Could not load reviews.</p>`; }
}

async function deleteReview(reviewId, imdbID) {
  if (!confirm('Delete your review?')) return;
  try {
    await API.deleteReview(imdbID);
    document.querySelector(`[data-rid="${reviewId}"]`)?.remove();
    showToast('Review deleted.');
  } catch(e) { showToast('Error: '+e.message); }
}

function openEditReview(reviewId, imdbID) {
  const card = document.querySelector(`[data-rid="${reviewId}"]`);
  if (!card) return;
  const oldRating  = parseInt(card.querySelector('.rev-score')?.textContent)||0;
  const oldTitle   = card.querySelector('.rev-title')?.textContent||'';
  const oldBody    = card.querySelector('.rev-body')?.textContent||'';
  const oldSpoiler = !!card.querySelector('.rev-spoiler');
  let editRating = oldRating;

  const overlay = document.createElement('div');
  overlay.className = 'overlay show';
  overlay.id = 'modal-edit-review';
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="modal">
      <button class="mc" onclick="document.getElementById('modal-edit-review').remove()">✕</button>
      <h2 style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;letter-spacing:.07em;margin-bottom:18px">Edit Review</h2>
      <div class="err-msg" id="editRevErr"></div>
      <div class="field"><label>Your Rating (1–10)</label><div class="star-row" id="editStarRow"></div></div>
      <div class="field"><label>Review Title (optional)</label><input type="text" id="edit-rev-title" value="${oldTitle}" maxlength="120"></div>
      <div class="field"><label>Your Review (optional)</label><textarea id="edit-rev-body" maxlength="2000" rows="5">${oldBody}</textarea></div>
      <label class="check-row"><input type="checkbox" id="edit-rev-spoiler" ${oldSpoiler?'checked':''}>Contains spoilers</label>
      <button class="mbtn" style="margin-top:16px" onclick="submitEditReview('${reviewId}','${imdbID}')">Save Changes</button>
    </div>`;
  document.body.appendChild(overlay);
  buildStars('editStarRow', n=>{editRating=n;}, oldRating);
  overlay._getEditRating = ()=>editRating;
}

async function submitEditReview(reviewId, imdbID) {
  const overlay = document.getElementById('modal-edit-review');
  const rating  = overlay._getEditRating();
  if (!rating) { showMsg('editRevErr','Please select a rating.'); return; }
  try {
    const updated = await API.updateReview(imdbID, {
      rating,
      title: document.getElementById('edit-rev-title').value.trim(),
      body:  document.getElementById('edit-rev-body').value.trim(),
      containsSpoilers: document.getElementById('edit-rev-spoiler').checked
    });
    overlay.remove();
    showToast('Review updated ✓');
    loadReviews(imdbID);
  } catch(e) { showMsg('editRevErr', e.message); }
}

async function likeReview(id,btn) {
  if (!currentUser) { openModal('auth','login'); return; }
  try { const r=await API.likeReview(id); btn.classList.toggle('liked',r.liked); btn.textContent=`❤️ ${r.likesCount}`; } catch {}
}

function openReviewModal() {
  if (!currentUser) { openModal('auth','login'); return; }
  reviewRating=0;
  clearMsg('reviewErr');
  document.getElementById('rev-title').value='';
  document.getElementById('rev-body').value='';
  document.getElementById('rev-spoiler').checked=false;
  openModal('review');
  // Build stars AFTER modal is visible so DOM is ready
  setTimeout(() => buildStars('starRow', n => { reviewRating=n; }), 10);
}

async function submitReview() {
  if (!reviewRating) { showMsg('reviewErr','Please select a rating (1–10).'); return; }
  try {
    await API.submitReview(currentShow.imdbID, { rating:reviewRating, title:gv('rev-title'), body:gv('rev-body'), containsSpoilers:document.getElementById('rev-spoiler').checked, showTitle:currentShow.Title, showPoster:currentShow.Poster });
    closeModal('review'); showToast('Review published ✓');
    loadReviews(currentShow.imdbID);
  } catch(e) { showMsg('reviewErr',e.message); }
}

// ─── EPISODE RATING ───────────────────────────────────
function openEpRateModal(s,ep,title) {
  epRateTarget={season:s,episode:ep};
  const key=`S${s}E${ep}`;
  const existing=myEpRatings[key];
  epRating=existing?.rating||0;
  document.getElementById('eprateTitle').textContent='Rate Episode';
  document.getElementById('eprateSubtitle').textContent=`S${String(s).padStart(2,'0')} E${String(ep).padStart(2,'0')}${title?' · '+title:''}`;
  document.getElementById('ep-note').value=existing?.note||'';
  openModal('eprate');
  // Build stars AFTER modal is visible
  setTimeout(() => buildStars('epStarRow', n => { epRating=n; }, epRating), 10);
}

async function submitEpRating() {
  if (!epRating||!epRateTarget) return;
  try {
    const r=await API.rateEpisode(currentShow.imdbID,{...epRateTarget,rating:epRating,note:gv('ep-note')});
    const key=`S${epRateTarget.season}E${epRateTarget.episode}`;
    myEpRatings[key]={rating:r.rating,note:r.note};
    closeModal('eprate'); showToast(`★ ${r.rating}/10 saved!`);
    renderHeatmap(); renderChart(curChartSeason);
  } catch(e) { showToast('Error: '+e.message); }
}

// ─── STARS ────────────────────────────────────────────
function buildStars(containerId, onSelect, selected=0) {
  const c=document.getElementById(containerId);
  if (!c) return;
  let cur=selected;
  c.innerHTML=Array.from({length:10},(_,i)=>{const n=i+1;return `<span class="star ${n<=cur?'on':''}" data-n="${n}">⭐</span>`;}).join('')+`<span class="star-label" id="${containerId}-val">${cur?cur+'/10':''}</span>`;
  c.querySelectorAll('.star').forEach(s=>{
    s.addEventListener('mouseover',()=>{ const n=+s.dataset.n; c.querySelectorAll('.star').forEach((x,i)=>x.classList.toggle('on',i<n)); });
    s.addEventListener('mouseout', ()=>{ c.querySelectorAll('.star').forEach((x,i)=>x.classList.toggle('on',i<cur)); });
    s.addEventListener('click',()=>{ cur=+s.dataset.n; const lbl=document.getElementById(containerId+'-val'); if(lbl) lbl.textContent=cur+'/10'; onSelect(cur); });
  });
}

// ─── TOP CHARTS ───────────────────────────────────────
async function loadChartsPage() {
  const grid = document.getElementById('chartsGrid');
  const pageTitle = document.getElementById('chartsPageTitle');
  const pageSub   = document.getElementById('chartsPageSub');
  grid.innerHTML = Array(8).fill(`<div class="skel-card"><div class="skel-poster"></div><div class="skel-line"></div><div class="skel-line s"></div></div>`).join('');

  if (chartsTab === 'myratings') {
    if (pageTitle) pageTitle.textContent = '⭐ My Ratings';
    if (pageSub)   pageSub.textContent   = 'Shows you rated, best to worst.';
    if (!currentUser) {
      grid.innerHTML = `<div class="lock-wall"><div class="li">🔒</div><h3>Sign In First</h3><p>Use the "Rate Show" button on any show page to build your personal chart.</p><div class="lw-btns"><button class="hbtn primary" onclick="openModal('auth','login')">Log In</button></div></div>`;
      return;
    }
    try {
      const ratings = await API.getMyShowRatings(); // full show ratings, sorted best→worst
      if (!ratings.length) {
        grid.innerHTML=`<div style="text-align:center;padding:60px;color:var(--mu)">
          <div style="font-size:3rem">☆</div>
          <h3 style="margin:12px 0 8px">No show ratings yet</h3>
          <p style="font-size:.85rem">Open any show and click <strong>☆ Rate Show</strong> to add it here.</p>
        </div>`;
        return;
      }
      grid.innerHTML = ratings.map((s,i) => {
        const {bg} = rColor(s.rating);
        return `<div class="tcard" onclick="selectShow('${s.imdbID}')">
          <div class="tpwrap">
            <img class="tposter" src="${s.showPoster&&s.showPoster!=='N/A'?s.showPoster:''}" loading="lazy" onerror="this.style.opacity=0">
            <div class="toverlay"></div>
            <div class="rank-badge">#${i+1}</div>
            <div class="trbadge" style="background:${bg};color:#fff">⭐ ${s.rating}/10</div>
          </div>
          <div class="tinfo">
            <div class="ttitle">${s.showTitle||s.imdbID}</div>
            <div class="tmeta">${s.note||s.showYear||''}</div>
          </div>
        </div>`;
      }).join('');
    } catch(e) { grid.innerHTML=`<p style="color:var(--ba);padding:20px">${e.message}</p>`; }
    return;
  }

  if (chartsTab === 'epratings') {
    if (pageTitle) pageTitle.textContent = '🎬 Ep. Ratings';
    if (pageSub)   pageSub.textContent   = 'Your episode ratings grouped by show.';
    if (!currentUser) {
      grid.innerHTML = `<div class="lock-wall"><div class="li">🔒</div><h3>Sign In First</h3><p>Rate episodes on the heatmap to see them here.</p><div class="lw-btns"><button class="hbtn primary" onclick="openModal('auth','login')">Log In</button></div></div>`;
      return;
    }
    try {
      const ratings = await API.getMyEpRatings();
      if (!ratings.length) {
        grid.innerHTML=`<div style="text-align:center;padding:60px;color:var(--mu)"><div style="font-size:3rem">🎬</div><h3 style="margin:12px 0 8px">No episode ratings yet</h3><p style="font-size:.85rem">Click any heatmap cell to rate an episode.</p></div>`;
        return;
      }
      const byShow = {};
      ratings.forEach(r => {
        if (!byShow[r.imdbID]) byShow[r.imdbID] = { imdbID:r.imdbID, allRatings:[], eps:[] };
        byShow[r.imdbID].allRatings.push(r.rating);
        byShow[r.imdbID].eps.push(r);
      });
      const showList = Object.values(byShow);
      await Promise.allSettled(showList.map(async s => {
        try { const i=await API.getShow(s.imdbID); s.title=i.Title||s.imdbID; s.poster=i.Poster&&i.Poster!=='N/A'?i.Poster:''; }
        catch { s.title=s.imdbID; s.poster=''; }
        s.avg = parseFloat((s.allRatings.reduce((a,b)=>a+b,0)/s.allRatings.length).toFixed(1));
      }));
      showList.sort((a,b)=>b.avg-a.avg);
      grid.innerHTML = `<div style="width:100%">${showList.map(show => {
        const {bg}=rColor(show.avg);
        const sortedEps = show.eps.sort((a,b)=>b.rating-a.rating);
        return `<div style="margin-bottom:28px">
          <div style="display:flex;align-items:center;gap:12px;padding-bottom:10px;margin-bottom:10px;border-bottom:2px solid var(--br);cursor:pointer" onclick="selectShow('${show.imdbID}')">
            ${show.poster?`<img src="${show.poster}" style="width:36px;height:52px;border-radius:6px;object-fit:cover;flex-shrink:0">`:''}
            <div style="flex:1">
              <div style="font-size:.95rem;font-weight:700;color:var(--tx)">${show.title}</div>
              <div style="font-size:.73rem;color:var(--mu)">${show.eps.length} ep${show.eps.length!==1?'s':''} rated</div>
            </div>
            <div style="font-family:'DM Mono',monospace;font-size:1rem;font-weight:700;padding:5px 12px;border-radius:8px;background:${bg};color:#fff">⭐ ${show.avg}</div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${sortedEps.map(r=>{const {bg:cb,text}=rColor(r.rating);return `<div title="S${String(r.season).padStart(2,'0')}E${String(r.episode).padStart(2,'0')}${r.note?' · '+r.note:''}" onclick="openEpisodePage('${show.imdbID}',${r.season},${r.episode})" style="display:flex;flex-direction:column;align-items:center;background:var(--s2);border-radius:8px;padding:6px 10px;min-width:54px;cursor:pointer;transition:transform .15s" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
              <div style="font-size:.62rem;color:var(--mu)">S${String(r.season).padStart(2,'0')}E${String(r.episode).padStart(2,'0')}</div>
              <div style="font-family:'DM Mono',monospace;font-size:.88rem;font-weight:700;color:${cb}">${r.rating}</div>
            </div>`;}).join('')}
          </div>
        </div>`;
      }).join('')}</div>`;
    } catch(e) { grid.innerHTML=`<p style="color:var(--ba);padding:20px">${e.message}</p>`; }
    return;
  }

  // Community charts
  if (pageTitle) pageTitle.textContent = chartsTab==='top' ? '🏆 Top Charts' : '🔥 Trending';
  if (pageSub)   pageSub.textContent   = chartsTab==='top' ? 'Highest rated by our community.' : 'Most reviewed this week.';
  try {
    const data = chartsTab==='top' ? await API.getTopCharts() : await API.getTrendingCharts();
    if (!data.length) { loadTrending('all','chartsGrid'); return; }
    grid.innerHTML = data.map((s,i) => `
      <div class="tcard" onclick="selectShow('${s._id}')">
        <div class="tpwrap">
          <img class="tposter" src="${s.showPoster&&s.showPoster!=='N/A'?s.showPoster:''}" loading="lazy" onerror="this.style.opacity=0">
          <div class="toverlay"></div>
          <div class="rank-badge">#${i+1}</div>
          <div class="trbadge">⭐ ${parseFloat(s.avgRating).toFixed(1)}</div>
        </div>
        <div class="tinfo"><div class="ttitle">${s.showTitle||s._id}</div><div class="tmeta">${s.reviewCount} review${s.reviewCount!==1?'s':''}</div></div>
      </div>`).join('');
  } catch { loadTrending('all','chartsGrid'); }
}

function switchChartsTab(t) {
  chartsTab = t;
  document.querySelectorAll('#page-charts .ltab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#page-charts .ltab').forEach((b,i) => {
    if (['top','trending','myratings','epratings'][i] === t) b.classList.add('active');
  });
  loadChartsPage();
}

// ─── STATS ────────────────────────────────────────────
async function loadStatsPage() {
  const c=document.getElementById('statsContent');
  if (!currentUser) {
    c.innerHTML=`<div class="lock-wall"><div class="li">🔒</div><h3>Sign In to See Your Stats</h3><p>Track your ratings and activity.</p><div class="lw-btns"><button class="hbtn" onclick="openModal('auth','login')">Log In</button><button class="hbtn primary" onclick="openModal('auth','signup')">Sign Up</button></div></div>`;
    return;
  }
  c.innerHTML=`<div class="loader" style="display:flex"><div class="spinner"></div></div>`;
  try {
    const s=await API.getMyStats();
    const maxDist=Math.max(...s.distribution.map(d=>d.count),1);
    // Cards: clickable ones get onclick + cursor:pointer + hover hint
    const CARDS = [
      ['❤️','Favorites',s.totalFavorites,'rgba(255,71,87,.1)','goLists()'],
      ['🕐','Watch Later',s.totalWatchLater,'rgba(232,160,0,.1)','switchListTab(\'watchLater\')'],
      ['▶️','Watching',s.totalWatching,'rgba(61,127,255,.1)','switchListTab(\'watching\')'],
      ['🏁','Completed',s.totalCompleted,'rgba(34,211,122,.1)','switchListTab(\'completed\')'],
      ['💬','Reviews',s.totalReviews,'rgba(192,132,252,.1)','openStatsDetail(\'reviews\')'],
      ['⭐','Ep. Ratings',s.totalEpRatings,'rgba(232,160,0,.1)','switchListTab(\'epratings\')'],
      ['🌟','Avg Rating',s.avgRating||'–','rgba(34,211,122,.1)',''],
    ];
    c.innerHTML=`
      <div class="stats-grid">
        ${CARDS.map(([icon,label,val,bg,action])=>`
          <div class="stat-big ${action?'stat-clickable':''}" ${action?`onclick="${action}" title="Click to view all"`:''}  style="${action?'cursor:pointer':''}">
            <div class="stat-icon" style="background:${bg}">${icon}</div>
            <div><div class="stat-num">${val}</div><div class="stat-desc">${label}${action?` <span style="font-size:.6rem;color:var(--mu)">↗</span>`:''}</div></div>
          </div>`).join('')}
      </div>
      <div class="card">
        <div class="cal" style="background:linear-gradient(90deg,var(--ac),transparent)"></div>
        <div class="card-hd"><div class="card-title">YOUR RATING DISTRIBUTION</div></div>
        ${s.distribution.map(d=>`
          <div class="dist-bar"><span class="dist-label">${d.score}</span><div class="dist-track"><div class="dist-fill" style="width:${d.count?(d.count/maxDist*100).toFixed(0):0}%"></div></div><span class="dist-count">${d.count}</span></div>`).join('')}
      </div>
      ${s.recentReviews?.length?`
      <div class="card">
        <div class="cal" style="background:linear-gradient(90deg,var(--go),transparent)"></div>
        <div class="card-hd">
          <div class="card-title">RECENT REVIEWS</div>
          <button class="cc-btn on" onclick="openStatsDetail('reviews')">See All →</button>
        </div>
        ${s.recentReviews.map(r=>`
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--br);cursor:pointer" onclick="selectShow('${r.imdbID}')">
            <img src="${r.showPoster&&r.showPoster!=='N/A'?r.showPoster:''}" style="width:34px;height:48px;border-radius:5px;object-fit:cover;background:var(--s3)" onerror="this.style.opacity=0">
            <div style="flex:1"><div style="font-size:.86rem;font-weight:700">${r.showTitle||r.imdbID}</div><div style="font-size:.71rem;color:var(--mu)">${new Date(r.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div></div>
            ${r.rating?`<div style="font-family:'DM Mono',monospace;color:var(--ac);font-size:.9rem">⭐ ${r.rating}</div>`:''}
          </div>`).join('')}
      </div>`:``}`;
  } catch(e) { c.innerHTML=`<p style="color:var(--ba)">Could not load stats: ${e.message}</p>`; }
}

// ─── STATS DETAIL MODAL ───────────────────────────────
async function openStatsDetail(type) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay show';
  overlay.id = 'modal-stats-detail';
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };

  const titles = { reviews:'💬 My Reviews', epratings:'⭐ My Episode Ratings' };
  overlay.innerHTML = `
    <div class="modal modal-wide" style="max-height:85vh;overflow-y:auto">
      <button class="mc" onclick="document.getElementById('modal-stats-detail').remove()">✕</button>
      <h2 style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;letter-spacing:.07em;margin-bottom:18px">${titles[type]||'My Data'}</h2>
      <div id="statsDetailContent"><div class="loader-inline">Loading…</div></div>
    </div>`;
  document.body.appendChild(overlay);

  const c = document.getElementById('statsDetailContent');
  try {
    if (type === 'reviews') {
      const reviews = await API.getMyReviews();
      if (!reviews.length) { c.innerHTML=`<p style="color:var(--mu);text-align:center;padding:30px">No reviews yet.</p>`; return; }
      c.innerHTML = reviews.map(r => renderReviewCard(r, {showTitle:true})).join('');
    }
    if (type === 'epratings') {
      const ratings = await API.getMyEpRatings();
      if (!ratings.length) { c.innerHTML=`<p style="color:var(--mu);text-align:center;padding:30px">No episode ratings yet.</p>`; return; }
      // Group by show, fetch show info for title/poster
      const byShow = {};
      ratings.forEach(r => {
        if (!byShow[r.imdbID]) byShow[r.imdbID] = { imdbID:r.imdbID, eps:[] };
        byShow[r.imdbID].eps.push(r);
      });
      // Fetch show details for each group (title + poster)
      await Promise.allSettled(Object.values(byShow).map(async show => {
        try {
          const info = await API.getShow(show.imdbID);
          show.title  = info.Title  || show.imdbID;
          show.poster = info.Poster && info.Poster !== 'N/A' ? info.Poster : '';
        } catch { show.title = show.imdbID; show.poster = ''; }
      }));
      c.innerHTML = Object.values(byShow).map(show => `
        <div style="margin-bottom:24px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--br);cursor:pointer" onclick="selectShow('${show.imdbID}')">
            ${show.poster ? `<img src="${show.poster}" style="width:32px;height:46px;border-radius:5px;object-fit:cover">` : ''}
            <div style="font-size:.9rem;font-weight:700;color:var(--tx)">📺 ${show.title}</div>
            <div style="margin-left:auto;font-size:.72rem;color:var(--mu)">${show.eps.length} ep${show.eps.length>1?'s':''} rated</div>
          </div>
          ${show.eps.sort((a,b)=>b.rating-a.rating).map(r => {
            const {bg,text} = rColor(r.rating);
            return `<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04)">
              <div style="min-width:38px;height:38px;border-radius:8px;background:${bg};color:${text};font-family:'DM Mono',monospace;font-size:.9rem;font-weight:700;display:flex;align-items:center;justify-content:center">${r.rating}</div>
              <div style="flex:1">
                <div style="font-size:.84rem;font-weight:600">S${String(r.season).padStart(2,'0')} E${String(r.episode).padStart(2,'0')}</div>
                ${r.note?`<div style="font-size:.72rem;color:var(--mu)">${r.note}</div>`:''}
              </div>
            </div>`;
          }).join('')}
        </div>`).join('');
    }
  } catch(e) { c.innerHTML=`<p style="color:var(--ba)">${e.message}</p>`; }
}

// ─── EPISODE PAGE ────────────────────────────────────────
async function openEpisodePage(imdbID, season, episode) {
  prevPage = 'show';
  showPage('episode');
  const c = document.getElementById('epPageContent');
  // Show loader inline — don't wipe content yet
  c.innerHTML = `<div class="loader" style="display:flex;padding:60px 0"><div class="spinner"></div>Loading episode…</div>`;

  try {
    // Fetch episode details + community reviews in parallel
    const [ep, reviews] = await Promise.all([
      API.getEpisode(imdbID, season, episode),
      API.getReviews(`${imdbID}-S${season}E${episode}`).catch(()=>[])
    ]);

    const myKey = `S${season}E${episode}`;
    const myR   = myEpRatings[myKey];
    const imdbR = parseFloat(ep.imdbRating);
    const {bg: rBg} = !isNaN(imdbR) ? rColor(imdbR) : {bg:'var(--mu)'};
    const imdbUrl = ep.imdbEpId ? `https://www.imdb.com/title/${ep.imdbEpId}/` : `https://www.imdb.com/title/${imdbID}/episodes?season=${season}`;


    c.innerHTML = `
      <div class="ep-page">

        <!-- Hero -->
        <div class="ep-hero">
          ${ep.still ? `<img class="ep-still" src="${ep.still}" onerror="this.style.display='none'">` : ''}
          <div class="ep-hero-info">
            <div class="ep-meta-top">
              <span class="badge blue">S${String(season).padStart(2,'0')} E${String(episode).padStart(2,'0')}</span>
              ${ep.airDate ? `<span class="badge">${new Date(ep.airDate).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</span>` : ''}
              ${ep.runtime ? `<span class="badge">${ep.runtime} min</span>` : ''}
            </div>
            <h1 class="ep-title">${ep.title}</h1>
            <div class="ep-show-name" onclick="goBack()" style="cursor:pointer;color:var(--ac);font-size:.85rem;margin-bottom:14px">
              ← ${currentShow?.Title || ''}
            </div>

            <!-- Ratings row -->
            <div class="ep-ratings-row">
              ${ep.imdbRating ? `
                <div class="ep-rating-box" style="border-color:${rBg}">
                  <div class="ep-rating-val" style="color:${rBg}">${ep.imdbRating}</div>
                  <div class="ep-rating-lbl">IMDB</div>
                  ${ep.imdbVotes ? `<div class="ep-rating-votes">${ep.imdbVotes}</div>` : ''}
                </div>` : ''}
              ${ep.tmdbRating && ep.tmdbVotes > 0 ? `
                <div class="ep-rating-box" style="border-color:#01b4e4">
                  <div class="ep-rating-val" style="color:#01b4e4">${ep.tmdbRating}</div>
                  <div class="ep-rating-lbl">TMDB</div>
                  ${ep.tmdbVotes ? `<div class="ep-rating-votes">${ep.tmdbVotes} votes</div>` : ''}
                </div>` : ''}
              ${myR ? `
                <div class="ep-rating-box" style="border-color:#a78bfa">
                  <div class="ep-rating-val" style="color:#a78bfa">${myR.rating}</div>
                  <div class="ep-rating-lbl">MY RATING</div>
                  ${myR.note ? `<div class="ep-rating-votes">${myR.note}</div>` : ''}
                </div>` : ''}
            </div>

            <!-- Action buttons -->
            <div class="ep-actions">
              <button class="act-btn on" onclick="openEpRateModal(${season},${episode},'${ep.title.replace(/'/g,"\'")}')">
                ${myR ? `★ Edit Rating (${myR.rating}/10)` : '☆ Rate Episode'}
              </button>
              <a class="act-btn" href="${imdbUrl}" target="_blank" rel="noopener"
                style="text-decoration:none;background:#f5c518;color:#000;border-color:#f5c518;font-weight:700">
                🔗 Open on IMDB
              </a>
            </div>
          </div>
        </div>

        <!-- Plot -->
        ${ep.overview ? `
        <div class="card" style="margin-top:18px">
          <div class="cal" style="background:linear-gradient(90deg,var(--ac),transparent)"></div>
          <div class="card-hd"><div class="card-title">PLOT SUMMARY</div></div>
          <p style="font-size:.88rem;color:var(--m2);line-height:1.7;padding:4px 0">${ep.overview}</p>
        </div>` : ''}

        <!-- Director / Writer -->
        ${ep.director||ep.writer ? `
        <div class="card" style="margin-top:12px">
          <div class="cal" style="background:linear-gradient(90deg,#c084fc,transparent)"></div>
          <div class="card-hd"><div class="card-title">CREW</div></div>
          ${ep.director ? `<div style="display:flex;gap:8px;margin-bottom:8px"><span style="color:var(--mu);font-size:.8rem;min-width:70px">Director</span><span style="font-size:.88rem;font-weight:600">${ep.director}</span></div>` : ''}
          ${ep.writer   ? `<div style="display:flex;gap:8px"><span style="color:var(--mu);font-size:.8rem;min-width:70px">Writer</span><span style="font-size:.88rem;font-weight:600">${ep.writer}</span></div>` : ''}
        </div>` : ''}

        <!-- Photos -->
        ${ep.images?.length ? `
        <div class="card" style="margin-top:12px">
          <div class="cal" style="background:linear-gradient(90deg,var(--bl),transparent)"></div>
          <div class="card-hd"><div class="card-title">PHOTOS</div></div>
          <div class="ep-photos">
            ${ep.images.map(img=>`<img class="ep-photo" src="${img}" loading="lazy" onerror="this.style.display='none'" onclick="window.open('${img.replace('w400','original')}','_blank')">`).join('')}
          </div>
        </div>` : ''}

        <!-- Guest Cast -->
        ${ep.cast?.length ? `
        <div class="card" style="margin-top:12px">
          <div class="cal" style="background:linear-gradient(90deg,#f97316,transparent)"></div>
          <div class="card-hd"><div class="card-title">GUEST CAST</div></div>
          <div class="cast-grid">
            ${ep.cast.map(a=>`
              <div class="cast-card">
                ${a.photo?`<img class="cast-photo" src="${a.photo}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`:``}
                <div class="cast-no-photo" style="${a.photo?'display:none':''}">🎭</div>
                <div class="cast-real">${a.name}</div>
                <div class="cast-char">${a.character||''}</div>
              </div>`).join('')}
          </div>
        </div>` : ''}

        <!-- Community Reviews -->
        <div class="card" style="margin-top:12px">
          <div class="cal" style="background:linear-gradient(90deg,var(--go),transparent)"></div>
          <div class="card-hd">
            <div class="card-title">COMMUNITY REVIEWS</div>
            <button class="cc-btn on" onclick="openEpReviewModal(${season},${episode},'${ep.title.replace(/'/g,"\'")}')">+ Write Review</button>
          </div>
          <div id="epReviewsList">
            ${reviews.length ? reviews.map(r=>{
              const ini=(r.user?.displayName||r.user?.username||'?').slice(0,2).toUpperCase();
              const col=r.user?.avatarColor||'#e8a000';
              const date=new Date(r.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
              return `<div class="review-card">
                <div class="review-header">
                  <div class="rev-avatar" style="background:${col}">${ini}</div>
                  <div style="flex:1"><div class="rev-user">${r.user?.displayName||r.user?.username||'User'}</div><div class="rev-date">${date}</div></div>
                  ${r.rating?`<div class="rev-score">⭐ ${r.rating}/10</div>`:''}
                </div>
                ${r.containsSpoilers?'<div class="rev-spoiler">⚠️ Contains Spoilers</div>':''}
                ${r.title?`<div class="rev-title">${r.title}</div>`:''}
                ${r.body?`<div class="rev-body">${r.body}</div>`:''}
                <div class="rev-actions"><button class="rev-like-btn" onclick="likeReview('${r._id}',this)">❤️ ${r.likesCount||0}</button></div>
              </div>`;
            }).join('') : '<div class="no-reviews"><div class="nr-icon">💬</div><p>No reviews for this episode yet.</p></div>'}
          </div>
        </div>

      </div>`;

    // Store current episode context for the rate/review modals
    window._currentEpContext = { imdbID, season, episode, title: ep.title };

  } catch(err) {
    c.innerHTML = `<p style="color:var(--ba);padding:20px">Could not load episode: ${err.message}</p>`;
    console.error('Episode page error:', err);
  }
}

function openEpReviewModal(season, episode, title) {
  if (!currentUser) { openModal('auth','login'); return; }
  // Reuse the review modal but for a specific episode
  const epImdbKey = `${window._currentEpContext?.imdbID}-S${season}E${episode}`;
  reviewRating = 0;
  const overlay = document.createElement('div');
  overlay.className = 'overlay show';
  overlay.id = 'modal-ep-review';
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="modal">
      <button class="mc" onclick="document.getElementById('modal-ep-review').remove()">✕</button>
      <h2 style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;letter-spacing:.07em;margin-bottom:4px">Review Episode</h2>
      <p style="color:var(--mu);font-size:.82rem;margin-bottom:18px">S${String(season).padStart(2,'0')} E${String(episode).padStart(2,'0')} · ${title}</p>
      <div class="err-msg" id="epRevErr"></div>
      <div class="field"><label>Your Rating (1–10)</label><div class="star-row" id="epRevStars"></div></div>
      <div class="field"><label>Title (optional)</label><input type="text" id="ep-rev-title" maxlength="120" placeholder="e.g. Best episode ever"></div>
      <div class="field"><label>Review (optional)</label><textarea id="ep-rev-body" rows="4" maxlength="2000" placeholder="Share your thoughts…"></textarea></div>
      <label class="check-row"><input type="checkbox" id="ep-rev-spoiler"> Contains spoilers</label>
      <button class="mbtn" style="margin-top:16px" onclick="submitEpReview('${epImdbKey}','${title.replace(/'/g,"\'")}')">Publish Review</button>
    </div>`;
  document.body.appendChild(overlay);
  buildStars('epRevStars', n => { reviewRating = n; overlay._getRating = () => n; });
  overlay._getRating = () => reviewRating;
}

async function submitEpReview(epImdbKey, showTitle) {
  const overlay = document.getElementById('modal-ep-review');
  const rating  = overlay._getRating();
  if (!rating) { showMsg('epRevErr','Please select a rating.'); return; }
  try {
    await API.submitReview(epImdbKey, {
      rating,
      title:           document.getElementById('ep-rev-title').value.trim(),
      body:            document.getElementById('ep-rev-body').value.trim(),
      containsSpoilers:document.getElementById('ep-rev-spoiler').checked,
      showTitle, showPoster: currentShow?.Poster || ''
    });
    overlay.remove();
    showToast('Review published ✓');
    // Refresh reviews list on episode page
    const ctx = window._currentEpContext;
    if (ctx) {
      const reviews = await API.getReviews(epImdbKey).catch(()=>[]);
      const list = document.getElementById('epReviewsList');
      if (list) list.innerHTML = reviews.length
        ? reviews.map(r => renderReviewCard(r)).join('')
        : '<div class="no-reviews"><div class="nr-icon">💬</div><p>No reviews yet.</p></div>';
    }
  } catch(e) { showMsg('epRevErr', e.message); }
}

// ─── SHOW RATING MODAL ───────────────────────────────────
function openRateShowModal() {
  if (!currentUser) { openModal('auth','login'); return; }
  let ratingVal = myShowRating?.rating || 0;

  const existing = document.getElementById('modal-showrate');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'overlay show';
  overlay.id = 'modal-showrate';
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="modal" style="max-width:400px">
      <button class="mc" onclick="document.getElementById('modal-showrate').remove()">✕</button>
      <h2 style="font-family:'Bebas Neue',sans-serif;font-size:1.8rem;letter-spacing:.07em;margin-bottom:4px">Rate This Show</h2>
      <p style="color:var(--mu);font-size:.83rem;margin-bottom:18px">${currentShow?.Title||''}</p>
      <div class="err-msg" id="showRateErr"></div>
      <div class="field">
        <label>Your Rating (1–10)</label>
        <div class="star-row" id="showRateStars"></div>
      </div>
      <div class="field">
        <label>Note (optional)</label>
        <input type="text" id="showRateNote" placeholder="e.g. Masterpiece of television" maxlength="300" value="${myShowRating?.note||''}">
      </div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="mbtn" style="flex:1" onclick="submitShowRating()">Save Rating</button>
        ${myShowRating ? `<button class="mbtn ghost" onclick="deleteShowRating()">Remove</button>` : ''}
      </div>
    </div>`;
  document.body.appendChild(overlay);
  buildStars('showRateStars', n => { ratingVal = n; overlay._getRating = () => ratingVal; }, ratingVal);
  overlay._getRating = () => ratingVal;
}

async function submitShowRating() {
  const overlay = document.getElementById('modal-showrate');
  const rating  = overlay._getRating();
  if (!rating) { showMsg('showRateErr','Please select a rating.'); return; }
  try {
    const saved = await API.rateShow(currentShow.imdbID, {
      rating,
      note:       document.getElementById('showRateNote').value.trim(),
      showTitle:  currentShow.Title,
      showPoster: currentShow.Poster,
      showYear:   currentShow.Year
    });
    myShowRating = saved;
    overlay.remove();
    showToast(`⭐ ${rating}/10 saved for ${currentShow.Title}`);
    renderActionRow(); // refresh button to show new rating
  } catch(e) { showMsg('showRateErr', e.message); }
}

async function deleteShowRating() {
  if (!confirm('Remove your rating for this show?')) return;
  try {
    await API.deleteShowRating(currentShow.imdbID);
    myShowRating = null;
    document.getElementById('modal-showrate')?.remove();
    showToast('Rating removed.');
    renderActionRow();
  } catch(e) { showToast('Error: '+e.message); }
}

// ─── TRENDING ─────────────────────────────────────────
function setCategory(cat) {
  document.querySelectorAll('.cat-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('cat-'+cat)?.classList.add('active');
  const labels={all:'Trending Now',series:'Popular Series',anime:'Popular Anime',cartoon:'Popular Cartoons',movie:'Popular Movies'};
  document.getElementById('trendLabel').textContent=labels[cat]||'Trending Now';
  showPage('home');
  loadTrending(cat);
}

async function loadTrending(cat='all', targetId='trendGrid') {
  const g=document.getElementById(targetId);
  if (!g) return;
  const ids=CATALOG[cat]||CATALOG.all;
  g.innerHTML=ids.map(()=>`<div class="skel-card"><div class="skel-poster"></div><div class="skel-line"></div><div class="skel-line s"></div></div>`).join('');
  try {
    const results=await Promise.allSettled(ids.map(id=>API.getShow(id)));
    const shows=results.filter(r=>r.status==='fulfilled'&&r.value?.Response==='True').map(r=>r.value);
    if (!shows.length) { g.innerHTML=`<p style="color:var(--mu);padding:20px">Could not load titles.</p>`; return; }
    g.innerHTML=shows.map(s=>`
      <div class="tcard" onclick="selectShow('${s.imdbID}')">
        <div class="tpwrap">
          <img class="tposter" src="${s.Poster&&s.Poster!=='N/A'?s.Poster:''}" alt="" loading="lazy" onerror="this.style.opacity=0">
          <div class="toverlay"></div>
          <div class="trbadge">⭐ ${s.imdbRating||'–'}</div>
        </div>
        <div class="tinfo">
          <div class="ttitle">${s.Title}</div>
          <div class="tmeta">${s.Year||''} · ${s.totalSeasons?s.totalSeasons+' seasons':s.Type||''}</div>
        </div>
      </div>`).join('');
  } catch(e) { g.innerHTML=`<p style="color:var(--mu);padding:20px">Could not load titles.</p>`; }
}

// ─── HELPERS ──────────────────────────────────────────
function gv(id) { return document.getElementById(id)?.value?.trim()||''; }
function clearMsg(id) { const e=document.getElementById(id); if(e){e.style.display='none';e.textContent='';} }
function showMsg(id,msg) { const e=document.getElementById(id); if(e){e.textContent=msg;e.style.display='block';} }

let toastT;
function showToast(msg) {
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(toastT);
  toastT=setTimeout(()=>t.classList.remove('show'),2800);
}

// ─── WINDOW EXPORTS ───────────────────────────────────
window.doLogin = doLogin; window.doSignup = doSignup; window.doLogout = doLogout;
window.openModal = openModal; window.closeModal = closeModal; window.overlayClose = overlayClose;
window.switchAuthTab = switchAuthTab; window.switchProfileTab = switchProfileTab;
window.saveProfile = saveProfile; window.saveSetting = saveSetting; window.savePassword = savePassword;
window.pickColor = pickColor;
window.goHome = goHome; window.goPage = goPage; window.goBack = goBack; window.goLists = goLists;
window.setCategory = setCategory; window.selectShow = selectShow;
window.switchShowTab = switchShowTab; window.switchChartSeason = switchChartSeason;
window.zoomChart = zoomChart; window.toggleSmooth = toggleSmooth;
window.toggleList = toggleList; window.switchListTab = switchListTab;
window.openReviewModal = openReviewModal; window.submitReview = submitReview;
window.openEpRateModal = openEpRateModal; window.submitEpRating = submitEpRating;
window.likeReview = likeReview; window.switchChartsTab = switchChartsTab;
window.doSearch = doSearch;
// New features
window.openStatsDetail   = openStatsDetail;
window.openEditReview    = openEditReview;
window.submitEditReview  = submitEditReview;
window.deleteReview      = deleteReview;
window.openRateShowModal  = openRateShowModal;
window.openEpisodePage    = openEpisodePage;
window.openEpReviewModal  = openEpReviewModal;
window.submitEpReview     = submitEpReview;
window.submitShowRating  = submitShowRating;
window.deleteShowRating  = deleteShowRating;
