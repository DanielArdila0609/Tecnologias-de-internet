/* =========================================================
   StudyFlow — Interacciones de la aplicación (páginas internas)
   Sidebar responsive, enlaces pendientes y buscador de la barra superior.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  setupSidebar();
  setupPendingLinks();
  setupSearch();
});

/**
 * Sidebar off-canvas en pantallas pequeñas.
 */
function setupSidebar() {
  const toggle = document.querySelector('.topbar__menu');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');

  if (!toggle || !sidebar || !backdrop) return;

  const open = () => {
    sidebar.classList.add('is-open');
    backdrop.classList.add('is-visible');
    toggle.setAttribute('aria-expanded', 'true');
  };

  const close = () => {
    sidebar.classList.remove('is-open');
    backdrop.classList.remove('is-visible');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    sidebar.classList.contains('is-open') ? close() : open();
  });

  backdrop.addEventListener('click', close);

  sidebar.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && sidebar.classList.contains('is-open')) {
      close();
      toggle.focus();
    }
  });

  window.matchMedia('(min-width: 901px)').addEventListener('change', (event) => {
    if (event.matches) close();
  });
}

/**
 * Enlaces a páginas que todavía no existen (href="#"): evita el salto al inicio.
 * Cuando se cree la página, basta con cambiar el href en el HTML.
 */
function setupPendingLinks() {
  document.querySelectorAll('a[href="#"]').forEach((link) => {
    link.addEventListener('click', (event) => event.preventDefault());
  });
}

/**
 * El buscador es solo visual en esta maqueta: evita recargar la página.
 */
function setupSearch() {
  const form = document.querySelector('.topbar__search');
  if (form) form.addEventListener('submit', (event) => event.preventDefault());
}
