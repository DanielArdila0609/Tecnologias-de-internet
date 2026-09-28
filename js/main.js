/* =========================================================
   StudyFlow — Interacciones generales de interfaz (todas las páginas)
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  setupMobileMenu();
  setupSmoothAnchorScroll();
  setupActionButtons();
});

/**
 * Menú hamburguesa para navegación en móvil.
 */
function setupMobileMenu() {
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('mobileMenu');

  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    menu.hidden = !isOpen;
  });

  // Cierra el menú al elegir un enlace.
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menu.classList.remove('is-open');
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/**
 * Desplazamiento suave al hacer clic en enlaces internos (#ancla).
 */
function setupSmoothAnchorScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });
}

/**
 * Feedback visual sencillo para los botones de acción
 * (esta maqueta no incluye backend ni autenticación real).
 */
function setupActionButtons() {
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-action');

      if (action === 'signup' || action === 'login') {
        const hero = document.getElementById('inicio');
        if (hero) hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      if (action === 'demo') {
        const features = document.getElementById('funciones');
        if (features) features.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}
