/* =========================================================
   StudyFlow — Mi perfil
   Información personal editable, foto de perfil (guardada como
   data URL local) y seguridad: cambiar contraseña o vincular una
   si la cuenta se creó con Google/Microsoft.
   ========================================================= */

(() => {
  'use strict';

  const SF = window.SF;
  const UI = window.SFUI;
  const { icon } = window.SFIcons;
  const { esc } = SF;
  const $ = (id) => document.getElementById(id);

  SF.onReady(() => {
    const user = SF.currentUser();
    if (!user) return;
    init(user);
  });

  function init() {
    document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); });
    $('avatarBtn').innerHTML = icon('camera');
    $('editProfileBtn').addEventListener('click', () => $('pfName').focus());

    $('avatarBtn').addEventListener('click', () => $('avatarInput').click());
    $('avatarInput').addEventListener('change', onAvatarChange);

    $('infoForm').addEventListener('submit', onInfoSubmit);

    render();
    document.addEventListener('sf:change', render);
  }

  function render() {
    const user = SF.currentUser();
    if (!user) return;

    $('profileAvatar').innerHTML = user.avatar ? `<img src="${esc(user.avatar)}" alt="">` : esc(SF.initials(user));
    $('profileName').textContent = SF.fullName(user);
    $('profileEmail').textContent = user.email;
    $('profileCareer').textContent = user.career || 'Agrega tu carrera o programa';
    $('profileSince').textContent = `Miembro desde ${memberSince(user.createdAt)}`;

    const form = $('infoForm');
    form.name.value = user.name || '';
    form.lastName.value = user.lastName || '';
    form.email.value = user.email;
    form.university.value = user.university || '';
    form.career.value = user.career || '';
    form.semester.value = user.semester || '';

    renderSecurity(user);
  }

  function memberSince(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'poco tiempo';
    const month = SF.MONTHS[date.getMonth()];
    return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.getFullYear()}`;
  }

  function onAvatarChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) { UI.toast('Elige un archivo de imagen.', 'error'); return; }
    if (file.size > 1.5 * 1024 * 1024) { UI.toast('La imagen es muy pesada (máximo 1.5 MB).', 'error'); return; }

    const reader = new FileReader();
    reader.onload = () => {
      SF.updateAccount({ avatar: reader.result });
      UI.toast('Foto de perfil actualizada');
    };
    reader.readAsDataURL(file);
  }

  function onInfoSubmit(event) {
    event.preventDefault();
    const form = event.target;
    UI.clearErrors(form);

    const name = form.name.value.trim();
    if (!name) { UI.setFieldError(form.name, 'Escribe tu nombre.'); return; }

    SF.updateAccount({
      name,
      lastName: form.lastName.value.trim(),
      university: form.university.value.trim(),
      career: form.career.value.trim(),
      semester: form.semester.value.trim()
    });

    const success = form.querySelector('.form-success');
    success.textContent = 'Tus datos se guardaron correctamente.';
    success.hidden = false;
    setTimeout(() => { success.hidden = true; }, 3000);
    UI.toast('Perfil actualizado');
  }

  /* ---------- Seguridad ---------- */
  function renderSecurity(user) {
    const body = $('securityBody');

    if (!user.passHash) {
      body.innerHTML = `
        <p class="security-note">${icon('alert')}Tu cuenta usa acceso con ${user.provider === 'microsoft' ? 'Microsoft' : 'Google'}. Puedes crear una contraseña para entrar también con tu correo.</p>
        <form class="security-form" id="setPasswordForm" novalidate>
          <div class="field-row">
            <div class="field"><label for="newPass1">Nueva contraseña</label>
              <div class="input-wrap"><input type="password" id="newPass1" name="password" placeholder="Mínimo 8 caracteres" autocomplete="new-password" required><button type="button" class="input-wrap__toggle" data-toggle-password aria-label="Mostrar contraseña" aria-pressed="false"></button></div>
            </div>
            <div class="field"><label for="newPass2">Confirmar contraseña</label>
              <div class="input-wrap"><input type="password" id="newPass2" name="confirm" placeholder="Repite la contraseña" autocomplete="new-password" required><button type="button" class="input-wrap__toggle" data-toggle-password aria-label="Mostrar contraseña" aria-pressed="false"></button></div>
            </div>
          </div>
          <p class="form-error" role="alert" hidden></p>
          <div class="profile-form__actions"><button type="submit" class="btn btn--primary btn--sm">${icon('key')}Crear contraseña</button></div>
        </form>`;
      UI.setupPasswordToggles(body);
      body.querySelector('#setPasswordForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.target;
        UI.clearErrors(form);
        if (form.password.value.length < 8) { UI.setFieldError(form.password, 'La contraseña debe tener al menos 8 caracteres.'); return; }
        if (form.confirm.value !== form.password.value) { UI.setFieldError(form.confirm, 'Las contraseñas no coinciden.'); return; }
        await SF.setPassword(user.email, form.password.value);
        UI.toast('Ya puedes iniciar sesión con tu correo y contraseña');
        render();
      });
      return;
    }

    body.innerHTML = `
      <h3 class="security-form__title">Cambiar contraseña</h3>
      <form class="security-form" id="changePasswordForm" novalidate>
        <div class="field"><label for="currentPass">Contraseña actual</label>
          <div class="input-wrap"><input type="password" id="currentPass" name="current" autocomplete="current-password" placeholder="Tu contraseña actual" required><button type="button" class="input-wrap__toggle" data-toggle-password aria-label="Mostrar contraseña" aria-pressed="false"></button></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="newPass1">Nueva contraseña</label>
            <div class="input-wrap"><input type="password" id="newPass1" name="password" placeholder="Mínimo 8 caracteres" autocomplete="new-password" required><button type="button" class="input-wrap__toggle" data-toggle-password aria-label="Mostrar contraseña" aria-pressed="false"></button></div>
          </div>
          <div class="field"><label for="newPass2">Confirmar contraseña</label>
            <div class="input-wrap"><input type="password" id="newPass2" name="confirm" placeholder="Repite la contraseña" autocomplete="new-password" required><button type="button" class="input-wrap__toggle" data-toggle-password aria-label="Mostrar contraseña" aria-pressed="false"></button></div>
          </div>
        </div>
        <p class="form-error" role="alert" hidden></p>
        <div class="profile-form__actions"><button type="submit" class="btn btn--danger btn--sm">${icon('key')}Actualizar contraseña</button></div>
      </form>`;
    UI.setupPasswordToggles(body);
    body.querySelector('#changePasswordForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.target;
      UI.clearErrors(form);

      const ok = await SF.checkPassword(form.current.value);
      if (!ok) { UI.setFieldError(form.current, 'La contraseña actual no es correcta.'); return; }
      if (form.password.value.length < 8) { UI.setFieldError(form.password, 'La contraseña debe tener al menos 8 caracteres.'); return; }
      if (form.confirm.value !== form.password.value) { UI.setFieldError(form.confirm, 'Las contraseñas no coinciden.'); return; }

      await SF.setPassword(user.email, form.password.value);
      UI.toast('Contraseña actualizada');
      form.reset();
    });
  }
})();
