/* =========================================================
   StudyFlow — Pomodoro
   Temporizador con enfoque / descanso corto / descanso largo,
   configuración por cuenta y resumen del día. Usa marcas de tiempo
   (no se desfasa si la pestaña queda en segundo plano).
   ========================================================= */

(() => {
  'use strict';

  const SF = window.SF;
  const UI = window.SFUI;
  const { icon } = window.SFIcons;

  const MODES = {
    focus: { label: 'Enfoque' },
    short: { label: 'Descanso corto' },
    long: { label: 'Descanso largo' }
  };

  const LIMITS = {
    focus: { min: 5, max: 90, step: 5, unit: 'min' },
    short: { min: 1, max: 15, step: 1, unit: 'min' },
    long: { min: 5, max: 45, step: 5, unit: 'min' },
    cycles: { min: 2, max: 8, step: 1, unit: 'ses' },
    dailyGoal: { min: 1, max: 12, step: 1, unit: 'ses' }
  };

  const CIRCUMFERENCE = 2 * Math.PI * 104;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);

  let settings;
  let timer;
  let tickId = null;
  let blinkId = null;
  let showDash = false;
  let audio = null;

  SF.onReady(() => {
    if (!SF.currentUser()) return;
    init();
  });

  /* ---------- Pantalla de 7 segmentos (SVG) ---------- */
  const T = 5;
  const hbar = (x1, x2, y) => `${x1},${y} ${x1 + T / 2},${y - T / 2} ${x2 - T / 2},${y - T / 2} ${x2},${y} ${x2 - T / 2},${y + T / 2} ${x1 + T / 2},${y + T / 2}`;
  const vbar = (x, y1, y2) => `${x},${y1} ${x + T / 2},${y1 + T / 2} ${x + T / 2},${y2 - T / 2} ${x},${y2} ${x - T / 2},${y2 - T / 2} ${x - T / 2},${y1 + T / 2}`;
  const SEGMENTS = {
    a: hbar(4, 26, 2.5), b: vbar(27.5, 4, 25), c: vbar(27.5, 27, 48), d: hbar(4, 26, 49.5),
    e: vbar(2.5, 27, 48), f: vbar(2.5, 4, 25), g: hbar(4, 26, 26)
  };
  const GLYPHS = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g' };

  function digit(char, x) {
    const on = GLYPHS[char] || '';
    const shapes = Object.entries(SEGMENTS)
      .map(([key, points]) => `<polygon class="seg${on.includes(key) ? ' is-on' : ''}" points="${points}"/>`)
      .join('');
    return `<g transform="translate(${x} 0)">${shapes}</g>`;
  }

  function segmentDisplay(text) {
    const [d1, d2, , d3, d4] = text;
    return `<svg class="seg-display" viewBox="0 0 162 52" aria-hidden="true" focusable="false">
      <g transform="translate(6 0) skewX(-6)">
        ${digit(d1, 0)}${digit(d2, 36)}
        <circle class="seg is-on" cx="80" cy="17" r="3"/><circle class="seg is-on" cx="80" cy="35" r="3"/>
        ${digit(d3, 88)}${digit(d4, 124)}
      </g></svg>`;
  }

  /* ---------- Estado del temporizador ---------- */
  const duration = (mode) => settings[mode] * 60;
  const fresh = (mode, cycleDone = 0) => ({ mode, status: 'idle', remaining: duration(mode), endAt: 0, cycleDone });
  const persist = () => SF.saveTimer(timer);

  function init() {
    settings = SF.settings();
    timer = SF.getTimer();
    if (!timer || !MODES[timer.mode]) timer = fresh('focus');

    if (timer.status === 'running') {
      timer.remaining = Math.ceil((timer.endAt - Date.now()) / 1000);
      if (timer.remaining <= 0) advance(true, false);
      else startTick();
    } else if (timer.status === 'paused') {
      startBlink();
    }

    // Iconos de los botones y de la configuración.
    $('btnPlay').innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>`;
    $('btnPause').innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="4" width="4.5" height="16" rx="1"/><rect x="14" y="4" width="4.5" height="16" rx="1"/></svg>`;
    $('btnReset').innerHTML = `${icon('refresh')}Reiniciar`;
    $('btnSkip').innerHTML = `Saltar${icon('skip')}`;
    document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); });

    $('btnPlay').addEventListener('click', play);
    $('btnPause').addEventListener('click', pause);
    $('btnReset').addEventListener('click', reset);
    $('btnSkip').addEventListener('click', () => advance(false, false));

    document.querySelectorAll('[data-step]').forEach((button) => {
      button.addEventListener('click', () => changeSetting(button.dataset.step, Number(button.dataset.dir)));
    });
    document.querySelectorAll('[data-pref]').forEach((button) => {
      button.addEventListener('click', () => togglePref(button));
    });

    renderSettings();
    render();
    document.addEventListener('sf:change', renderSummary);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) syncFromClock(); });
    window.addEventListener('pagehide', persist);
  }

  /* ---------- Acciones ---------- */
  function play() {
    if (timer.status === 'running') return;
    prepareAudio();
    timer.endAt = Date.now() + timer.remaining * 1000;
    timer.status = 'running';
    stopBlink();
    startTick();
    persist();
    render();
  }

  function pause() {
    if (timer.status !== 'running') return;
    timer.remaining = Math.max(1, Math.ceil((timer.endAt - Date.now()) / 1000));
    timer.status = 'paused';
    stopTick();
    startBlink();
    persist();
    render();
  }

  function reset() {
    stopTick();
    stopBlink();
    timer = fresh(timer.mode, timer.cycleDone);
    persist();
    render();
  }

  /** Pasa al siguiente modo. completed=true registra la sesión de enfoque. */
  function advance(completed, allowAuto = true) {
    stopTick();
    stopBlink();

    let next;
    let cycleDone = timer.cycleDone;

    if (timer.mode === 'focus') {
      if (completed) {
        SF.recordSession(settings.focus);
        cycleDone += 1;
      }
      next = completed && cycleDone >= settings.cycles ? 'long' : 'short';
    } else {
      next = 'focus';
      if (timer.mode === 'long') cycleDone = 0;
    }

    const finishedMode = timer.mode;
    timer = fresh(next, cycleDone);
    persist();
    render();

    if (completed) {
      const message = finishedMode === 'focus' ? '¡Sesión de enfoque completada!' : 'Descanso terminado. ¡A estudiar!';
      UI.toast(message);
      if (settings.sound) beep();
      if (settings.notify && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('StudyFlow', { body: message });
      }
      if (settings.auto && allowAuto) play();
    }
  }

  /* ---------- Reloj ---------- */
  function startTick() {
    stopTick();
    tickId = setInterval(tick, 250);
  }

  function stopTick() {
    if (tickId) clearInterval(tickId);
    tickId = null;
  }

  function tick() {
    const remaining = Math.ceil((timer.endAt - Date.now()) / 1000);
    if (remaining <= 0) {
      timer.remaining = 0;
      advance(true);
      return;
    }
    if (remaining !== timer.remaining) {
      timer.remaining = remaining;
      renderTimer();
    }
  }

  function syncFromClock() {
    if (timer.status === 'running') tick();
  }

  function startBlink() {
    stopBlink();
    if (reducedMotion) return;
    blinkId = setInterval(() => { showDash = !showDash; renderTimer(); }, 600);
  }

  function stopBlink() {
    if (blinkId) clearInterval(blinkId);
    blinkId = null;
    showDash = false;
  }

  /* ---------- Render ---------- */
  const format = (seconds) => `${SF.pad(Math.floor(seconds / 60))}:${SF.pad(seconds % 60)}`;

  function renderTimer() {
    const text = format(timer.remaining);
    const dashed = timer.status === 'paused' && showDash;
    $('timerDisplay').innerHTML = segmentDisplay(dashed ? '--:--' : text);
    $('timerDisplay').setAttribute('aria-label', `Tiempo restante ${Math.floor(timer.remaining / 60)} minutos y ${timer.remaining % 60} segundos`);

    const elapsed = timer.status === 'idle' ? 0 : 1 - timer.remaining / duration(timer.mode);
    $('ringProgress').style.strokeDashoffset = String(CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, elapsed))));

    document.title = timer.status === 'running' ? `${text} — Pomodoro | StudyFlow` : 'Pomodoro — StudyFlow';
  }

  function render() {
    $('modeLabel').textContent = MODES[timer.mode].label;
    $('sessionLabel').textContent = timer.mode === 'focus'
      ? `Sesión ${Math.min(timer.cycleDone + 1, settings.cycles)} de ${settings.cycles}`
      : 'Momento de descansar';
    $('btnPlay').disabled = timer.status === 'running';
    $('btnPause').disabled = timer.status !== 'running';
    $('btnPlay').setAttribute('aria-label', timer.status === 'paused' ? 'Reanudar' : 'Iniciar');
    renderTimer();
    renderSummary();
  }

  function renderSummary() {
    const done = SF.sessionsToday();
    const goal = settings.dailyGoal;
    const percent = Math.min(100, Math.round((done / goal) * 100));
    const streak = SF.streak();

    $('sumTime').textContent = SF.formatMinutes(SF.minutesToday());
    $('sumSessions').textContent = `${done}/${goal}`;
    $('sumStreak').textContent = `${streak} ${streak === 1 ? 'día' : 'días'}`;
    $('sumBreak').textContent = timer.mode === 'focus' ? `${Math.ceil(timer.remaining / 60)} min` : 'En descanso';
    $('sumPercent').textContent = `${percent}%`;
    $('sumBar').value = percent;
    $('sumGoalText').textContent = `${done} de ${goal} sesiones completadas`;
  }

  /* ---------- Configuración ---------- */
  function renderSettings() {
    Object.keys(LIMITS).forEach((key) => {
      $(`val-${key}`).textContent = SF.pad(settings[key]);
    });
    document.querySelectorAll('[data-pref]').forEach((button) => {
      button.setAttribute('aria-checked', String(Boolean(settings[button.dataset.pref])));
    });
  }

  function changeSetting(key, dir) {
    const limit = LIMITS[key];
    const value = Math.min(limit.max, Math.max(limit.min, settings[key] + dir * limit.step));
    if (value === settings[key]) return;

    SF.saveSettings({ [key]: value });
    settings = SF.settings();
    renderSettings();

    // La nueva duración se aplica de inmediato si el temporizador está detenido.
    if (timer.status === 'idle' && key === timer.mode) {
      timer.remaining = duration(timer.mode);
      persist();
    }
    render();
  }

  async function togglePref(button) {
    const key = button.dataset.pref;
    const next = !settings[key];

    if (key === 'notify' && next) {
      if (!('Notification' in window)) { UI.toast('Tu navegador no admite notificaciones.', 'error'); return; }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { UI.toast('Permiso de notificaciones denegado.', 'error'); return; }
    }

    SF.saveSettings({ [key]: next });
    settings = SF.settings();
    renderSettings();
    if (key === 'sound' && next) { prepareAudio(); beep(); }
  }

  /* ---------- Sonido ---------- */
  function prepareAudio() {
    if (audio || !settings.sound) return;
    try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (error) { audio = null; }
  }

  function beep() {
    prepareAudio();
    if (!audio) return;
    [0, 0.28, 0.56].forEach((offset) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const start = audio.currentTime + offset;
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
      osc.connect(gain).connect(audio.destination);
      osc.start(start);
      osc.stop(start + 0.22);
    });
  }
})();
