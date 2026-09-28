/* =========================================================
   StudyFlow — Utilidades de interfaz compartidas
   Avisos (toast), diálogos, confirmación, colores por materia
   y errores de formulario. Requiere store.js e icons.js.
   ========================================================= */

window.SFUI = (() => {
  'use strict';

  const PALETTE = {
    red: '239, 68, 68',
    blue: '59, 130, 246',
    amber: '245, 158, 11',
    purple: '168, 85, 247',
    green: '34, 197, 94',
    sky: '56, 189, 248',
    pink: '236, 72, 153',
    teal: '41, 214, 221'
  };

  const rgb = (color) => PALETTE[color] || PALETTE.teal;

  /** Aplica --c-rgb a todos los elementos con data-color dentro de root. */
  function applyColors(root = document) {
    root.querySelectorAll('[data-color]').forEach((el) => {
      el.style.setProperty('--c-rgb', rgb(el.dataset.color));
    });
  }

  /* ---------- Avisos ---------- */
  function toast(message, type = 'success') {
    let region = document.getElementById('toastRegion');
    if (!region) {
      region = document.createElement('div');
      region.id = 'toastRegion';
      region.className = 'toast-region';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }
    const item = document.createElement('p');
    item.className = `toast toast--${type}`;
    item.textContent = message;
    region.appendChild(item);
    setTimeout(() => item.classList.add('is-leaving'), 3200);
    setTimeout(() => item.remove(), 3600);
  }

  /* ---------- Diálogos ---------- */
  /** Cierra con [data-close], con clic en el fondo y con Esc (nativo). */
  function enhanceDialog(dialog) {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog || event.target.closest('[data-close]')) dialog.close();
    });
    return dialog;
  }

  function confirmDialog({ title, text, confirmLabel = 'Eliminar' }) {
    return new Promise((resolve) => {
      const dialog = document.createElement('dialog');
      dialog.className = 'modal modal--small';
      dialog.setAttribute('aria-labelledby', 'confirmTitle');
      dialog.innerHTML = `
        <div class="modal__form">
          <header class="modal__header"><h2 id="confirmTitle"></h2></header>
          <p class="modal__text"></p>
          <footer class="modal__footer">
            <button type="button" class="btn btn--ghost btn--sm" data-close>Cancelar</button>
            <button type="button" class="btn btn--danger btn--sm" data-confirm></button>
          </footer>
        </div>`;
      dialog.querySelector('h2').textContent = title;
      dialog.querySelector('.modal__text').textContent = text;
      dialog.querySelector('[data-confirm]').textContent = confirmLabel;
      let accepted = false;
      dialog.querySelector('[data-confirm]').addEventListener('click', () => { accepted = true; dialog.close(); });
      dialog.addEventListener('close', () => { dialog.remove(); resolve(accepted); });
      enhanceDialog(dialog);
      document.body.appendChild(dialog);
      dialog.showModal();
    });
  }

  /* ---------- Formularios ---------- */
  function setFieldError(input, message) {
    const field = input.closest('.field');
    let error = field.querySelector('.field__error');
    if (!error) {
      error = document.createElement('p');
      error.className = 'field__error';
      error.id = `${input.id}-error`;
      field.appendChild(error);
    }
    error.textContent = message;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', error.id);
  }

  function clearErrors(form) {
    form.querySelectorAll('.field__error').forEach((el) => el.remove());
    form.querySelectorAll('[aria-invalid]').forEach((el) => {
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
    });
    const banner = form.querySelector('.form-error');
    if (banner) banner.hidden = true;
  }

  function formError(form, message) {
    const banner = form.querySelector('.form-error');
    banner.textContent = message;
    banner.hidden = false;
  }

  /** Botones de mostrar/ocultar contraseña: <button data-toggle-password>. */
  function setupPasswordToggles(root = document) {
    root.querySelectorAll('[data-toggle-password]').forEach((button) => {
      const input = button.parentElement.querySelector('input');
      button.innerHTML = window.SFIcons.icon('eye');
      button.addEventListener('click', () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        button.setAttribute('aria-pressed', String(show));
        button.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
        button.innerHTML = window.SFIcons.icon(show ? 'eyeOff' : 'eye');
      });
    });
  }

  const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

  return { applyColors, rgb, toast, enhanceDialog, confirmDialog, setFieldError, clearErrors, formError, setupPasswordToggles, validEmail };
})();
