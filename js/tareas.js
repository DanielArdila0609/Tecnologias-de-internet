/* =========================================================
   StudyFlow — Mis Tareas
   Lista de pendientes/completadas, filtros, subtareas y el
   modal para crear y editar tareas.
   ========================================================= */

(() => {
  'use strict';

  const SF = window.SF;
  const UI = window.SFUI;
  const { icon } = window.SFIcons;
  const { esc } = SF;

  const fold = (text) => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const state = { tab: 'pending', q: '', subject: '', priority: '', sort: 'due' };
  const expanded = new Set();
  let editingId = null;

  const $ = (id) => document.getElementById(id);

  SF.onReady(() => {
    if (!SF.currentUser()) return;
    init();
  });

  /* ---------- Inicio ---------- */
  function init() {
    $('searchIcon').innerHTML = icon('search');
    $('filterIcon').innerHTML = icon('filter');
    $('taskModalClose').innerHTML = icon('close');
    UI.enhanceDialog($('taskModal'));

    const params = new URLSearchParams(window.location.search);
    if (params.get('q')) { state.q = params.get('q'); $('taskSearch').value = state.q; }
    if (params.get('materia')) { state.subject = params.get('materia'); setFiltersOpen(true); }

    bindEvents();
    render();
    document.addEventListener('sf:change', render);

    if (params.get('nueva') === '1') {
      openModal(null, params.get('fecha') || '');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }

  function bindEvents() {
    $('newTaskBtn').addEventListener('click', () => openModal());

    $('taskSearchForm').addEventListener('submit', (event) => event.preventDefault());
    $('taskSearch').addEventListener('input', (event) => { state.q = event.target.value; render(); });

    $('filtersBtn').addEventListener('click', () => setFiltersOpen($('filtersPanel').hidden));
    $('filterSubject').addEventListener('change', (event) => { state.subject = event.target.value; render(); });
    $('filterPriority').addEventListener('change', (event) => { state.priority = event.target.value; render(); });
    $('filterSort').addEventListener('change', (event) => { state.sort = event.target.value; render(); });
    $('clearFilters').addEventListener('click', () => {
      Object.assign(state, { q: '', subject: '', priority: '', sort: 'due' });
      $('taskSearch').value = '';
      render();
    });

    const tabs = [$('tabPending'), $('tabDone')];
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => setTab(index === 0 ? 'pending' : 'done'));
      tab.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        const next = tabs[(index + 1) % 2];
        setTab(next === tabs[0] ? 'pending' : 'done');
        next.focus();
      });
    });

    const cards = $('taskCards');
    cards.addEventListener('change', onCardChange);
    cards.addEventListener('click', onCardClick);
    cards.addEventListener('submit', onCardSubmit);

    $('taskForm').addEventListener('submit', onTaskSubmit);
  }

  function setFiltersOpen(open) {
    $('filtersPanel').hidden = !open;
    $('filtersBtn').setAttribute('aria-expanded', String(open));
  }

  function setTab(tab) {
    state.tab = tab;
    render();
  }

  /* ---------- Datos visibles ---------- */
  function visibleTasks() {
    const query = fold(state.q.trim());
    let list = SF.tasks().filter((t) => (state.tab === 'done' ? t.done : !t.done));

    if (state.subject) list = list.filter((t) => t.subjectId === state.subject);
    if (state.priority) list = list.filter((t) => t.priority === state.priority);
    if (query) {
      list = list.filter((t) => {
        const subject = SF.subjectById(t.subjectId);
        return fold(`${t.title} ${t.notes} ${(t.tags || []).join(' ')} ${subject ? subject.name : ''}`).includes(query);
      });
    }

    if (state.tab === 'done' && state.sort === 'due') {
      return list.sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));
    }
    if (state.sort === 'priority') {
      return list.sort((a, b) => SF.PRIORITY[b.priority].weight - SF.PRIORITY[a.priority].weight || SF.byDue(a, b));
    }
    if (state.sort === 'newest') return list.sort((a, b) => b.createdAt - a.createdAt);
    return list.sort(SF.byDue);
  }

  const filtersActive = () => Boolean(state.q.trim() || state.subject || state.priority);

  /* ---------- Render ---------- */
  function render() {
    const focusKey = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.fk : null;

    renderStats();
    renderTabs();
    renderFilterOptions();
    renderCards();
    renderSide();
    UI.applyColors();

    if (focusKey) {
      const again = document.querySelector(`[data-fk="${focusKey}"]`);
      if (again) again.focus();
    }
  }

  function renderStats() {
    const c = SF.counts();
    const items = [
      ['purple', 'clock', c.pending, 'Pendientes'],
      ['green', 'check', c.completed, 'Completadas'],
      ['overdue', 'alert', c.overdue, 'Vencidas'],
      ['today', 'calendar', c.today, 'Para hoy']
    ];
    $('taskStats').innerHTML = items.map(([tone, ico, value, label]) => `
      <li class="stat-card stat-card--${tone}">
        <span class="stat-card__icon">${icon(ico)}</span>
        <div><p class="stat-card__value">${value}</p><p class="stat-card__label">${label}</p></div>
      </li>`).join('');
  }

  function renderTabs() {
    const c = SF.counts();
    $('countPending').textContent = c.pending;
    $('countDone').textContent = c.completed;

    const pending = state.tab === 'pending';
    $('tabPending').setAttribute('aria-selected', String(pending));
    $('tabPending').tabIndex = pending ? 0 : -1;
    $('tabDone').setAttribute('aria-selected', String(!pending));
    $('tabDone').tabIndex = pending ? -1 : 0;
    $('taskCards').setAttribute('aria-labelledby', pending ? 'tabPending' : 'tabDone');
  }

  function renderFilterOptions() {
    const select = $('filterSubject');
    select.innerHTML = '<option value="">Todas</option>' +
      SF.subjects().map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
    if (!SF.subjectById(state.subject)) state.subject = '';
    select.value = state.subject;
    $('filterPriority').value = state.priority;
    $('filterSort').value = state.sort;
  }

  function renderCards() {
    const list = visibleTasks();
    const container = $('taskCards');

    if (!list.length) {
      container.innerHTML = `<li>${emptyState()}</li>`;
      const create = container.querySelector('[data-create]');
      if (create) create.addEventListener('click', () => openModal());
      return;
    }
    container.innerHTML = list.map(cardHTML).join('');
  }

  function emptyState() {
    const none = SF.tasks().length === 0;
    let title;
    let text;
    let action = '';

    if (filtersActive()) {
      title = 'Sin resultados';
      text = 'No hay tareas que coincidan con tu búsqueda o filtros.';
    } else if (state.tab === 'done') {
      title = 'Aún no has completado tareas';
      text = 'Cuando marques una tarea como completada aparecerá aquí.';
    } else if (none) {
      title = 'Aún no has creado tareas';
      text = 'Crea tu primera tarea para organizar tu carga académica.';
      action = '<button type="button" class="btn btn--primary btn--sm" data-create>+ Nueva tarea</button>';
    } else {
      title = '¡Todo al día!';
      text = 'No tienes tareas pendientes en este momento.';
      action = '<button type="button" class="btn btn--primary btn--sm" data-create>+ Nueva tarea</button>';
    }

    return `<div class="empty-state"><span class="empty-state__icon">${icon('clipboard')}</span><h3>${title}</h3><p>${text}</p>${action}</div>`;
  }

  function cardHTML(task) {
    const subject = SF.subjectById(task.subjectId);
    const subs = task.subtasks || [];
    const doneSubs = subs.filter((s) => s.done).length;
    const percent = Math.round(SF.taskFraction(task) * 100);
    const overdue = SF.isOverdue(task);
    const isOpen = expanded.has(task.id);
    const hint = (task.notes || '').split('\n')[0];
    const progressText = subs.length ? `${doneSubs}/${subs.length} subtareas` : 'Sin subtareas · Agregar';

    const tags = (task.tags || []).map((tag) => `<span class="tag">${esc(tag)}</span>`).join('');

    const subItems = subs.map((s) => `
      <li class="subtask${s.done ? ' is-done' : ''}">
        <input type="checkbox" id="sub-${s.id}" data-sub="${s.id}" data-fk="sub-${s.id}"${s.done ? ' checked' : ''}>
        <label for="sub-${s.id}">${esc(s.text)}</label>
        <button type="button" class="icon-button icon-button--sm" data-del-sub="${s.id}" aria-label="Eliminar subtarea «${esc(s.text)}»">${icon('close')}</button>
      </li>`).join('');

    return `
      <li class="task-card${task.done ? ' is-done' : ''}${overdue ? ' is-overdue' : ''}" data-id="${task.id}">
        <div class="task-card__head">
          <input type="checkbox" class="task-check" data-fk="task-${task.id}" aria-label="Marcar «${esc(task.title)}» como ${task.done ? 'pendiente' : 'completada'}"${task.done ? ' checked' : ''}>
          <div class="task-card__body">
            <h3 class="task-card__title">${esc(task.title)}</h3>
            <div class="task-card__meta">
              ${subject ? `<span class="chip" data-color="${subject.color}">${esc(subject.name)}</span>` : ''}
              <span class="badge badge--${task.priority}">${SF.PRIORITY[task.priority].label}</span>
              <span class="task-card__due${overdue ? ' is-overdue' : ''}">${icon('calendar')}${esc(SF.formatDue(task))}${overdue ? ' · Vencida' : ''}</span>
            </div>
            ${tags ? `<div class="task-card__tags">${tags}</div>` : ''}
          </div>
          <div class="task-card__actions">
            <button type="button" class="icon-button icon-button--sm" data-edit aria-label="Editar «${esc(task.title)}»">${icon('edit')}</button>
            <button type="button" class="icon-button icon-button--sm" data-delete aria-label="Eliminar «${esc(task.title)}»">${icon('trash')}</button>
          </div>
        </div>
        <button type="button" class="task-card__progress" data-toggle-subs aria-expanded="${isOpen}" aria-controls="subs-${task.id}">
          <span class="task-card__progress-text">${progressText}</span>
          <span class="task-card__percent">${percent}%</span>
        </button>
        <progress class="bar" max="100" value="${percent}" aria-label="Progreso de «${esc(task.title)}»: ${percent}%"></progress>
        ${hint ? `<p class="task-card__hint">${esc(hint)}</p>` : ''}
        <div class="task-card__subs" id="subs-${task.id}"${isOpen ? '' : ' hidden'}>
          ${subs.length ? `<ul class="subtask-list">${subItems}</ul>` : ''}
          <form class="subtask-form">
            <input type="text" placeholder="Agregar subtarea" aria-label="Nueva subtarea para «${esc(task.title)}»" maxlength="100" data-fk="subadd-${task.id}">
            <button type="submit" class="btn btn--outline btn--sm">Agregar</button>
          </form>
        </div>
      </li>`;
  }

  /* ---------- Columna lateral ---------- */
  function renderSide() {
    const upcoming = SF.tasks().filter((t) => !t.done && t.dueDate).sort(SF.byDue).slice(0, 5);
    $('upcomingList').innerHTML = upcoming.length
      ? upcoming.map((t) => {
        const subject = SF.subjectById(t.subjectId);
        return `<li>
          <span class="dot-subject"${subject ? ` data-color="${subject.color}"` : ''} aria-hidden="true"></span>
          <span class="upcoming__info"><span class="upcoming__title">${esc(t.title)}</span><span class="upcoming__sub">${esc(SF.formatDue(t))}</span></span>
          <span class="badge badge--${t.priority}">${SF.PRIORITY[t.priority].label}</span></li>`;
      }).join('')
      : '<li class="side-empty">No tienes entregas próximas.</li>';

    const subjects = SF.subjects();
    $('bySubjectList').innerHTML = subjects.length
      ? subjects.map((s) => {
        const stats = SF.subjectStats(s.id);
        return `<li>
          <span class="by-subject__name"><span class="dot-subject" data-color="${s.color}" aria-hidden="true"></span><span>${esc(s.name)}</span></span>
          <progress class="bar bar--subject" data-color="${s.color}" max="100" value="${stats.progress}" aria-label="${esc(s.name)}: ${stats.progress}%"></progress>
          <span class="by-subject__count" aria-label="${stats.pending} pendientes">${stats.pending}</span></li>`;
      }).join('')
      : '<li class="side-empty">Aún no tienes materias. <a href="materias.html?nueva=1">Crear materia</a></li>';

    const reminders = SF.reminders().slice(0, 4);
    $('remindersList').innerHTML = reminders.length
      ? reminders.map((r) => {
        const tone = r.kind === 'tomorrow' ? 'info' : 'danger';
        return `<li class="reminders__${tone}">${icon(r.kind === 'tomorrow' ? 'clock' : 'alert')}<span>${esc(r.text)}</span></li>`;
      }).join('')
      : '<li class="side-empty">Sin recordatorios por ahora.</li>';
  }

  /* ---------- Acciones sobre las tarjetas ---------- */
  function onCardChange(event) {
    const card = event.target.closest('.task-card');
    if (!card) return;

    if (event.target.classList.contains('task-check')) {
      const task = SF.toggleTask(card.dataset.id);
      if (task) UI.toast(task.done ? 'Tarea completada' : 'Tarea marcada como pendiente');
    } else if (event.target.dataset.sub) {
      SF.toggleSubtask(card.dataset.id, event.target.dataset.sub);
    }
  }

  async function onCardClick(event) {
    const card = event.target.closest('.task-card');
    if (!card) return;
    const id = card.dataset.id;

    if (event.target.closest('[data-toggle-subs]')) {
      const button = card.querySelector('[data-toggle-subs]');
      const panel = card.querySelector('.task-card__subs');
      const open = panel.hidden;
      panel.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      if (open) expanded.add(id); else expanded.delete(id);
      if (open) panel.querySelector('.subtask-form input').focus();
    } else if (event.target.closest('[data-edit]')) {
      openModal(id);
    } else if (event.target.closest('[data-delete]')) {
      const task = SF.taskById(id);
      const ok = await UI.confirmDialog({ title: 'Eliminar tarea', text: `¿Seguro que quieres eliminar «${task.title}»? Esta acción no se puede deshacer.` });
      if (ok) { SF.removeTask(id); UI.toast('Tarea eliminada'); }
    } else if (event.target.closest('[data-del-sub]')) {
      SF.removeSubtask(id, event.target.closest('[data-del-sub]').dataset.delSub);
    }
  }

  function onCardSubmit(event) {
    if (!event.target.classList.contains('subtask-form')) return;
    event.preventDefault();
    const card = event.target.closest('.task-card');
    const input = event.target.querySelector('input');
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    expanded.add(card.dataset.id);
    SF.addSubtask(card.dataset.id, text);
  }

  /* ---------- Modal crear / editar ---------- */
  function openModal(id = null, presetDate = '') {
    const form = $('taskForm');
    editingId = id;
    form.reset();
    UI.clearErrors(form);

    const subjects = SF.subjects();
    form.subjectId.innerHTML = '<option value="">Seleccionar Materia</option>' +
      subjects.map((s) => `<option value="${s.id}">${esc(s.emoji)} ${esc(s.name)}</option>`).join('');

    let hint = form.subjectId.parentElement.querySelector('.field__hint');
    if (!hint) {
      hint = document.createElement('p');
      hint.className = 'field__hint';
      form.subjectId.parentElement.appendChild(hint);
    }
    hint.innerHTML = subjects.length ? '' : 'Aún no tienes materias. <a href="materias.html?nueva=1">Crear materia</a>';

    const task = id ? SF.taskById(id) : null;
    $('taskModalTitle').textContent = task ? 'Editar tarea' : 'Nueva tarea';
    $('taskSubmit').textContent = task ? 'Guardar cambios' : 'Crear tarea';

    if (task) {
      form.elements.title.value = task.title;
      form.subjectId.value = task.subjectId || '';
      form.priority.value = task.priority;
      form.dueDate.value = task.dueDate || '';
      form.dueTime.value = task.dueTime || '';
      form.tags.value = (task.tags || []).join(', ');
      form.notes.value = task.notes || '';
    } else if (presetDate) {
      form.dueDate.value = presetDate;
    }

    $('taskModal').showModal();
    form.elements.title.focus();
  }

  function onTaskSubmit(event) {
    event.preventDefault();
    const form = event.target;
    UI.clearErrors(form);

    const title = form.elements.title.value.trim();
    const dueDate = form.dueDate.value;
    const dueTime = form.dueTime.value;
    let valid = true;

    if (!title) { UI.setFieldError(form.elements.title, 'Escribe el nombre de la tarea.'); valid = false; }
    if (dueTime && !dueDate) { UI.setFieldError(form.dueDate, 'Elige una fecha para usar la hora.'); valid = false; }
    if (!valid) return;

    const tags = [...new Set(form.tags.value.split(',').map((t) => t.trim()).filter(Boolean))].slice(0, 8);
    const payload = {
      title,
      subjectId: form.subjectId.value,
      priority: form.priority.value,
      dueDate,
      dueTime,
      tags,
      notes: form.notes.value.trim()
    };

    if (editingId) {
      SF.updateTask(editingId, payload);
      UI.toast('Tarea actualizada');
    } else {
      SF.addTask(payload);
      state.tab = 'pending';
      UI.toast('Tarea creada');
    }

    $('taskModal').close();
    render();
  }
})();
