/* =========================================================
   StudyFlow — Autenticación (simulada, sin backend)
   Iniciar sesión, crear cuenta, recuperar contraseña y acceso
   simulado con Google / Microsoft.
   ========================================================= */

(() => {
  'use strict';

  const { icon } = window.SFIcons;
  const UI = window.SFUI;
  const SF = window.SF;

  const DASHBOARD = 'dashboard.html';
  const PROVIDERS = { google: 'Google', microsoft: 'Microsoft' };

  SF.onReady(() => {
    const onRecover = document.getElementById('recoverForm');

    // Quien ya tiene sesión va directo al panel (excepto al recuperar contraseña).
    if (SF.currentUser() && !onRecover) {
      window.location.replace(DASHBOARD);
      return;
    }

    renderVisual();
    UI.setupPasswordToggles();

    const login = document.getElementById('loginForm');
    const signup = document.getElementById('signupForm');

    if (login) setupLogin(login);
    if (signup) setupSignup(signup);
    if (onRecover) setupRecover();
    if (document.querySelector('[data-provider]')) setupSocial();
  });

  /* ---------- Iniciar sesión ---------- */
  function setupLogin(form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      UI.clearErrors(form);

      const email = form.email.value.trim();
      const password = form.password.value;
      let valid = true;

      if (!UI.validEmail(email)) { UI.setFieldError(form.email, 'Escribe un correo electrónico válido.'); valid = false; }
      if (!password) { UI.setFieldError(form.password, 'Escribe tu contraseña.'); valid = false; }
      if (!valid) return;

      const account = await SF.authenticate(email, password);
      if (!account) {
        const existing = SF.account(email);
        UI.formError(form, existing && !existing.passHash
          ? 'Esta cuenta se creó con Google o Microsoft. Usa ese botón para entrar.'
          : 'Correo o contraseña incorrectos.');
        return;
      }

      SF.login(email);
      window.location.href = DASHBOARD;
    });
  }

  /* ---------- Crear cuenta ---------- */
  function setupSignup(form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      UI.clearErrors(form);

      const fullName = form.elements.name.value.trim();
      const email = form.email.value.trim();
      const password = form.password.value;
      let valid = true;

      if (fullName.length < 2) { UI.setFieldError(form.elements.name, 'Escribe tu nombre completo.'); valid = false; }
      if (!UI.validEmail(email)) { UI.setFieldError(form.email, 'Escribe un correo electrónico válido.'); valid = false; }
      if (password.length < 8) { UI.setFieldError(form.password, 'La contraseña debe tener al menos 8 caracteres.'); valid = false; }
      if (form.confirm.value !== password) { UI.setFieldError(form.confirm, 'Las contraseñas no coinciden.'); valid = false; }
      if (!form.terms.checked) { UI.setFieldError(form.terms, 'Debes aceptar los términos y condiciones.'); valid = false; }
      if (!valid) return;

      try {
        await SF.register({ fullName, email, password });
      } catch (error) {
        UI.setFieldError(form.email, 'Este correo ya tiene una cuenta. Inicia sesión.');
        return;
      }
      window.location.href = DASHBOARD;
    });
  }

  /* ---------- Recuperar contraseña ---------- */
  function setupRecover() {
    const recover = document.getElementById('recoverForm');
    const reset = document.getElementById('resetForm');
    const done = document.getElementById('resetDone');
    let targetEmail = '';

    recover.addEventListener('submit', (event) => {
      event.preventDefault();
      UI.clearErrors(recover);
      const email = recover.email.value.trim();

      if (!UI.validEmail(email)) { UI.setFieldError(recover.email, 'Escribe un correo electrónico válido.'); return; }
      if (!SF.account(email)) { UI.setFieldError(recover.email, 'No encontramos una cuenta con ese correo.'); return; }

      targetEmail = email;
      recover.hidden = true;
      reset.hidden = false;
      reset.password.focus();
    });

    reset.addEventListener('submit', async (event) => {
      event.preventDefault();
      UI.clearErrors(reset);
      let valid = true;

      if (reset.password.value.length < 8) { UI.setFieldError(reset.password, 'La contraseña debe tener al menos 8 caracteres.'); valid = false; }
      if (reset.confirm.value !== reset.password.value) { UI.setFieldError(reset.confirm, 'Las contraseñas no coinciden.'); valid = false; }
      if (!valid) return;

      await SF.setPassword(targetEmail, reset.password.value);
      reset.hidden = true;
      done.hidden = false;
      done.querySelector('a').focus();
    });
  }

  /* ---------- Google / Microsoft (simulado) ---------- */
  function setupSocial() {
    const dialog = document.createElement('dialog');
    dialog.className = 'modal';
    dialog.setAttribute('aria-labelledby', 'socialTitle');
    dialog.innerHTML = `
      <form class="modal__form" id="socialForm" novalidate>
        <header class="modal__header">
          <h2 id="socialTitle"></h2>
          <button type="button" class="modal__close" data-close aria-label="Cerrar">${icon('close')}</button>
        </header>
        <p class="modal__text">Simulación: esta maqueta no se conecta con el proveedor. Indica el correo con el que quieres entrar.</p>
        <div class="field">
          <label for="socialEmail">Correo electrónico</label>
          <input type="email" id="socialEmail" name="email" autocomplete="email" required>
        </div>
        <div class="field">
          <label for="socialName">Nombre (solo si es tu primera vez)</label>
          <input type="text" id="socialName" name="name" autocomplete="name">
        </div>
        <p class="form-error" role="alert" hidden></p>
        <footer class="modal__footer">
          <button type="button" class="btn btn--ghost btn--sm" data-close>Cancelar</button>
          <button type="submit" class="btn btn--primary btn--sm">Continuar</button>
        </footer>
      </form>`;
    document.body.appendChild(dialog);
    UI.enhanceDialog(dialog);

    const form = dialog.querySelector('form');
    let provider = 'google';

    document.querySelectorAll('[data-provider]').forEach((button) => {
      button.addEventListener('click', () => {
        provider = button.dataset.provider;
        form.reset();
        UI.clearErrors(form);
        dialog.querySelector('#socialTitle').textContent = `Continuar con ${PROVIDERS[provider]}`;
        dialog.showModal();
      });
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      UI.clearErrors(form);
      const email = form.email.value.trim();

      if (!UI.validEmail(email)) { UI.setFieldError(form.email, 'Escribe un correo electrónico válido.'); return; }

      if (!SF.account(email)) {
        const name = form.elements.name.value.trim() || email.split('@')[0];
        await SF.register({ fullName: name, email, password: '', provider });
      } else {
        SF.login(email);
      }
      window.location.href = DASHBOARD;
    });
  }

  /* ---------- Mockup decorativo (lado izquierdo) ---------- */
  function renderVisual() {
    const visual = document.getElementById('authVisual');
    if (!visual) return;

    visual.innerHTML = `
      <span class="float-icon float-icon--a">${icon('thumb')}</span>
      <span class="float-icon float-icon--b">${icon('clock')}</span>
      <span class="float-icon float-icon--c">${icon('coffee')}</span>
      <div class="mock">
        <div class="mock__bar"><i></i><i></i><i></i><span class="mock__url">studyflow.app</span></div>
        <div class="mock__body">
          <ul class="mock__side"><li></li><li></li><li></li><li></li><li></li></ul>
          <div class="mock__main">
            <div class="mock__row">
              <div class="mock__card mock__card--timer"><small>Pomodoro</small><strong class="mock__time">25:00</strong></div>
              <div class="mock__card"><small>Esta semana</small>
                <div class="mock__days"><span></span><span class="is-on"></span><span class="is-on"></span><span class="is-on"></span><span></span><span></span><span></span></div>
              </div>
            </div>
            <div class="mock__card"><small>Tareas pendientes</small>
              <div class="mock__task"><span>Resolver ejercicio de cálculo</span><em>Alta</em></div>
              <div class="mock__task mock__task--amber"><span>Preparar exposición de Historia</span><em>Media</em></div>
              <div class="mock__task mock__task--green"><span>Leer capítulos de Química</span><em>Baja</em></div>
            </div>
            <div class="mock__productivity"><span>Productividad semanal</span><b>+12%</b></div>
          </div>
        </div>
        <div class="mock__status"><span>StudyFlow v1.0</span><span>15 días de racha</span></div>
      </div>`;
  }
})();
