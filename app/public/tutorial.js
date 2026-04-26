// tutorial.js — standalone tutorial view for /tutorial.html
// Renders the same tutorial content as index.html's right pane, but full-width,
// and syncs step-changes to/from the docked view via BroadcastChannel.

(function () {
  const params       = new URLSearchParams(location.search);
  const autoUser     = params.get('user');
  const autoCourse   = params.get('course') || params.get('lab');
  const initialStep  = Math.max(0, parseInt(params.get('step') || '0', 10) || 0);

  let currentMeta = null, currentCourse = null, currentExerciseIdx = 0;
  let taskHeadings = [];
  let syncChannel = null, suppressBroadcast = false;

  // ── Lab text-size preference ───────────────────────────────────────────────
  const LAB_FONT_MIN = 10, LAB_FONT_MAX = 26;
  let labFontSize = Math.min(LAB_FONT_MAX, Math.max(LAB_FONT_MIN,
    parseInt(localStorage.getItem('labFontSize') || '16', 10)));

  function applyLabFontSize() {
    const el = document.getElementById('pane-right');
    if (el) el.style.fontSize = labFontSize + 'px';
  }

  document.getElementById('btn-font-up').addEventListener('click', () => {
    if (labFontSize < LAB_FONT_MAX) { labFontSize++; localStorage.setItem('labFontSize', labFontSize); applyLabFontSize(); }
  });
  document.getElementById('btn-font-down').addEventListener('click', () => {
    if (labFontSize > LAB_FONT_MIN) { labFontSize--; localStorage.setItem('labFontSize', labFontSize); applyLabFontSize(); }
  });

  applyLabFontSize();

  marked.setOptions({ breaks: true, gfm: true });

  // ── Load / render ────────────────────────────────────────────────────────
  async function selectCourse(course) {
    currentCourse = course;
    currentMeta = await fetch(`/api/courses/${course}/meta`).then(r => r.json());
    const titleEl = document.getElementById('course-title');
    if (titleEl) titleEl.textContent = currentMeta.title;
    populateExerciseSelect();
    const startIdx = Math.min(initialStep, (currentMeta.steps || []).length - 1);
    await renderStep(Math.max(0, startIdx));
    openSyncChannel();
  }

  function populateExerciseSelect() {
    const sel = document.getElementById('exercise-select');
    sel.innerHTML = '';
    (currentMeta.steps || []).forEach((step, i) => {
      const o = document.createElement('option');
      o.value = i;
      o.textContent = step.title;
      sel.appendChild(o);
    });
    sel.disabled = false;
    sel.value = currentExerciseIdx;
  }

  async function renderStep(idx) {
    if (!currentMeta) return;
    currentExerciseIdx = idx;
    const step = currentMeta.steps[idx];
    if (!step) return;

    const sel = document.getElementById('exercise-select');
    if (sel) sel.value = idx;

    document.getElementById('tutorial-title').textContent = `${currentMeta.title} — ${step.title}`;
    const content = document.getElementById('tutorial-content');
    content.innerHTML = '<div class="placeholder">Loading\u2026</div>';
    taskHeadings = [];
    try {
      const md = await fetch(`/api/courses/${currentCourse}/step/${idx}?_=${Date.now()}`, { cache: 'no-store' }).then(r => r.text());
      content.innerHTML = marked.parse(md);
      postRender(content);
      content.scrollTop = 0;
    } catch (e) {
      content.innerHTML = `<div class="placeholder">Error: ${e.message}</div>`;
    }
    updateStepCounter();
    syncUrl(idx);
    broadcastStep(idx);
  }

  function syncUrl(idx) {
    try {
      const u = new URL(location.href);
      u.searchParams.set('step', String(idx));
      history.replaceState(null, '', u.toString());
    } catch (e) {}
  }

  // ── Post-render (same behaviour as app.js) ───────────────────────────────
  function postRender(el) {
    el.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
    el.querySelectorAll('blockquote').forEach(bq => {
      const m = bq.textContent.trim().match(/^\[!(NOTE|TIP|WARNING|IMPORTANT)\]/i);
      if (!m) return;
      const t = m[1].toLowerCase();
      const cls = (t === 'warning' || t === 'important') ? 'warn' : t;
      const inner = bq.innerHTML.replace(/\[!(NOTE|TIP|WARNING|IMPORTANT)\]/i, '').trim();
      const div = document.createElement('div');
      div.className = `callout callout-${cls}`;
      div.innerHTML = `<div class="callout-label">${{note:'📝 Note',tip:'💡 Tip',warn:'⚠️ Warning'}[cls]||t}</div>${inner}`;
      bq.replaceWith(div);
    });
    wrapTaskSections(el);
    addCheckboxes(el);
    restoreChecks(el, currentCourse, currentExerciseIdx);
    addCopyOnClick(el);
    setupTaskTracking(el);
  }

  function wrapTaskSections(container) {
    const headings = [...container.querySelectorAll('h2')];
    if (!headings.length) return;
    headings.forEach((heading, idx) => {
      const section = document.createElement('div');
      section.className = 'task-section';
      section.dataset.taskIdx = idx;
      const body = document.createElement('div');
      body.className = 'task-body';
      const icon = document.createElement('span');
      icon.className = 'task-icon';
      heading.prepend(icon);
      heading.classList.add('task-heading');
      heading.parentNode.insertBefore(section, heading);
      section.appendChild(heading);
      section.appendChild(body);
      const nextHeading = headings[idx + 1];
      while (section.nextSibling) {
        const sib = section.nextSibling;
        if (sib === nextHeading) break;
        body.appendChild(sib);
      }
      idx === 0 ? expandSection(section, false) : collapseSection(section, false);
      heading.addEventListener('click', () => toggleSection(section, container));
    });
  }

  function expandSection(section, animate) {
    const body = section.querySelector('.task-body');
    const icon = section.querySelector('.task-icon');
    section.classList.add('expanded');
    section.classList.remove('collapsed');
    icon.textContent = '\u25be ';
    if (animate) {
      body.style.maxHeight = body.scrollHeight + 'px';
      body.addEventListener('transitionend', () => { body.style.maxHeight = 'none'; }, { once: true });
    } else {
      body.style.maxHeight = 'none';
    }
  }

  function collapseSection(section, animate) {
    const body = section.querySelector('.task-body');
    const icon = section.querySelector('.task-icon');
    if (animate) {
      body.style.maxHeight = body.scrollHeight + 'px';
      requestAnimationFrame(() => requestAnimationFrame(() => { body.style.maxHeight = '0'; }));
    } else {
      body.style.maxHeight = '0';
    }
    body.addEventListener('transitionend', () => {
      section.classList.remove('expanded');
      section.classList.add('collapsed');
      icon.textContent = '\u25b8 ';
    }, { once: true });
    if (!animate) {
      section.classList.remove('expanded');
      section.classList.add('collapsed');
      icon.textContent = '\u25b8 ';
    }
  }

  function toggleSection(section, container) {
    if (section.classList.contains('expanded')) {
      collapseSection(section, true);
    } else {
      expandSection(section, true);
      setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }

  // ── Checkbox state — persist + sync ────────────────────────────────────
  function checksKey(course, idx) { return `lab-checks-${course}-${idx}`; }

  function saveChecks(container, course, stepIdx) {
    const checks = [...container.querySelectorAll('li')].map(li => li.classList.contains('checked'));
    localStorage.setItem(checksKey(course, stepIdx), JSON.stringify(checks));
    broadcastChecks(checks, stepIdx);
  }

  function applyCheckState(container, checks) {
    [...container.querySelectorAll('li')].forEach((li, i) => {
      const cb = li.querySelector('.task-check');
      if (!cb) return;
      const on = !!checks[i];
      cb.checked = on;
      li.classList.toggle('checked', on);
    });
    container.querySelectorAll('.task-section').forEach(sec => {
      const lis = [...sec.querySelectorAll('li')];
      sec.querySelector('.task-heading')
         .classList.toggle('task-complete', lis.length > 0 && lis.every(l => l.classList.contains('checked')));
    });
  }

  function restoreChecks(container, course, stepIdx) {
    const raw = localStorage.getItem(checksKey(course, stepIdx));
    if (!raw) return;
    try { applyCheckState(container, JSON.parse(raw)); } catch(e) {}
  }

  function broadcastChecks(checks, stepIdx) {
    if (!syncChannel || suppressBroadcast) return;
    try { syncChannel.postMessage({ type: 'checks', stepIdx, checks }); } catch(e) {}
  }

  function addCheckboxes(container) {
    container.querySelectorAll('li').forEach(li => {
      if (li.querySelector('.task-check')) return;
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.className = 'task-check';
      const txt = document.createElement('span');
      txt.className = 'li-text';
      while (li.firstChild) txt.appendChild(li.firstChild);
      li.appendChild(cb);
      if (li.parentElement && li.parentElement.tagName === 'OL') {
        const n = document.createElement('span'); n.className = 'li-num';
        n.textContent = `${[...li.parentElement.children].indexOf(li)+1}.`;
        li.appendChild(n);
      } else {
        const b = document.createElement('span'); b.className = 'li-bullet'; b.textContent = '\u2022'; li.appendChild(b);
      }
      li.appendChild(txt);
      cb.addEventListener('change', () => handleCheck(cb, li, container));
    });
  }

  function handleCheck(cb, li, container) {
    li.classList.toggle('checked', cb.checked);
    saveChecks(container, currentCourse, currentExerciseIdx);
    if (!cb.checked) {
      const sec = li.closest('.task-section');
      if (sec) sec.querySelector('.task-heading').classList.remove('task-complete');
      return;
    }
    const cr = container.getBoundingClientRect();
    const lr = li.getBoundingClientRect();
    if ((lr.bottom - cr.top) > cr.height * 0.70) {
      container.scrollTo({ top: container.scrollTop + (lr.top - cr.top) - 20, behavior: 'smooth' });
    }
    checkTaskCompletion(li, container);
  }

  function checkTaskCompletion(li, container) {
    const section = li.closest('.task-section');
    if (!section) return;
    const allLis = [...section.querySelectorAll('li')];
    if (!allLis.length || !allLis.every(l => l.classList.contains('checked'))) return;
    section.querySelector('.task-heading').classList.add('task-complete');
    setTimeout(() => {
      collapseSection(section, true);
      const sections = [...container.querySelectorAll('.task-section')];
      const next = sections[sections.indexOf(section) + 1];
      if (next) {
        setTimeout(() => {
          expandSection(next, true);
          setTimeout(() => next.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        }, 350);
      }
    }, 600);
  }

  function setupTaskTracking(container) {
    taskHeadings = [...container.querySelectorAll('.task-heading')];
  }

  function updateStepCounter() {
    const prev = document.getElementById('btn-prev');
    const next = document.getElementById('btn-next');
    if (!currentMeta) { prev.disabled = true; next.disabled = true; return; }
    prev.disabled = currentExerciseIdx === 0;
    next.disabled = currentExerciseIdx === currentMeta.steps.length - 1;
  }

  function addCopyOnClick(container) {
    container.querySelectorAll('code').forEach(code => {
      if (code.closest('pre')) return;
      code.classList.add('copyable');
      code.title = 'Click to copy';
      code.addEventListener('click', () => {
        navigator.clipboard.writeText(code.textContent.trim()).then(() => {
          code.classList.add('copied');
          setTimeout(() => code.classList.remove('copied'), 1200);
        }).catch(() => {
          const r = document.createRange(); r.selectNodeContents(code);
          const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        });
      });
    });
  }

  // ── Navigation ───────────────────────────────────────────────────────────
  document.getElementById('exercise-select').addEventListener('change', e => {
    renderStep(parseInt(e.target.value, 10));
  });
  document.getElementById('btn-prev').addEventListener('click', () => {
    if (currentExerciseIdx > 0) renderStep(currentExerciseIdx - 1);
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    if (currentMeta && currentExerciseIdx < currentMeta.steps.length - 1) renderStep(currentExerciseIdx + 1);
  });

  // ── Refresh: re-fetch current step (instructor edited it) ──
  document.getElementById('btn-refresh').addEventListener('click', async (e) => {
    if (!currentMeta) return;
    const btn = e.currentTarget;
    const orig = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '⧗';
    try { await renderStep(currentExerciseIdx); }
    finally { btn.disabled = false; btn.innerHTML = orig; }
  });

  // ── Download current step as .md ─────────────────────────────────────────
  document.getElementById('btn-download').addEventListener('click', async () => {
    if (!currentMeta) return;
    const step = currentMeta.steps[currentExerciseIdx];
    if (!step) return;
    try {
      const r = await fetch(`/api/courses/${currentCourse}/step/${currentExerciseIdx}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const md = await r.text();
      const rawName = step.file || `${currentCourse}-step-${currentExerciseIdx + 1}.md`;
      const safe = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const finalName = safe.toLowerCase().endsWith('.md') ? safe : `${safe}.md`;
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) {
      console.error('Download failed:', e);
    }
  });

  // ── Cross-tab sync ───────────────────────────────────────────────────────
  function syncKey() {
    return (autoUser && autoCourse) ? `lab-sync-${autoUser}-${autoCourse}` : null;
  }

  function openSyncChannel() {
    const key = syncKey();
    if (!key || syncChannel || typeof BroadcastChannel === 'undefined') return;
    try {
      syncChannel = new BroadcastChannel(key);
      syncChannel.addEventListener('message', (ev) => {
        const msg = ev.data;
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'step' && typeof msg.index === 'number' && msg.index !== currentExerciseIdx) {
          suppressBroadcast = true;
          renderStep(msg.index).finally(() => { suppressBroadcast = false; });
        }
        if (msg.type === 'checks' && typeof msg.stepIdx === 'number' && msg.stepIdx === currentExerciseIdx) {
          suppressBroadcast = true;
          applyCheckState(document.getElementById('tutorial-content'), msg.checks);
          suppressBroadcast = false;
        }
      });
    } catch (e) { console.warn('BroadcastChannel failed:', e); }
  }

  function broadcastStep(idx) {
    if (!syncChannel || suppressBroadcast) return;
    try { syncChannel.postMessage({ type: 'step', index: idx }); } catch (e) {}
  }

  // ── Bootstrap ────────────────────────────────────────────────────────────
  async function load() {
    if (!autoCourse) {
      document.getElementById('tutorial-content').innerHTML =
        '<div class="placeholder">No course specified in URL.<br>Add <code>?course=ADM103&amp;user=TRAIN-01</code> to load a course.</div>';
      document.getElementById('exercise-select').innerHTML = '<option value="">— No course —</option>';
      return;
    }
    try {
      await selectCourse(autoCourse);
    } catch (e) {
      console.error(e);
      document.getElementById('tutorial-content').innerHTML =
        `<div class="placeholder">Failed to load course: ${e.message}</div>`;
    }
  }
  load();
})();
