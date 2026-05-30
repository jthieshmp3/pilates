/* ============================================================
   MOVE FITNESS — booking.js
   3-step booking flow: class → date/time → details → confirm
   ============================================================ */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxqLNoqF3oP6KzI6yFE5ru_OeyWvEJrYXII_fEgNDyqx0a_XruU7S56yPj3ltoNlo9UFg/exec';

/* ── MASTER TIMETABLE ────────────────────────────────────────
   Single source of truth. Must match admin.js TIMETABLE.
   Instructors: Sarah Lim, Marcus Tan, Aina Razak, Priya Nair
   ─────────────────────────────────────────────────────────── */
const SCHEDULE = {
  Monday: [
    { time: '7:00 AM',  className: 'Reformer Foundations', instructor: 'Sarah Lim'  },
    { time: '9:00 AM',  className: 'Core Sculpt',          instructor: 'Aina Razak' },
    { time: '5:30 PM',  className: 'Dynamic Flow',         instructor: 'Marcus Tan' },
    { time: '7:00 PM',  className: 'Stretch & Restore',    instructor: 'Priya Nair' },
  ],
  Tuesday: [
    { time: '7:00 AM',  className: 'Dynamic Flow',         instructor: 'Marcus Tan' },
    { time: '9:00 AM',  className: 'Reformer Foundations', instructor: 'Sarah Lim'  },
    { time: '5:30 PM',  className: 'Core Sculpt',          instructor: 'Aina Razak' },
    { time: '7:00 PM',  className: 'Stretch & Restore',    instructor: 'Priya Nair' },
  ],
  Wednesday: [
    { time: '7:00 AM',  className: 'Core Sculpt',          instructor: 'Aina Razak' },
    { time: '9:00 AM',  className: 'Reformer Foundations', instructor: 'Marcus Tan' },
    { time: '11:00 AM', className: 'Stretch & Restore',    instructor: 'Priya Nair' },
    { time: '5:30 PM',  className: 'Dynamic Flow',         instructor: 'Marcus Tan' },
    { time: '7:00 PM',  className: 'Core Sculpt',          instructor: 'Aina Razak' },
  ],
  Thursday: [
    { time: '7:00 AM',  className: 'Stretch & Restore',    instructor: 'Priya Nair' },
    { time: '9:00 AM',  className: 'Dynamic Flow',         instructor: 'Sarah Lim'  },
    { time: '5:30 PM',  className: 'Reformer Foundations', instructor: 'Marcus Tan' },
    { time: '7:00 PM',  className: 'Core Sculpt',          instructor: 'Aina Razak' },
  ],
  Friday: [
    { time: '7:00 AM',  className: 'Dynamic Flow',         instructor: 'Sarah Lim'  },
    { time: '9:00 AM',  className: 'Core Sculpt',          instructor: 'Aina Razak' },
    { time: '5:30 PM',  className: 'Reformer Foundations', instructor: 'Sarah Lim'  },
    { time: '7:00 PM',  className: 'Stretch & Restore',    instructor: 'Priya Nair' },
  ],
  Saturday: [
    { time: '8:00 AM',  className: 'Reformer Foundations', instructor: 'Sarah Lim'  },
    { time: '10:00 AM', className: 'Dynamic Flow',         instructor: 'Marcus Tan' },
    { time: '12:00 PM', className: 'Stretch & Restore',    instructor: 'Priya Nair' },
  ],
  // Sunday — no classes
};

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/* ── STATE ──────────────────────────────────────────────────── */
const state = {
  selectedClass:       null,
  sessionType:         'group',
  selectedDate:        null,
  selectedTime:        null,
  selectedInstructor:  null,
  currentMonth:        new Date().getMonth(),
  currentYear:         new Date().getFullYear(),
  preselectedInstructor: null,
};

/* ── STEP MANAGEMENT ─────────────────────────────────────────
   Steps 1-3 = step1/step2/step3
   Step 4     = stepConfirm  (the Thank You screen)
   ─────────────────────────────────────────────────────────── */
let currentStep = 1;

function goToStep(step) {
  // Hide all steps
  document.querySelectorAll('.booking-step').forEach(s => s.classList.add('hidden'));

  // Show the correct one — step 4 maps to id="stepConfirm"
  const elId = step === 4 ? 'stepConfirm' : 'step' + step;
  const el   = document.getElementById(elId);
  if (el) el.classList.remove('hidden');

  // Update progress indicators
  document.querySelectorAll('.step-indicator').forEach((ind, i) => {
    const n = i + 1;
    ind.classList.remove('active', 'done');
    if      (n < step)  ind.classList.add('done');
    else if (n === step) ind.classList.add('active');
  });

  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── READ URL PARAMS (pre-fill from homepage timetable) ──── */
function readURLParams() {
  const params = new URLSearchParams(window.location.search);
  const cls    = params.get('class');
  const inst   = params.get('instructor');

  if (cls) {
    const card = [...document.querySelectorAll('.class-select-card')]
      .find(c => c.dataset.class === decodeURIComponent(cls));
    if (card) selectClass(card);
  }
  if (inst) {
    state.preselectedInstructor = decodeURIComponent(inst);
  }
}

/* ── STEP 1 — CLASS SELECTION ───────────────────────────── */
function initStep1() {
  const grid     = document.getElementById('classSelectGrid');
  const nextBtn  = document.getElementById('step1Next');
  const tglGroup = document.getElementById('toggleGroup');
  const tglPriv  = document.getElementById('togglePrivate');

  function setSessionType(type) {
    state.sessionType = type;
    tglGroup.classList.toggle('active', type === 'group');
    tglPriv.classList.toggle('active',  type === 'private');

    document.querySelectorAll('.class-select-card').forEach(card => {
      card.classList.toggle('hidden-card', card.dataset.type !== type);
    });

    // Deselect if current selection is wrong type
    const sel = document.querySelector('.class-select-card.selected');
    if (sel && sel.dataset.type !== type) {
      sel.classList.remove('selected');
      state.selectedClass = null;
      nextBtn.disabled = true;
    }
  }

  tglGroup.addEventListener('click', () => setSessionType('group'));
  tglPriv.addEventListener('click',  () => setSessionType('private'));

  grid.addEventListener('click', e => {
    const card = e.target.closest('.class-select-card');
    if (!card || card.classList.contains('hidden-card')) return;
    selectClass(card);
  });

  nextBtn.addEventListener('click', () => {
    if (!state.selectedClass) return;
    goToStep(2);
    buildCalendar();
  });
}

function selectClass(card) {
  document.querySelectorAll('.class-select-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  state.selectedClass = card.dataset.class;

  // Sync toggle to match card type
  const type = card.dataset.type;
  state.sessionType = type;
  document.getElementById('toggleGroup').classList.toggle('active',   type === 'group');
  document.getElementById('togglePrivate').classList.toggle('active', type === 'private');
  document.querySelectorAll('.class-select-card').forEach(c => {
    c.classList.toggle('hidden-card', c.dataset.type !== type);
  });

  document.getElementById('step1Next').disabled = false;
}

/* ── STEP 2 — CALENDAR ───────────────────────────────────── */
function buildCalendar() {
  const { currentMonth, currentYear } = state;
  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];
  document.getElementById('calMonth').textContent = monthNames[currentMonth] + ' ' + currentYear;

  const daysContainer = document.getElementById('calDays');
  daysContainer.innerHTML = '';

  const firstDay    = new Date(currentYear, currentMonth, 1).getDay(); // 0=Sun
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Mon-based grid
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today       = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day cal-day--empty';
    daysContainer.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date      = new Date(currentYear, currentMonth, d);
    const dayOfWeek = date.getDay();
    const dayName   = DAY_NAMES[dayOfWeek];
    const isToday   = date.getTime() === today.getTime();
    const isPast    = date < today;
    const isSunday  = dayOfWeek === 0;

    // A day is available if it has slots for the selected class
    const slots     = (SCHEDULE[dayName] || []).filter(s => matchesClass(s));
    const available = !isPast && !isSunday && slots.length > 0;

    const el = document.createElement('div');
    el.textContent = d;
    el.className   = 'cal-day';

    if (!available) {
      el.classList.add('cal-day--disabled');
      if (isSunday) el.classList.add('cal-day--sunday');
    } else {
      el.classList.add('cal-day--available');
      if (isToday) el.classList.add('cal-day--today');

      if (state.selectedDate) {
        const sel = new Date(state.selectedDate);
        if (
          sel.getFullYear() === currentYear &&
          sel.getMonth()    === currentMonth &&
          sel.getDate()     === d
        ) {
          el.classList.add('cal-day--selected');
        }
      }
      el.addEventListener('click', () => selectDate(date));
    }

    daysContainer.appendChild(el);
  }
}

// Returns true if a timetable slot matches the currently selected class
function matchesClass(slot) {
  if (state.selectedClass === 'Private Session' || state.selectedClass === 'Duo Session') return true;
  return slot.className === state.selectedClass;
}

function selectDate(date) {
  state.selectedDate = date;
  state.selectedTime = null;
  state.selectedInstructor = null;
  document.getElementById('step2Next').disabled = true;
  buildCalendar();
  showTimeslots(date);
}

function showTimeslots(date) {
  const dayName  = DAY_NAMES[date.getDay()];
  const slots    = (SCHEDULE[dayName] || []).filter(s => matchesClass(s));
  const list     = document.getElementById('timeslotList');
  const instrWrap = document.getElementById('instructorSelect');

  list.innerHTML = '';
  instrWrap.style.display = 'none';

  if (slots.length === 0) {
    list.innerHTML = '<p class="timeslot-placeholder">No classes on this day for the selected class.</p>';
    return;
  }

  slots.forEach(slot => {
    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'timeslot-btn';
    btn.innerHTML = `
      <div>
        <div class="timeslot-btn__time">${slot.time}</div>
        <div class="timeslot-btn__class">${slot.className} &mdash; ${slot.instructor}</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    `;
    btn.addEventListener('click', () => selectTimeslot(btn, slot));
    list.appendChild(btn);
  });
}

function selectTimeslot(btn, slot) {
  document.querySelectorAll('.timeslot-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  state.selectedTime       = slot.time;
  state.selectedInstructor = slot.instructor;

  // Show instructor field (pre-filled, read-only — one instructor per slot in this timetable)
  const instrWrap = document.getElementById('instructorSelect');
  const dropdown  = document.getElementById('instructorDropdown');
  dropdown.innerHTML = '';
  const opt = document.createElement('option');
  opt.value       = slot.instructor;
  opt.textContent = slot.instructor;
  dropdown.appendChild(opt);
  dropdown.value = slot.instructor;
  instrWrap.style.display = 'block';

  document.getElementById('step2Next').disabled = false;
}

function initStep2() {
  document.getElementById('calPrev').addEventListener('click', () => {
    state.currentMonth--;
    if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
    buildCalendar();
  });
  document.getElementById('calNext').addEventListener('click', () => {
    state.currentMonth++;
    if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
    buildCalendar();
  });

  document.getElementById('step2Back').addEventListener('click', () => goToStep(1));
  document.getElementById('step2Next').addEventListener('click', () => {
    if (!state.selectedDate || !state.selectedTime) return;
    state.selectedInstructor = document.getElementById('instructorDropdown').value;
    goToStep(3);
    renderSummaryBar();
  });
}

/* ── STEP 3 — DETAILS FORM ───────────────────────────────── */
function renderSummaryBar() {
  const bar     = document.getElementById('bookingSummaryBar');
  const dateStr = state.selectedDate
    ? state.selectedDate.toLocaleDateString('en-MY', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      })
    : '—';

  bar.innerHTML = `
    <div class="booking-summary-bar__item">
      <div class="booking-summary-bar__label">Class</div>
      <div class="booking-summary-bar__value">${state.selectedClass || '—'}</div>
    </div>
    <div class="booking-summary-bar__item">
      <div class="booking-summary-bar__label">Date</div>
      <div class="booking-summary-bar__value">${dateStr}</div>
    </div>
    <div class="booking-summary-bar__item">
      <div class="booking-summary-bar__label">Time</div>
      <div class="booking-summary-bar__value">${state.selectedTime || '—'}</div>
    </div>
    <div class="booking-summary-bar__item">
      <div class="booking-summary-bar__label">Instructor</div>
      <div class="booking-summary-bar__value">${state.selectedInstructor || '—'}</div>
    </div>
  `;
}

function initStep3() {
  document.getElementById('step3Back').addEventListener('click', () => goToStep(2));
  document.getElementById('bookingForm').addEventListener('submit', handleSubmit);
}

function validateForm() {
  let valid = true;
  const name   = document.getElementById('fullName');
  const email  = document.getElementById('email');
  const phone  = document.getElementById('phone');
  const policy = document.getElementById('policyCheck');

  ['nameError','emailError','phoneError','policyError'].forEach(id => {
    document.getElementById(id).textContent = '';
  });
  [name, email, phone].forEach(f => f.classList.remove('error'));

  if (!name.value.trim()) {
    document.getElementById('nameError').textContent = 'Please enter your full name.';
    name.classList.add('error'); valid = false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    document.getElementById('emailError').textContent = 'Please enter a valid email address.';
    email.classList.add('error'); valid = false;
  }
  if (!phone.value.trim()) {
    document.getElementById('phoneError').textContent = 'Please enter your phone number.';
    phone.classList.add('error'); valid = false;
  }
  if (!policy.checked) {
    document.getElementById('policyError').textContent = 'You must agree to the cancellation policy.';
    valid = false;
  }
  return valid;
}

async function handleSubmit(e) {
  e.preventDefault();
  if (!validateForm()) return;

  const submitBtn  = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitBtnText');
  const spinner    = document.getElementById('submitSpinner');
  const errBanner  = document.getElementById('formErrorBanner');

  submitText.classList.add('hidden');
  spinner.classList.remove('hidden');
  submitBtn.disabled = true;
  errBanner.classList.add('hidden');

  // Format date consistently: "Saturday, 30 May 2026"
  const dateFormatted = state.selectedDate
    ? state.selectedDate.toLocaleDateString('en-MY', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  const payload = {
    fullName:    document.getElementById('fullName').value.trim(),
    email:       document.getElementById('email').value.trim(),
    phone:       document.getElementById('phone').value.trim(),
    notes:       document.getElementById('notes').value.trim(),
    className:   state.selectedClass,
    sessionType: state.sessionType,
    date:        dateFormatted,
    time:        state.selectedTime,
    instructor:  state.selectedInstructor,
  };

  try {
    const res  = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body:   JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.status === 'success') {
      showConfirmation(payload, data.bookingId, false);
    } else {
      throw new Error(data.message || 'Server error');
    }
  } catch (err) {
    // Demo fallback — show confirmation with a local mock ID
    const mockId = 'MF-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.floor(1000 + Math.random() * 9000);
    showConfirmation(payload, mockId, true);
  } finally {
    submitText.classList.remove('hidden');
    spinner.classList.add('hidden');
    submitBtn.disabled = false;
  }
}

/* ── STEP 4 — CONFIRMATION ───────────────────────────────── */
function showConfirmation(payload, bookingId, isDemoMode) {
  goToStep(4);

  // Personalised greeting
  const firstName = payload.fullName ? payload.fullName.split(' ')[0] : 'there';
  const greet = document.getElementById('confirmGreeting');
  if (greet) greet.textContent = "You're all set, " + firstName + ".";

  // Fill booking summary rows
  const summary = document.getElementById('confirmationSummary');
  const rows = [
    { key: 'Booking ID', val: '<strong class="confirm-booking-id">' + bookingId + '</strong>' },
    { key: 'Class',      val: payload.className   },
    { key: 'Date',       val: payload.date        },
    { key: 'Time',       val: payload.time        },
    { key: 'Instructor', val: payload.instructor  },
    { key: 'Name',       val: payload.fullName    },
    { key: 'Email',      val: payload.email       },
  ];
  summary.innerHTML = rows.map(r => `
    <div class="confirm-details-row">
      <span class="confirm-details-key">${r.key}</span>
      <span class="confirm-details-val">${r.val}</span>
    </div>
  `).join('');

  if (isDemoMode) {
    const note = document.getElementById('confirmDemoNote');
    if (note) note.classList.remove('hidden');
  }

  // GSAP animation
  if (typeof gsap !== 'undefined') {
    gsap.set('.confirmation__circle-stroke', { strokeDashoffset: 283 });
    gsap.set('.confirmation__check',         { strokeDashoffset: 60  });

    const tl = gsap.timeline();
    tl.to('.confirmation__circle-stroke', { strokeDashoffset: 0, duration: 0.75, ease: 'power2.out', delay: 0.15 })
      .to('.confirmation__check',         { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out' }, '-=0.15')
      .from('#stepConfirm .confirm-card', { y: 24, opacity: 0,  duration: 0.5,  ease: 'power2.out' }, '-=0.2')
      .from('#stepConfirm .confirm-details-row',  { x: -12, opacity: 0, duration: 0.35, stagger: 0.07, ease: 'power2.out' }, '-=0.25')
      .from('#stepConfirm .confirm-social-wrap',  { y: 16,  opacity: 0, duration: 0.45, ease: 'power2.out' }, '-=0.1')
      .from('#stepConfirm .confirm-actions',      { y: 12,  opacity: 0, duration: 0.4,  ease: 'power2.out' }, '-=0.2');
  }
}

/* ── INIT ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initStep1();
  initStep2();
  initStep3();
  readURLParams();
  goToStep(1);
});
