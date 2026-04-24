// app.js — Local Outings calendar

const state = {
  view: 'month',          // 'month' | 'week'
  anchor: new Date(),     // date within current period
  events: [],
  cities: [],
  categories: [],
  activeCities: new Set(),
  activeCats: new Set(),
};

const el = (sel) => document.querySelector(sel);
const els = (sel) => Array.from(document.querySelectorAll(sel));

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function iso(d) { return d.toISOString().slice(0,10); }

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d)   { return new Date(d.getFullYear(), d.getMonth()+1, 0); }
function startOfWeek(d)  { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0,0,0,0); return x; }
function endOfWeek(d)    { const s = startOfWeek(d); return new Date(s.getFullYear(), s.getMonth(), s.getDate()+6); }
function addDays(d, n)   { const x = new Date(d); x.setDate(x.getDate()+n); return x; }

function visibleRange() {
  if (state.view === 'month') {
    // Show full weeks around the month
    const s = startOfWeek(startOfMonth(state.anchor));
    const e = endOfWeek(endOfMonth(state.anchor));
    return { from: iso(s), to: iso(e) };
  } else {
    return { from: iso(startOfWeek(state.anchor)), to: iso(endOfWeek(state.anchor)) };
  }
}

// Category name -> CSS class
function catClass(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('play') || c.includes('musical') || c.includes('theat')) return 'cat-plays';
  if (c.includes('concert') || c.includes('entertain') || c.includes('music')) return 'cat-concerts';
  if (c.includes('baseball') || c.includes('sport')) return 'cat-sports';
  if (c.includes('festival') || c.includes('fair')) return 'cat-festivals';
  if (c.includes('kid') || c.includes('family')) return 'cat-kids';
  if (c.includes('museum') || c.includes('exhibit')) return 'cat-museums';
  return '';
}
function catColorVar(cat) {
  const cls = catClass(cat);
  if (cls === 'cat-plays')     return 'var(--cat-plays)';
  if (cls === 'cat-concerts')  return 'var(--cat-concerts)';
  if (cls === 'cat-sports')    return 'var(--cat-sports)';
  if (cls === 'cat-festivals') return 'var(--cat-festivals)';
  if (cls === 'cat-kids')      return 'var(--cat-kids)';
  if (cls === 'cat-museums')   return 'var(--cat-museums)';
  return 'var(--cat-default)';
}

async function load() {
  const { from, to } = visibleRange();
  // Pull a generous window so we don't refetch on every nav
  const fetchFrom = iso(addDays(new Date(from), -14));
  const fetchTo   = iso(addDays(new Date(to), 45));
  el('#status').textContent = 'loading events…';
  try {
    const r = await fetch(`/api/events?from=${fetchFrom}&to=${fetchTo}`);
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    state.events = data.events;

    const cfg = await (await fetch('/api/config')).json();
    // Show chips for configured cities + categories (not just what we have events for)
    state.cities = Array.from(new Set([...(cfg.cities || []).map(c => typeof c === 'string' ? c : c.name), ...data.cities]));
    state.categories = Array.from(new Set([...(cfg.categories || []), ...data.categories]));

    if (state.activeCities.size === 0) state.cities.forEach(c => state.activeCities.add(c));
    if (state.activeCats.size === 0) state.categories.forEach(c => state.activeCats.add(c));

    const st = await (await fetch('/api/status')).json();
    const last = st.last_refresh?.ended_at;
    el('#status').textContent = last
      ? `last updated ${new Date(last).toLocaleString()}`
      : 'never refreshed — configure vLLM, SearXNG, cities, and categories, then run Refresh Now';

    renderChips();
    renderCalendar();
  } catch (err) {
    el('#status').textContent = 'error: ' + err.message;
  }
}

function renderChips() {
  const cityWrap = el('#city-chips');
  cityWrap.innerHTML = '';
  state.cities.forEach(c => {
    const b = document.createElement('button');
    b.className = 'chip' + (state.activeCities.has(c) ? ' active' : '');
    b.textContent = c;
    b.onclick = () => { toggle(state.activeCities, c); b.classList.toggle('active'); renderCalendar(); };
    cityWrap.appendChild(b);
  });

  const catWrap = el('#cat-chips');
  catWrap.innerHTML = '';
  state.categories.forEach(c => {
    const b = document.createElement('button');
    b.className = 'chip cat' + (state.activeCats.has(c) ? ' active' : '');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = catColorVar(c);
    b.appendChild(dot);
    b.appendChild(document.createTextNode(c));
    b.onclick = () => { toggle(state.activeCats, c); b.classList.toggle('active'); renderCalendar(); };
    catWrap.appendChild(b);
  });
}

function toggle(set, v) { if (set.has(v)) set.delete(v); else set.add(v); }

function filteredEvents() {
  return state.events.filter(e =>
    state.activeCities.has(e.city) && state.activeCats.has(e.category)
  );
}

function renderPeriodLabel() {
  if (state.view === 'month') {
    el('#period-label').textContent = `${MONTHS[state.anchor.getMonth()]} ${state.anchor.getFullYear()}`;
  } else {
    const s = startOfWeek(state.anchor);
    const e = endOfWeek(state.anchor);
    const sameMonth = s.getMonth() === e.getMonth();
    el('#period-label').textContent = sameMonth
      ? `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}`
      : `${MONTHS[s.getMonth()].slice(0,3)} ${s.getDate()} – ${MONTHS[e.getMonth()].slice(0,3)} ${e.getDate()}`;
  }
}

function eventsOnDay(iso) {
  return filteredEvents().filter(e => e.start_date === iso);
}

function renderCalendar() {
  renderPeriodLabel();
  const cal = el('#calendar');
  cal.className = state.view === 'month' ? 'month-view' : 'week-view';
  cal.innerHTML = '';

  // Day-of-week header
  const dowRow = document.createElement('div');
  dowRow.className = 'dow-row';
  DOW.forEach(d => { const c = document.createElement('div'); c.textContent = d; dowRow.appendChild(c); });
  cal.appendChild(dowRow);

  const grid = document.createElement('div');
  grid.className = 'grid';

  const todayIso = iso(new Date());

  let start, end;
  if (state.view === 'month') {
    start = startOfWeek(startOfMonth(state.anchor));
    end = endOfWeek(endOfMonth(state.anchor));
  } else {
    start = startOfWeek(state.anchor);
    end = endOfWeek(state.anchor);
  }

  let totalCount = 0;
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    if (iso(d) === todayIso) cell.classList.add('today');
    if (state.view === 'month' && d.getMonth() !== state.anchor.getMonth()) cell.classList.add('other-month');

    const num = document.createElement('span');
    num.className = 'date-num';
    num.textContent = d.getDate();
    cell.appendChild(num);

    const dayEvents = eventsOnDay(iso(d));
    totalCount += dayEvents.length;
    const maxShown = state.view === 'month' ? 3 : 12;
    dayEvents.slice(0, maxShown).forEach(ev => cell.appendChild(renderEventPill(ev)));
    if (dayEvents.length > maxShown) {
      const more = document.createElement('span');
      more.className = 'event';
      more.style.setProperty('--bg', 'var(--ink-soft)');
      more.textContent = `+${dayEvents.length - maxShown} more`;
      more.onclick = () => showDayList(iso(d), dayEvents);
      cell.appendChild(more);
    }

    grid.appendChild(cell);
  }

  cal.appendChild(grid);
  el('#count').textContent = `${totalCount} event${totalCount === 1 ? '' : 's'} shown`;
}

function renderEventPill(ev) {
  const b = document.createElement('button');
  b.className = 'event ' + catClass(ev.category);
  const time = ev.start_time ? `<span class="t">${ev.start_time}</span>` : '';
  b.innerHTML = `${time}${escapeHtml(ev.title)}`;
  b.onclick = () => showEvent(ev);
  return b;
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
}

function showEvent(ev) {
  el('#ed-header').textContent = ev.title;
  const rows = [
    ['When', (ev.start_date || '') + (ev.start_time ? ' · ' + ev.start_time : '')],
    ['Where', [ev.venue, ev.address].filter(Boolean).join(' — ')],
    ['City', ev.city],
    ['Type', ev.category],
    ['Price', ev.price || ''],
    ['About', ev.description || ''],
  ].filter(([,v]) => v);
  el('#ed-body').innerHTML = rows.map(([k,v]) =>
    `<div class="row"><span class="k">${k}</span><span>${escapeHtml(v)}</span></div>`
  ).join('');
  const link = el('#ed-link');
  if (ev.url) { link.href = ev.url; link.style.display = ''; }
  else        { link.style.display = 'none'; }
  el('#event-dialog').showModal();
}

function showDayList(dayIso, dayEvents) {
  el('#ed-header').textContent = new Date(dayIso + 'T12:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  el('#ed-body').innerHTML = dayEvents.map(ev =>
    `<div class="row"><span class="k">${ev.start_time || '—'}</span>
      <span><strong>${escapeHtml(ev.title)}</strong><br>
        <small style="color:var(--ink-soft)">${escapeHtml(ev.city)} · ${escapeHtml(ev.category)}${ev.venue ? ' · ' + escapeHtml(ev.venue) : ''}</small>
      </span></div>`
  ).join('');
  el('#ed-link').style.display = 'none';
  el('#event-dialog').showModal();
}

// ---- controls ----
els('.view-toggle button').forEach(b => {
  b.addEventListener('click', () => {
    els('.view-toggle button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    state.view = b.dataset.view;
    load();
  });
});
el('#prev').onclick = () => { shift(-1); };
el('#next').onclick = () => { shift(1); };
el('#today').onclick = () => { state.anchor = new Date(); load(); };

function shift(dir) {
  if (state.view === 'month') {
    state.anchor = new Date(state.anchor.getFullYear(), state.anchor.getMonth() + dir, 1);
  } else {
    state.anchor = addDays(state.anchor, 7 * dir);
  }
  load();
}

load();
