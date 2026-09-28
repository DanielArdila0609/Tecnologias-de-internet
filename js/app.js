/* =========================================================
   StudyFlow — Estructura de la aplicación (páginas internas)
   Protege las páginas (requiere sesión), genera el menú lateral
   y la barra superior, y gestiona buscador, notificaciones y salida.
   ========================================================= */

(() => {
  'use strict';

  const { icon } = window.SFIcons;
  const { esc } = window.SF;

  const NAV = [
    ['inicio', 'home', 'Inicio', 'dashboard.html'],
    ['tareas', 'tasks', 'Tareas', 'tareas.html'],
    ['calendario', 'calendar', 'Calendario', 'calendario.html'],
    ['pomodoro', 'timer', 'Pomodoro', 'pomodoro.html'],
    ['materias', 'book', 'Materias', 'materias.html'],
    ['perfil', 'user', 'Perfil', 'perfil.html']
  ];

  window.SF.onReady(() => {
    const user = window.SF.requireUser();
    if (!user) return;

    renderShell(user);
    setupSidebar();
    setupSearch();
    setupNotifications();

    document.addEventListener('sf:change', updateShell);
    updateShell();
  });

  /* ---------- Estructura ---------- */
  function renderShell(user) {
    const page = document.body.dataset.page;

    const links = NAV.map(([key, ico, label, href]) => {
      const current = key === page ? ' aria-current="page"' : '';
      const badge = key === 'tareas' ? '<span class="sidebar__badge" id="taskBadge" hidden></span>' : '';
      return `<li><a class="sidebar__link" href="${href}"${current}>${icon(ico)}<span>${label}</span>${badge}</a></li>`;
    }).join('');

    const sidebar = `
      <aside class="sidebar" id="sidebar">
        <a class="sidebar__brand" href="dashboard.html" aria-label="StudyFlow, ir al inicio">
          <img src="../assets/logo/studyflow-mark.svg" alt="" width="30" height="30">
          <span>StudyFlow</span>
        </a>
        <nav aria-label="Navegación de la aplicación"><ul class="sidebar__nav">${links}</ul></nav>
        <button type="button" class="sidebar__logout" id="logoutBtn">${icon('logout')}<span>Cerrar sesión</span></button>
      </aside>
      <div class="sidebar-backdrop" aria-hidden="true"></div>`;

    const topbar = `
      <header class="topbar">
        <button type="button" class="topbar__menu" aria-label="Abrir menú de navegación" aria-expanded="false" aria-controls="sidebar">${icon('menu')}</button>
        <div class="topbar__search-wrap">
          <form class="topbar__search" role="search" action="tareas.html" method="get">
            <label class="visually-hidden" for="globalSearch">Buscar tareas y materias</label>
            ${icon('search')}
            <input type="search" id="globalSearch" name="q" placeholder="Buscar..." autocomplete="off" aria-controls="searchResults">
          </form>
          <div class="dropdown dropdown--search" id="searchResults" hidden></div>
        </div>
        <div class="topbar__actions">
          <a class="streak" href="pomodoro.html" id="streakPill" title="Tu racha de estudio">${icon('flame')}<span></span></a>
          <div class="dropdown-wrap">
            <button type="button" class="icon-button" id="bellBtn" aria-label="Notificaciones" aria-haspopup="true" aria-expanded="false" aria-controls="notifPanel">
              ${icon('bell')}<span class="icon-button__dot" id="bellDot" hidden></span>
            </button>
            <div class="dropdown dropdown--notif" id="notifPanel" hidden></div>
          </div>
          <a class="avatar" href="perfil.html" id="avatarLink" aria-label="Mi perfil"></a>
        </div>
      </header>`;

    document.querySelector('[data-shell="sidebar"]').outerHTML = sidebar;
    document.querySelector('[data-shell="topbar"]').outerHTML = topbar;

    document.getElementById('logoutBtn').addEventListener('click', () => {
      window.SF.logout();
      window.location.href = 'iniciar-sesion.html';
    });
  }

  /** Refresca los datos dinámicos del shell (racha, avisos, avatar). */
  function updateShell() {
    const SF = window.SF;
    const user = SF.currentUser();
    if (!user) return;

    const streak = SF.streak();
    document.querySelector('#streakPill span').textContent = `${streak} ${streak === 1 ? 'día' : 'días'}`;

    const badge = document.getElementById('taskBadge');
    const pending = SF.counts().pending;
    badge.textContent = pending;
    badge.hidden = pending === 0;
    badge.setAttribute('aria-label', `${pending} tareas pendientes`);

    const avatar = document.getElementById('avatarLink');
    avatar.innerHTML = user.avatar ? `<img src="${esc(user.avatar)}" alt="">` : esc(SF.initials(user));
    avatar.title = SF.fullName(user);

    renderNotifications();
  }

  /* ---------- Menú lateral responsive ---------- */
  function setupSidebar() {
    const toggle = document.querySelector('.topbar__menu');
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.querySelector('.sidebar-backdrop');

    const setOpen = (open) => {
      sidebar.classList.toggle('is-open', open);
      backdrop.classList.toggle('is-visible', open);
      toggle.setAttribute('aria-expanded', String(open));
    };

    toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('is-open')));
    backdrop.addEventListener('click', () => setOpen(false));
    sidebar.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && sidebar.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    window.matchMedia('(min-width: 901px)').addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  /* ---------- Buscador ---------- */
  const fold = (text) => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function setupSearch() {
    const input = document.getElementById('globalSearch');
    const results = document.getElementById('searchResults');

    // En la página de tareas el buscador global filtra la lista directamente.
    const params = new URLSearchParams(window.location.search);
    if (params.get('q')) input.value = params.get('q');

    const close = () => { results.hidden = true; };

    input.addEventListener('input', () => {
      const query = fold(input.value.trim());
      if (!query) { close(); return; }

      const SF = window.SF;
      const taskHits = SF.tasks()
        .filter((t) => fold(`${t.title} ${(t.tags || []).join(' ')}`).includes(query))
        .slice(0, 5);
      const subjectHits = SF.subjects().filter((s) => fold(s.name).includes(query)).slice(0, 3);

      const rows = [
        ...taskHits.map((t) => `<li><a href="tareas.html?q=${encodeURIComponent(t.title)}">${icon('tasks')}<span>${esc(t.title)}</span><small>Tarea</small></a></li>`),
        ...subjectHits.map((s) => `<li><a href="tareas.html?materia=${encodeURIComponent(s.id)}"><span aria-hidden="true">${esc(s.emoji)}</span><span>${esc(s.name)}</span><small>Materia</small></a></li>`)
      ];

      results.innerHTML = rows.length
        ? `<ul class="dropdown__list">${rows.join('')}</ul>`
        : '<p class="dropdown__empty">Sin resultados para tu búsqueda.</p>';
      results.hidden = false;
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.topbar__search-wrap')) close();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
  }

  /* ---------- Notificaciones ---------- */
  function setupNotifications() {
    const button = document.getElementById('bellBtn');
    const panel = document.getElementById('notifPanel');

    const setOpen = (open) => {
      panel.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
    };

    button.addEventListener('click', () => setOpen(panel.hidden));
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.dropdown-wrap')) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !panel.hidden) {
        setOpen(false);
        button.focus();
      }
    });
  }

  function renderNotifications() {
    const panel = document.getElementById('notifPanel');
    const dot = document.getElementById('bellDot');
    if (!panel) return;

    const items = window.SF.reminders();
    dot.hidden = items.length === 0;

    const rows = items.slice(0, 6).map((r) => {
      const level = r.kind === 'tomorrow' ? 'info' : 'danger';
      return `<li><a href="tareas.html?q=${encodeURIComponent(r.task.title)}" class="notif-item notif-item--${level}">${icon(r.kind === 'tomorrow' ? 'clock' : 'alert')}<span>${esc(r.text)}</span></a></li>`;
    }).join('');

    panel.innerHTML = `
      <p class="dropdown__title">Notificaciones</p>
      ${items.length ? `<ul class="dropdown__list">${rows}</ul>` : '<p class="dropdown__empty">No tienes notificaciones por ahora.</p>'}`;
  }
})();
