/* =========================================================
   StudyFlow — Dashboard
   Todo se calcula a partir de los datos de la cuenta: una cuenta
   nueva ve estados vacíos (sin tareas, materias ni actividad).
   ========================================================= */

(() => {
  'use strict';

  const SF = window.SF;
  const UI = window.SFUI;
  const { icon } = window.SFIcons;
  const { esc } = SF;

  const PRIORITY_CLASS = { high: 'high', medium: 'medium', low: 'low' };

  SF.onReady(() => {
    if (!SF.currentUser()) return;
    render();
    document.addEventListener('sf:change', render);
  });

  function render() {
    renderWelcome();
    renderSession();
    renderStats();
    renderProgress();
    renderSubjects();
    renderTasks();
    UI.applyColors();
  }

  function renderWelcome() {
    const returning = !SF.isNewUser();
    document.getElementById('welcome').innerHTML =
      `${returning ? '¡Bienvenido de Nuevo!' : '¡Bienvenido!'} <span aria-hidden="true">👋</span>`;
  }

  function renderSession() {
    const settings = SF.settings();
    const done = SF.sessionsToday();
    const goal = settings.dailyGoal;

    document.getElementById('ringInner').innerHTML =
      `${icon('timer')}<span>${done}/${goal}<br>sesiones</span>`;
    document.getElementById('sessionBar').value = Math.min(100, Math.round((done / goal) * 100));
    document.getElementById('sessionBar').setAttribute('aria-label', `Sesiones de estudio de hoy: ${done} de ${goal}`);
    document.getElementById('goPomodoro').innerHTML = `Ir al pomodoro ${icon('arrow')}`;
  }

  function renderStats() {
    const counts = SF.counts();
    const items = [
      ['time', 'clock', SF.formatHours(SF.minutesToday()), 'Horas hoy'],
      ['done', 'tasks', counts.completed, 'Tareas completadas'],
      ['pending', 'target', counts.pending, 'Tareas pendientes'],
      ['streak', 'flame', `${SF.streak()}d`, 'Racha']
    ];
    document.getElementById('dashStats').innerHTML = items.map(([tone, ico, value, label]) => `
      <li class="stat-card stat-card--${tone}">
        <span class="stat-card__icon">${icon(ico)}</span>
        <p class="stat-card__value">${value}</p>
        <p class="stat-card__label">${label}</p>
      </li>`).join('');
  }

  function renderProgress() {
    const now = new Date();
    const time = document.getElementById('todayDate');
    time.textContent = `${SF.pad(now.getDate())}/${SF.pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    time.dateTime = SF.todayKey();

    const day = SF.daySummary();
    document.getElementById('dayPercent').textContent = `${day.percent}% Completado`;

    const list = document.getElementById('progressList');
    const subjects = SF.subjects();

    if (!SF.tasks().length) {
      list.innerHTML = `<li class="day-progress__item"><a href="tareas.html?nueva=1" class="link-create">Crear Tarea +</a><progress class="bar" max="100" value="0" aria-label="Sin tareas todavía"></progress></li>`;
      return;
    }

    if (!subjects.length) {
      list.innerHTML = `<li class="day-progress__item"><span>Agrega materias para ver tu progreso por materia.</span><a href="materias.html?nueva=1" class="link-create">Crear Materia +</a></li>`;
      return;
    }

    list.innerHTML = subjects.slice(0, 3).map((subject) => {
      const stats = SF.subjectStats(subject.id);
      return `<li class="day-progress__item"><span>${esc(subject.name)}</span>
        <progress class="bar bar--subject" data-color="${subject.color}" max="100" value="${stats.progress}" aria-label="${esc(subject.name)}: ${stats.progress}%"></progress></li>`;
    }).join('');
  }

  function renderSubjects() {
    const list = document.getElementById('subjectTiles');
    const subjects = SF.subjects();

    if (!subjects.length) {
      list.innerHTML = '<li><a href="materias.html?nueva=1" class="subject-tile subject-tile--create">Crear<br>Materia +</a></li>';
      return;
    }

    list.innerHTML = subjects.slice(0, 6).map((subject) => `
      <li><a href="tareas.html?materia=${encodeURIComponent(subject.id)}" class="subject-tile" data-color="${subject.color}">
        <span class="subject-tile__emoji" aria-hidden="true">${esc(subject.emoji)}</span>
        <span class="subject-tile__name">${esc(subject.name)}</span>
        <span class="subject-tile__value">${SF.subjectStats(subject.id).progress}%</span>
      </a></li>`).join('');
  }

  function renderTasks() {
    const list = document.getElementById('dashTasks');
    const pending = SF.tasks().filter((t) => !t.done).sort(SF.byDue).slice(0, 4);

    if (!pending.length) {
      list.innerHTML = `<li class="task-item">
        <input type="checkbox" class="task-item__check" disabled aria-label="Aún no hay tareas">
        <span class="task-item__priority task-item__priority--high" aria-hidden="true"></span>
        <span class="task-item__info"><a href="tareas.html?nueva=1" class="task-item__name">Crear Tarea +</a></span>
        <span class="badge badge--high">Prioridad</span></li>`;
      return;
    }

    list.innerHTML = pending.map((task) => {
      const subject = SF.subjectById(task.subjectId);
      const level = PRIORITY_CLASS[task.priority] || 'medium';
      return `<li class="task-item" data-id="${task.id}">
        <input type="checkbox" class="task-item__check" aria-label="Marcar «${esc(task.title)}» como completada">
        <span class="task-item__priority task-item__priority--${level}" aria-hidden="true"></span>
        <span class="task-item__info">
          <span class="task-item__name">${esc(task.title)}</span>
          <span class="task-item__subject">${subject ? esc(subject.name) : 'Sin materia'}</span>
        </span>
        <span class="badge badge--${level}">${SF.PRIORITY[task.priority].label}</span></li>`;
    }).join('');

    list.querySelectorAll('.task-item__check').forEach((box) => {
      box.addEventListener('change', () => {
        SF.toggleTask(box.closest('.task-item').dataset.id);
        UI.toast('Tarea completada');
      });
    });
  }
})();
