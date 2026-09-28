/* =========================================================
   StudyFlow — Páginas públicas de autenticación
   Registro, inicio de sesión, recuperar contraseña.
   Requiere js/store.js cargado antes.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  // Si ya hay sesión activa, no tiene sentido ver estas páginas.
  if (StudyFlowStore.currentUser() && !document.body.hasAttribute('data-allow-authenticated')) {
    window.location.replace('dashboard.html');
    return;
  }

  setupPasswordToggles();
  setupRegisterForm();
  setupLoginForm();
  setupForgotForm();
  setupProviderButtons();
});

function setupPasswordToggles() {
  document.querySelectorAll('.form-field__toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const input = document.getElementById(toggle.dataset.target);
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      toggle.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
      toggle.setAttribute('aria-pressed', String(show));
    });
  });
}

function showError(form, message) {
  const box = form.querySelector('[data-form-error]');
  if (!box) return;
  box.textContent = message;
  box.hidden = false;
}

function clearError(form) {
  const box = form.querySelector('[data-form-error]');
  if (box) box.hidden = true;
}

function setupRegisterForm() {
  const form = document.getElementById('form-registro');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearError(form);

    const name = form.nombre.value.trim();
    const email = form.correo.value.trim();
    const password = form.contrasena.value;
    const confirm = form.confirmarContrasena.value;

    if (password !== confirm) {
      showError(form, 'Las contraseñas no coinciden.');
      return;
    }

    const result = StudyFlowStore.register({ name, email, password });
    if (!result.ok) {
      showError(form, result.error);
      return;
    }

    StudyFlowStore.login({ email, password, remember: true });
    window.location.href = 'dashboard.html';
  });
}

function setupLoginForm() {
  const form = document.getElementById('form-login');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearError(form);

    const email = form.correo.value.trim();
    const password = form.contrasena.value;
    const remember = form.recordarme ? form.recordarme.checked : true;

    const result = StudyFlowStore.login({ email, password, remember });
    if (!result.ok) {
      showError(form, result.error);
      return;
    }

    window.location.href = 'dashboard.html';
  });
}

function setupForgotForm() {
  const form = document.getElementById('form-recuperar');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = form.correo.value.trim();
    StudyFlowStore.requestPasswordReset(email);

    form.hidden = true;
    const success = document.getElementById('recuperar-exito');
    if (success) {
      success.hidden = false;
      const emailLabel = success.querySelector('[data-sent-email]');
      if (emailLabel) emailLabel.textContent = email;
      success.setAttribute('tabindex', '-1');
      success.focus();
    }
  });
}

function setupProviderButtons() {
  document.querySelectorAll('[data-provider]').forEach((btn) => {
    btn.addEventListener('click', () => {
      StudyFlowStore.loginWithProvider(btn.dataset.provider);
      window.location.href = 'dashboard.html';
    });
  });
}