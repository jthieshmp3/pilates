/* ============================================================
   MOVE FITNESS — Admin Dashboard
   admin.js — live data from Google Sheet via Apps Script
   ============================================================ */

'use strict';

// ── CONFIG ───────────────────────────────────────────────────
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxqLNoqF3oP6KzI6yFE5ru_OeyWvEJrYXII_fEgNDyqx0a_XruU7S56yPj3ltoNlo9UFg/exec';
const ADMIN_PASSWORD  = '6466';
const MAX_CAPACITY    = 8;

// ── CLASS PRICES ─────────────────────────────────────────────
const CLASS_PRICES = {
  'Reformer Foundations': 85,
  'Dynamic Flow':         95,
  'Core Sculpt':          90,
  'Stretch & Restore':    80,
  'Private Session':     220,
  'Duo Session':         160,
};

// ── MASTER TIMETABLE ─────────────────────────────────────────
// Must match booking.js SCHEDULE exactly — same instructors, times, days
const TIMETABLE = {
  Mon: [
    { time: '7:00 AM',  cls: 'Reformer Foundations', instructor: 'Sarah Lim'  },
    { time: '9:00 AM',  cls: 'Core Sculpt',          instructor: 'Aina Razak' },
    { time: '5:30 PM',  cls: 'Dynamic Flow',         instructor: 'Marcus Tan' },
    { time: '7:00 PM',  cls: 'Stretch & Restore',    instructor: 'Priya Nair' },
  ],
  Tue: [
    { time: '7:00 AM',  cls: 'Dynamic Flow',         instructor: 'Marcus Tan' },
    { time: '9:00 AM',  cls: 'Reformer Foundations', instructor: 'Sarah Lim'  },
    { time: '5:30 PM',  cls: 'Core Sculpt',          instructor: 'Aina Razak' },
    { time: '7:00 PM',  cls: 'Stretch & Restore',    instructor: 'Priya Nair' },
  ],
  Wed: [
    { time: '7:00 AM',  cls: 'Core Sculpt',          instructor: 'Aina Razak' },
    { time: '9:00 AM',  cls: 'Reformer Foundations', instructor: 'Marcus Tan' },
    { time: '11:00 AM', cls: 'Stretch & Restore',    instructor: 'Priya Nair' },
    { time: '5:30 PM',  cls: 'Dynamic Flow',         instructor: 'Marcus Tan' },
    { time: '7:00 PM',  cls: 'Core Sculpt',          instructor: 'Aina Razak' },
  ],
  Thu: [
    { time: '7:00 AM',  cls: 'Stretch & Restore',    instructor: 'Priya Nair' },
    { time: '9:00 AM',  cls: 'Dynamic Flow',         instructor: 'Sarah Lim'  },
    { time: '5:30 PM',  cls: 'Reformer Foundations', instructor: 'Marcus Tan' },
    { time: '7:00 PM',  cls: 'Core Sculpt',          instructor: 'Aina Razak' },
  ],
  Fri: [
    { time: '7:00 AM',  cls: 'Dynamic Flow',         instructor: 'Sarah Lim'  },
    { time: '9:00 AM',  cls: 'Core Sculpt',          instructor: 'Aina Razak' },
    { time: '5:30 PM',  cls: 'Reformer Foundations', instructor: 'Sarah Lim'  },
    { time: '7:00 PM',  cls: 'Stretch & Restore',    instructor: 'Priya Nair' },
  ],
  Sat: [
    { time: '8:00 AM',  cls: 'Reformer Foundations', instructor: 'Sarah Lim'  },
    { time: '10:00 AM', cls: 'Dynamic Flow',         instructor: 'Marcus Tan' },
    { time: '12:00 PM', cls: 'Stretch & Restore',    instructor: 'Priya Nair' },
  ],
  Sun: [], // no classes
};

const DAY_ORDER  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAY_LABELS = { Mon:'Monday', Tue:'Tuesday', Wed:'Wednesday', Thu:'Thursday', Fri:'Friday', Sat:'Saturday', Sun:'Sunday' };

// ── TIME SORT ORDER ──────────────────────────────────────────
const TIME_ORDER = ['7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','5:30 PM','7:00 PM'];

// ── APP STATE ────────────────────────────────────────────────
let isLoggedIn  = false;   // in-memory only — no sessionStorage (blocked in iframe)
let allBookings = [];
let activeTab   = 'overview';

// ── DOM REFS ─────────────────────────────────────────────────
const gate          = document.getElementById('gate');
const dash          = document.getElementById('dash');
const pwInput       = document.getElementById('pwInput');
const gateBtn       = document.getElementById('gateBtn');
const gateError     = document.getElementById('gateError');
const loadBar       = document.getElementById('loadBar');
const refreshBtn    = document.getElementById('refreshBtn');
const topbarRefresh = document.getElementById('topbarRefresh');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar       = document.getElementById('sidebar');
const mobOverlay    = document.getElementById('mobOverlay');
const topbarTitle   = document.getElementById('topbarTitle');
const logoutBtn     = document.getElementById('logoutBtn');
const apiStatus     = document.getElementById('apiStatus');
const overviewDate  = document.getElementById('overviewDate');
const bookingBadge  = document.getElementById('bookingBadge');

const svToday      = document.getElementById('sv-today');
const svMonth      = document.getElementById('sv-month');
const svRev        = document.getElementById('sv-rev');
const svPop        = document.getElementById('sv-pop');
const barChartWrap = document.getElementById('barChartWrap');
const todayList    = document.getElementById('todayList');
const todayCount   = document.getElementById('todayCount');

const bookingSearch = document.getElementById('bookingSearch');
const statusFilter  = document.getElementById('statusFilter');
const bookingsCard  = document.getElementById('bookingsTableCard');
const bookingsEmpty = document.getElementById('bookingsEmpty');
const scheduleWrap  = document.getElementById('scheduleWrap');

const tabs    = document.querySelectorAll('.tab');
const navBtns = document.querySelectorAll('.nav-item[data-tab]');

// ============================================================
//  PASSWORD GATE
// ============================================================
function tryLogin() {
  if (pwInput.value.trim() === ADMIN_PASSWORD) {
    isLoggedIn = true;
    gate.style.transition = 'opacity 0.3s ease';
    gate.style.opacity    = '0';
    setTimeout(() => {
      gate.style.display = 'none';
      dash.classList.remove('hidden');
      if (typeof gsap !== 'undefined') {
        gsap.from('.sidebar',  { x: -20, opacity: 0, duration: 0.4, ease: 'power2.out' });
        gsap.from('.tab.active', { y: 12, opacity: 0, duration: 0.4, delay: 0.1, ease: 'power2.out' });
      }
      setOverviewDate();
      fetchAll();
    }, 320);
  } else {
    gateError.textContent    = 'Incorrect password.';
    pwInput.value            = '';
    pwInput.style.borderColor = 'var(--red, #e05252)';
    pwInput.focus();
    setTimeout(() => {
      gateError.textContent    = '';
      pwInput.style.borderColor = '';
    }, 2200);
  }
}

gateBtn.addEventListener('click', tryLogin);
pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });

// ============================================================
//  TAB SWITCHING
// ============================================================
function switchTab(name) {
  activeTab = name;

  navBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === name));

  tabs.forEach(section => {
    const match = section.id === 'tab-' + name;
    section.classList.toggle('active', match);
    section.classList.toggle('hidden', !match);
    if (match && typeof gsap !== 'undefined') {
      gsap.from(section, { y: 8, opacity: 0, duration: 0.3, ease: 'power2.out' });
    }
  });

  const labels = { overview: 'Overview', bookings: 'Bookings', schedule: 'Schedule', settings: 'Settings' };
  if (topbarTitle) topbarTitle.textContent = labels[name] || name;

  if (name === 'settings') setTimeout(checkApiStatus, 150);

  closeSidebar();
}

navBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

// ============================================================
//  MOBILE SIDEBAR
// ============================================================
function openSidebar()  {
  sidebar.classList.add('open');
  mobOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  sidebar.classList.remove('open');
  mobOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

sidebarToggle.addEventListener('click', openSidebar);
mobOverlay.addEventListener('click',    closeSidebar);

// ============================================================
//  LOADING BAR
// ============================================================
function startLoad() {
  loadBar.classList.add('loading');
  if (refreshBtn)    refreshBtn.classList.add('spinning');
  if (topbarRefresh) topbarRefresh.classList.add('spinning');
}
function stopLoad() {
  loadBar.classList.remove('loading');
  if (refreshBtn)    refreshBtn.classList.remove('spinning');
  if (topbarRefresh) topbarRefresh.classList.remove('spinning');
}

// ============================================================
//  FETCH — both endpoints in parallel
// ============================================================
async function fetchAll() {
  if (!isLoggedIn) return;
  startLoad();

  try {
    const [statsRes, bookingsRes] = await Promise.all([
      fetch(APPS_SCRIPT_URL + '?action=getStats',    { cache: 'no-store' }),
      fetch(APPS_SCRIPT_URL + '?action=getBookings', { cache: 'no-store' }),
    ]);

    const statsJson    = await statsRes.json();
    const bookingsJson = await bookingsRes.json();

    if (statsJson.status === 'success') {
      renderStats(statsJson);
      renderBarChart(statsJson.weekCounts);
      renderTodayList(statsJson.todayClasses || []);
    }

    if (bookingsJson.status === 'success') {
      allBookings = bookingsJson.bookings || [];
      renderBookingsTable(allBookings);
      renderSchedule(allBookings);
      updateBookingBadge(allBookings.length);
    }

    if (apiStatus) {
      apiStatus.textContent = 'Connected';
      apiStatus.className   = 'info-val api-status ok';
    }

  } catch (err) {
    console.error('Fetch error:', err);
    if (apiStatus) {
      apiStatus.textContent = 'Connection failed';
      apiStatus.className   = 'info-val api-status err';
    }
    renderFallback();
  } finally {
    stopLoad();
  }
}

function renderFallback() {
  [svToday, svMonth, svRev, svPop].forEach(el => { if (el) el.textContent = '—'; });
  if (barChartWrap) barChartWrap.innerHTML = '<p style="padding:1.5rem;font-size:.8rem;color:var(--faint);text-align:center;">Unable to load chart.</p>';
  if (todayList)    todayList.innerHTML    = '<p class="today-empty">Could not load. Check your Apps Script URL.</p>';
  if (bookingsCard) bookingsCard.innerHTML = '<p style="padding:2rem;text-align:center;font-size:.85rem;color:var(--faint);">Unable to load bookings.</p>';
  if (scheduleWrap) scheduleWrap.innerHTML = buildScheduleHTML({});
}

// ============================================================
//  OVERVIEW — STAT CARDS
// ============================================================
function renderStats(stats) {
  document.querySelectorAll('.stat-card.skeleton').forEach(c => c.classList.remove('skeleton'));
  animateCount(svToday, stats.todayCount  || 0);
  animateCount(svMonth, stats.monthCount  || 0);
  if (svRev) svRev.textContent = 'RM ' + (stats.monthRevenue || 0).toLocaleString('en-MY');
  if (svPop) svPop.textContent = stats.mostPopular || 'N/A';
  if (todayCount) todayCount.textContent = (stats.todayCount || 0) + ' booked';
}

function animateCount(el, target) {
  if (!el) return;
  const duration = 800;
  const start    = performance.now();
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * e);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ============================================================
//  OVERVIEW — BAR CHART
// ============================================================
function renderBarChart(weekCounts) {
  if (!barChartWrap || !weekCounts) return;

  const days   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const values = days.map(d => weekCounts[d] || 0);
  const maxVal = Math.max(...values, 1);

  barChartWrap.innerHTML = '';
  const chart = document.createElement('div');
  chart.className = 'bar-chart';

  days.forEach((day, i) => {
    const val = values[i];
    const pct = (val / maxVal) * 100;

    const col   = document.createElement('div');  col.className = 'bar-col';
    const valEl = document.createElement('div');  valEl.className = 'bar-col__val'; valEl.textContent = val || '';
    const wrap  = document.createElement('div');  wrap.className = 'bar-col__bar-wrap';
    const bar   = document.createElement('div');  bar.className = 'bar-col__bar' + (val === 0 ? ' bar-col__bar--zero' : '');
    bar.style.height = '0%';
    const lbl   = document.createElement('div');  lbl.className = 'bar-col__lbl'; lbl.textContent = day;

    wrap.appendChild(bar);
    col.appendChild(valEl); col.appendChild(wrap); col.appendChild(lbl);
    chart.appendChild(col);

    setTimeout(() => { bar.style.height = Math.max(pct, val > 0 ? 4 : 2) + '%'; }, 80 + i * 55);
  });

  barChartWrap.appendChild(chart);
}

// ============================================================
//  OVERVIEW — TODAY'S CLASSES LIST
// ============================================================
function renderTodayList(classes) {
  if (!todayList) return;
  if (!classes || classes.length === 0) {
    todayList.innerHTML = '<p class="today-empty">No classes booked for today.</p>';
    return;
  }

  const sorted = [...classes].sort((a, b) => {
    const ai = TIME_ORDER.indexOf(a.time);
    const bi = TIME_ORDER.indexOf(b.time);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  todayList.innerHTML = sorted.map(c => `
    <div class="today-row">
      <div class="today-time">${esc(c.time)}</div>
      <div class="today-info">
        <div class="today-class">${esc(c.className)}</div>
        <div class="today-detail">${esc(c.instructor)} &middot; ${esc(c.name)}</div>
      </div>
    </div>
  `).join('');
}

// ============================================================
//  BOOKINGS TABLE
// ============================================================
function renderBookingsTable(bookings) {
  if (!bookingsCard) return;

  if (!bookings || bookings.length === 0) {
    bookingsCard.innerHTML = '';
    if (bookingsEmpty) bookingsEmpty.classList.remove('hidden');
    return;
  }
  if (bookingsEmpty) bookingsEmpty.classList.add('hidden');

  const sorted = [...bookings].sort((a, b) => b.id - a.id);

  bookingsCard.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Booking ID</th>
          <th>Client</th>
          <th>Class</th>
          <th>Date</th>
          <th>Time</th>
          <th>Instructor</th>
          <th>Status</th>
          <th>Booked On</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map((b, idx) => `
          <tr data-name="${esc((b.name||'').toLowerCase())}"
              data-class="${esc((b.className||'').toLowerCase())}"
              data-instructor="${esc((b.instructor||'').toLowerCase())}"
              data-status="${esc((b.status||'').toLowerCase())}">
            <td class="td-num">${sorted.length - idx}</td>
            <td class="td-id">${esc(b.bookingId || '—')}</td>
            <td>
              <div class="td-name">${esc(b.name || '—')}</div>
              <div style="font-size:.7rem;color:var(--muted)">${esc(b.email || '')}</div>
            </td>
            <td>${esc(b.className || '—')}</td>
            <td style="white-space:nowrap">${esc(b.date || '—')}</td>
            <td style="white-space:nowrap">${esc(b.time || '—')}</td>
            <td>${esc(b.instructor || '—')}</td>
            <td>${statusPill(b.status)}</td>
            <td style="font-size:.72rem;color:var(--muted)">${esc(b.timestamp || '—')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  applyBookingFilter();
}

function updateBookingBadge(count) {
  if (!bookingBadge) return;
  bookingBadge.textContent = count;
  bookingBadge.classList.toggle('visible', count > 0);
}

function statusPill(status) {
  const s   = (status || 'Pending').toLowerCase();
  const cls = s === 'confirmed' ? 'pill--confirmed'
            : s === 'cancelled' ? 'pill--cancelled'
            : s === 'completed' ? 'pill--completed'
            : 'pill--pending';
  return `<span class="pill ${cls}">${esc(status || 'Pending')}</span>`;
}

function applyBookingFilter() {
  const q   = (bookingSearch?.value || '').toLowerCase().trim();
  const st  = (statusFilter?.value  || '').toLowerCase().trim();
  const rows = bookingsCard ? bookingsCard.querySelectorAll('tbody tr') : [];
  let visible = 0;

  rows.forEach(row => {
    const matchQ  = !q  || row.dataset.name.includes(q) || row.dataset.class.includes(q) || row.dataset.instructor.includes(q);
    const matchSt = !st || row.dataset.status === st;
    row.classList.toggle('hidden-row', !(matchQ && matchSt));
    if (matchQ && matchSt) visible++;
  });

  if (bookingsEmpty) bookingsEmpty.classList.toggle('hidden', visible > 0);
}

if (bookingSearch) bookingSearch.addEventListener('input',  applyBookingFilter);
if (statusFilter)  statusFilter.addEventListener('change', applyBookingFilter);

// ============================================================
//  SCHEDULE TAB — live capacity
// ============================================================
function renderSchedule(bookings) {
  if (!scheduleWrap) return;
  scheduleWrap.innerHTML = buildScheduleHTML(bookings);
}

function buildScheduleHTML(bookings) {
  // Count confirmed bookings per slot key "Mon|9:00 AM|Core Sculpt"
  const map = {};
  if (Array.isArray(bookings)) {
    bookings.forEach(b => {
      if (!b.date || !b.time || !b.className) return;
      if ((b.status || '').toLowerCase() === 'cancelled') return;

      // Parse date — may be "Saturday, 30 May 2026" or "30 May 2026" or a timestamp string
      const cleaned = String(b.date).replace(/^[A-Za-z]+,\s*/, '');
      const parsed  = new Date(cleaned);
      if (isNaN(parsed)) return;

      const abbrs  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const dayAbbr = abbrs[parsed.getDay()];
      const key    = dayAbbr + '|' + b.time + '|' + b.className;
      map[key]     = (map[key] || 0) + 1;
    });
  }

  // Collect all unique times across all days
  const allTimes = [];
  DAY_ORDER.forEach(d => {
    (TIMETABLE[d] || []).forEach(slot => {
      if (!allTimes.includes(slot.time)) allTimes.push(slot.time);
    });
  });
  allTimes.sort((a, b) => {
    const ai = TIME_ORDER.indexOf(a);
    const bi = TIME_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  let html = `<table class="sched-table">
    <thead>
      <tr>
        <th class="time-col">Time</th>
        ${DAY_ORDER.map(d => `<th>${DAY_LABELS[d]}</th>`).join('')}
      </tr>
    </thead>
    <tbody>`;

  allTimes.forEach(time => {
    html += `<tr><td class="sched-time">${esc(time)}</td>`;
    DAY_ORDER.forEach(day => {
      const slots = (TIMETABLE[day] || []).filter(s => s.time === time);
      html += '<td>';
      if (slots.length === 0) {
        html += '<span class="sched-empty">—</span>';
      } else {
        slots.forEach(slot => {
          const booked  = map[day + '|' + slot.time + '|' + slot.cls] || 0;
          const remain  = MAX_CAPACITY - booked;
          const capCls  = booked === 0 ? 'cap-low'
                        : remain <= 2  ? 'cap-full'
                        : remain <= 4  ? 'cap-mid'
                        : 'cap-low';
          html += `
            <div class="sched-slot ${capCls}">
              <div class="sched-slot__cls">${esc(slot.cls)}</div>
              <div class="sched-slot__det">${esc(slot.instructor)}</div>
              <div class="sched-slot__live">${booked}/${MAX_CAPACITY}</div>
            </div>`;
        });
      }
      html += '</td>';
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  return html;
}

// ============================================================
//  SETTINGS — API STATUS CHECK
// ============================================================
async function checkApiStatus() {
  if (!apiStatus) return;
  apiStatus.textContent = 'Checking…';
  apiStatus.className   = 'info-val api-status';
  try {
    const res  = await fetch(APPS_SCRIPT_URL, { cache: 'no-store' });
    const json = await res.json();
    if (json.status === 'ok') {
      apiStatus.textContent = 'Connected';
      apiStatus.className   = 'info-val api-status ok';
    } else throw new Error();
  } catch {
    apiStatus.textContent = 'Connection failed — check deployment';
    apiStatus.className   = 'info-val api-status err';
  }
}

// ============================================================
//  LOGOUT
// ============================================================
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    isLoggedIn  = false;
    allBookings = [];
    dash.classList.add('hidden');
    gate.style.display = '';
    gate.style.opacity = '1';
    pwInput.value      = '';
    gateError.textContent = '';
    [svToday, svMonth, svRev, svPop].forEach(el => { if (el) el.textContent = '—'; });
  });
}

// ============================================================
//  REFRESH
// ============================================================
if (refreshBtn)    refreshBtn.addEventListener('click',    () => { if (isLoggedIn) fetchAll(); });
if (topbarRefresh) topbarRefresh.addEventListener('click', () => { if (isLoggedIn) fetchAll(); });

// ============================================================
//  HELPERS
// ============================================================
function setOverviewDate() {
  if (!overviewDate) return;
  overviewDate.textContent = new Date().toLocaleDateString('en-MY', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
//  BOOT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  if (pwInput) pwInput.focus();
});
