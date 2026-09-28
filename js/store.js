/* =========================================================
   StudyFlow — Capa de datos (prototipo sin backend)
   Cuentas, sesión, materias, tareas y Pomodoro guardados en localStorage.
   Cada cuenta tiene sus propios datos: una cuenta nueva empieza desde cero.

   AVISO: es una simulación para el prototipo. En un proyecto real la
   autenticación y los datos deben vivir en un servidor.
   ========================================================= */

window.SF = (() => {
  'use strict';

  const KEYS = {
    accounts: 'studyflow:accounts',
    session: 'studyflow:session',
    data: (email) => `studyflow:data:${email}`
  };

  const COLORS = ['red', 'blue', 'amber', 'purple', 'green', 'sky', 'pink'];
  const EMOJIS = ['📚', '📐', '⚛️', '🧪', '💻', '📜', '🎨', '🌎'];
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const PRIORITY = {
    high: { label: 'Alta', tone: 'red', weight: 3 },
    medium: { label: 'Media', tone: 'amber', weight: 2 },
    low: { label: 'Baja', tone: 'green', weight: 1 }
  };

  /* ---------- Utilidades ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const norm = (email) => String(email || '').trim().toLowerCase();

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  const toKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const fromKey = (key) => {
    const [y, m, d] = String(key).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };
  const todayKey = () => toKey(new Date());
  const addDays = (key, n) => {
    const d = fromKey(key);
    d.setDate(d.getDate() + n);
    return toKey(d);
  };

  function emit() {
    document.dispatchEvent(new CustomEvent('sf:change'));
  }

  /* ---------- Contraseñas (hash simulado en el navegador) ---------- */
  async function hashPassword(password, salt) {
    const text = `${salt}:${password}`;
    if (window.crypto && window.crypto.subtle) {
      const buffer = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let hash = 5381;
    for (const char of text) hash = (((hash << 5) + hash) + char.charCodeAt(0)) >>> 0;
    return `x${hash.toString(16)}`;
  }

  /* ---------- Cuentas y sesión ---------- */
  const accounts = () => read(KEYS.accounts, {});
  const account = (email) => accounts()[norm(email)] || null;

  function saveAccount(acc) {
    const all = accounts();
    all[acc.email] = acc;
    write(KEYS.accounts, all);
  }

  async function register({ fullName, email, password, provider = 'email' }) {
    email = norm(email);
    if (account(email)) throw new Error('exists');

    const salt = uid();
    const [name, ...rest] = String(fullName || '').trim().split(/\s+/);
    const acc = {
      email,
      name: name || '',
      lastName: rest.join(' '),
      university: '',
      career: '',
      semester: '',
      avatar: '',
      provider,
      createdAt: new Date().toISOString(),
      salt,
      passHash: password ? await hashPassword(password, salt) : null
    };

    saveAccount(acc);
    write(KEYS.data(email), emptyData());
    login(email);
    return acc;
  }

  async function authenticate(email, password) {
    const acc = account(email);
    if (!acc || !acc.passHash) return null;
    const hash = await hashPassword(password, acc.salt);
    return hash === acc.passHash ? acc : null;
  }

  async function checkPassword(password) {
    const acc = currentUser();
    if (!acc || !acc.passHash) return false;
    return (await hashPassword(password, acc.salt)) === acc.passHash;
  }

  async function setPassword(email, password) {
    const acc = account(email);
    if (!acc) return false;
    acc.salt = uid();
    acc.passHash = await hashPassword(password, acc.salt);
    saveAccount(acc);
    return true;
  }

  function updateAccount(patch) {
    const acc = currentUser();
    if (!acc) return null;
    const updated = { ...acc, ...patch };
    saveAccount(updated);
    emit();
    return updated;
  }

  const login = (email) => write(KEYS.session, norm(email));

  function logout() {
    try { localStorage.removeItem(KEYS.session); } catch (error) { /* sin acceso a storage */ }
  }

  function currentUser() {
    const email = read(KEYS.session, null);
    return email ? account(email) : null;
  }

  function requireUser() {
    const user = currentUser();
    if (!user) {
      window.location.replace('iniciar-sesion.html');
      return null;
    }
    return user;
  }

  const fullName = (acc) => [acc.name, acc.lastName].filter(Boolean).join(' ') || acc.email;
  const initials = (acc) => {
    const letters = [acc.name, acc.lastName].filter(Boolean).map((part) => part.trim()[0]).join('').slice(0, 2);
    return (letters || acc.email[0] || '?').toUpperCase();
  };

  /* ---------- Datos por cuenta ---------- */
  const defaultSettings = () => ({ focus: 25, short: 5, long: 20, cycles: 4, dailyGoal: 4, sound: false, notify: false, auto: false });
  const emptyData = () => ({ subjects: [], tasks: [], pomodoro: { settings: defaultSettings(), sessions: [], timer: null } });

  function data() {
    const acc = currentUser();
    const base = emptyData();
    if (!acc) return base;
    const stored = read(KEYS.data(acc.email), base);
    return {
      subjects: stored.subjects || [],
      tasks: stored.tasks || [],
      pomodoro: {
        settings: { ...base.pomodoro.settings, ...((stored.pomodoro || {}).settings || {}) },
        sessions: (stored.pomodoro || {}).sessions || [],
        timer: (stored.pomodoro || {}).timer || null
      }
    };
  }

  function save(d, silent) {
    const acc = currentUser();
    if (!acc) return;
    write(KEYS.data(acc.email), d);
    if (!silent) emit();
  }

  function update(mutator, silent) {
    const d = data();
    const result = mutator(d);
    save(d, silent);
    return result;
  }

  /* ---------- Materias ---------- */
  const subjects = () => data().subjects;
  const subjectById = (id) => data().subjects.find((s) => s.id === id) || null;

  function addSubject({ name, emoji, color }) {
    return update((d) => {
      const subject = { id: uid(), name: name.trim(), emoji: emoji || EMOJIS[0], color: color || COLORS[0], createdAt: Date.now() };
      d.subjects.push(subject);
      return subject;
    });
  }

  function updateSubject(id, patch) {
    update((d) => {
      const subject = d.subjects.find((s) => s.id === id);
      if (subject) Object.assign(subject, patch);
    });
  }

  function removeSubject(id) {
    update((d) => {
      d.subjects = d.subjects.filter((s) => s.id !== id);
      d.tasks = d.tasks.filter((t) => t.subjectId !== id);
    });
  }

  /* ---------- Tareas ---------- */
  const tasks = () => data().tasks;
  const taskById = (id) => data().tasks.find((t) => t.id === id) || null;

  function addTask({ title, subjectId = '', priority = 'medium', dueDate = '', dueTime = '', tags = [], notes = '' }) {
    return update((d) => {
      const task = {
        id: uid(),
        title: title.trim(),
        subjectId,
        priority,
        dueDate,
        dueTime,
        tags,
        notes,
        subtasks: [],
        done: false,
        completedAt: null,
        createdAt: Date.now()
      };
      d.tasks.push(task);
      return task;
    });
  }

  function updateTask(id, patch) {
    update((d) => {
      const task = d.tasks.find((t) => t.id === id);
      if (task) Object.assign(task, patch);
    });
  }

  function removeTask(id) {
    update((d) => { d.tasks = d.tasks.filter((t) => t.id !== id); });
  }

  function toggleTask(id) {
    return update((d) => {
      const task = d.tasks.find((t) => t.id === id);
      if (!task) return null;
      task.done = !task.done;
      task.completedAt = task.done ? new Date().toISOString() : null;
      return task;
    });
  }

  function addSubtask(taskId, text) {
    update((d) => {
      const task = d.tasks.find((t) => t.id === taskId);
      if (task) task.subtasks.push({ id: uid(), text: text.trim(), done: false });
    });
  }

  function toggleSubtask(taskId, subId) {
    update((d) => {
      const task = d.tasks.find((t) => t.id === taskId);
      const sub = task && task.subtasks.find((s) => s.id === subId);
      if (sub) sub.done = !sub.done;
    });
  }

  function removeSubtask(taskId, subId) {
    update((d) => {
      const task = d.tasks.find((t) => t.id === taskId);
      if (task) task.subtasks = task.subtasks.filter((s) => s.id !== subId);
    });
  }

  /** Fecha y hora límite como Date (hora por defecto: 23:59). */
  function dueDateTime(task) {
    if (!task.dueDate) return null;
    const date = fromKey(task.dueDate);
    const [h, m] = (task.dueTime || '23:59').split(':').map(Number);
    date.setHours(h || 0, m || 0, 0, 0);
    return date;
  }

  const isOverdue = (task) => !task.done && !!task.dueDate && dueDateTime(task) < new Date();

  function taskFraction(task) {
    if (task.done) return 1;
    if (!task.subtasks.length) return 0;
    return task.subtasks.filter((s) => s.done).length / task.subtasks.length;
  }

  function formatDue(task) {
    if (!task.dueDate) return 'Sin fecha';
    const today = todayKey();
    const time = task.dueTime ? `, ${task.dueTime}` : '';
    if (task.dueDate === today) return `Hoy${time}`;
    if (task.dueDate === addDays(today, 1)) return `Mañana${time}`;
    const d = fromKey(task.dueDate);
    const year = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '';
    return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${year}${time}`;
  }

  /** Orden por fecha límite (sin fecha al final). */
  function byDue(a, b) {
    const da = dueDateTime(a);
    const db = dueDateTime(b);
    if (da && db) return da - db;
    if (da) return -1;
    if (db) return 1;
    return a.createdAt - b.createdAt;
  }

  function counts() {
    const list = tasks();
    const today = todayKey();
    return {
      pending: list.filter((t) => !t.done).length,
      completed: list.filter((t) => t.done).length,
      overdue: list.filter(isOverdue).length,
      today: list.filter((t) => !t.done && t.dueDate === today).length
    };
  }

  function subjectStats(subjectId) {
    const d = data();
    const list = d.tasks.filter((t) => t.subjectId === subjectId);
    const done = list.filter((t) => t.done).length;
    const progress = list.length ? Math.round((list.reduce((sum, t) => sum + taskFraction(t), 0) / list.length) * 100) : 0;
    return { total: list.length, done, pending: list.length - done, progress };
  }

  /** Progreso del día: tareas con fecha de hoy o completadas hoy. */
  function daySummary() {
    const today = todayKey();
    const list = tasks().filter((t) => t.dueDate === today || (t.completedAt && toKey(new Date(t.completedAt)) === today));
    const percent = list.length ? Math.round((list.reduce((sum, t) => sum + taskFraction(t), 0) / list.length) * 100) : 0;
    return { total: list.length, percent };
  }

  const completedToday = () => tasks().filter((t) => t.completedAt && toKey(new Date(t.completedAt)) === todayKey()).length;

  /** Recordatorios derivados de las tareas (vencidas, de hoy y de mañana). */
  function reminders() {
    const today = todayKey();
    const tomorrow = addDays(today, 1);
    const out = [];
    tasks().filter((t) => !t.done).sort(byDue).forEach((t) => {
      if (isOverdue(t)) out.push({ kind: 'overdue', task: t, text: `Tarea vencida: ${t.title}` });
      else if (t.dueDate === today) out.push({ kind: 'today', task: t, text: `Entrega de «${t.title}» hoy${t.dueTime ? ` a las ${t.dueTime}` : ''}` });
      else if (t.dueDate === tomorrow) out.push({ kind: 'tomorrow', task: t, text: `«${t.title}» vence mañana${t.dueTime ? ` a las ${t.dueTime}` : ''}` });
    });
    return out;
  }

  /* ---------- Pomodoro ---------- */
  const settings = () => data().pomodoro.settings;

  function saveSettings(patch) {
    update((d) => { Object.assign(d.pomodoro.settings, patch); }, true);
  }

  function recordSession(minutes) {
    update((d) => {
      d.pomodoro.sessions.push({ date: todayKey(), minutes, at: Date.now() });
    });
  }

  const sessionsOn = (key) => data().pomodoro.sessions.filter((s) => s.date === key);
  const sessionsToday = () => sessionsOn(todayKey()).length;
  const minutesToday = () => sessionsOn(todayKey()).reduce((sum, s) => sum + s.minutes, 0);

  function streak() {
    const days = new Set(data().pomodoro.sessions.map((s) => s.date));
    let cursor = todayKey();
    if (!days.has(cursor)) cursor = addDays(cursor, -1);
    let count = 0;
    while (days.has(cursor)) {
      count += 1;
      cursor = addDays(cursor, -1);
    }
    return count;
  }

  const getTimer = () => data().pomodoro.timer;
  const saveTimer = (timer) => update((d) => { d.pomodoro.timer = timer; }, true);

  const isNewUser = () => {
    const d = data();
    return !d.tasks.length && !d.subjects.length && !d.pomodoro.sessions.length;
  };

  function formatHours(minutes) {
    if (!minutes) return '0 h';
    return `${Math.round((minutes / 60) * 10) / 10} h`;
  }

  function formatMinutes(minutes) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return h ? `${h}h ${pad(m)}m` : `${m}m`;
  }

  /* ---------- Datos de demostración ---------- */
  function demoData() {
    const today = todayKey();
    const mk = (name, emoji, color, offset) => ({ id: uid(), name, emoji, color, createdAt: Date.now() + offset });
    const calc = mk('Cálculo Diferencial', '📐', 'red', 0);
    const fis = mk('Física General II', '⚛️', 'blue', 1);
    const his = mk('Historia Universal', '📜', 'amber', 2);
    const lit = mk('Literatura Contemporánea', '📚', 'purple', 3);
    const qui = mk('Química Orgánica', '🧪', 'green', 4);
    const pro = mk('Programación Avanzada', '💻', 'sky', 5);

    const subs = (list, doneCount) => list.map((text, i) => ({ id: uid(), text, done: i < doneCount }));
    const task = (title, subject, priority, offset, time, tags, subtasks, extra = {}) => ({
      id: uid(), title, subjectId: subject.id, priority,
      dueDate: offset === null ? '' : addDays(today, offset), dueTime: time, tags, notes: '',
      subtasks, done: false, completedAt: null, createdAt: Date.now() + Math.random() * 1000, ...extra
    });
    const doneNow = { done: true, completedAt: new Date().toISOString() };

    const sessions = [{ date: today, minutes: 52, at: Date.now() }, { date: today, minutes: 53, at: Date.now() }];
    for (let i = 1; i <= 6; i += 1) sessions.push({ date: addDays(today, -i), minutes: 25, at: Date.now() });

    return {
      subjects: [calc, fis, his, lit, qui, pro],
      tasks: [
        task('Tarea de Cálculo Diferencial', calc, 'high', 0, '23:59', ['Parcial', 'Cálculo'], subs(['Ejercicios del Capítulo 4', 'Límites laterales', 'Derivadas básicas', 'Regla de la cadena', 'Repaso final'], 3)),
        task('Leer capítulos 5-7 de Historia', his, 'medium', 1, '09:00', ['Lectura'], subs(['Capítulo 5', 'Capítulo 6', 'Capítulo 7'], 1)),
        task('Ejercicios de Química Orgánica', qui, 'medium', 3, '20:00', ['Lab'], subs(['Nomenclatura', 'Isomería', 'Reacciones', 'Guía de laboratorio'], 0)),
        task('Ensayo de Literatura Contemporánea', lit, 'low', 6, '', ['Ensayo', 'Entrega'], []),
        task('Preparar exposición de Historia', his, 'high', 10, '', ['Exposición'], subs(['Tema', 'Fuentes', 'Guion', 'Diapositivas', 'Ensayo general', 'Presentación'], 1)),
        task('Resolver guía de Física', fis, 'medium', -1, '18:00', ['Guía'], [], doneNow),
        task('Quiz de Programación', pro, 'low', 0, '10:00', ['Quiz'], [], doneNow),
        task('Informe de laboratorio', qui, 'high', -2, '', ['Lab'], [], doneNow)
      ],
      pomodoro: { settings: defaultSettings(), sessions, timer: null }
    };
  }

  async function startDemo() {
    const email = 'sofia.martinez@unimilitar.edu.co';
    const salt = 'demo';
    saveAccount({
      email,
      name: 'Sofía',
      lastName: 'Martínez Rojas',
      university: 'Universidad Militar Nueva Granada',
      career: 'Ingeniería en Sistemas Computacionales',
      semester: '5',
      avatar: '',
      provider: 'demo',
      createdAt: '2026-08-01T12:00:00.000Z',
      salt,
      passHash: await hashPassword('demo1234', salt)
    });
    write(KEYS.data(email), demoData());
    login(email);
  }

  /* ---------- Arranque de página ---------- */
  const ready = (async () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === '1') {
      if (!currentUser()) await startDemo();
      params.delete('demo');
      const query = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash);
    }
  })();

  const domReady = new Promise((resolve) => {
    if (document.readyState !== 'loading') resolve();
    else document.addEventListener('DOMContentLoaded', resolve, { once: true });
  });

  const onReady = (fn) => Promise.all([ready, domReady]).then(fn);

  window.addEventListener('storage', (event) => {
    if (event.key && event.key.startsWith('studyflow:')) emit();
  });

  return {
    COLORS, EMOJIS, MONTHS, MONTHS_SHORT, WEEKDAYS, PRIORITY,
    esc, uid, pad, toKey, fromKey, todayKey, addDays, onReady,
    register, authenticate, checkPassword, setPassword, updateAccount, account, login, logout, currentUser, requireUser, fullName, initials,
    data, subjects, subjectById, addSubject, updateSubject, removeSubject,
    tasks, taskById, addTask, updateTask, removeTask, toggleTask, addSubtask, toggleSubtask, removeSubtask,
    dueDateTime, isOverdue, taskFraction, formatDue, byDue, counts, subjectStats, daySummary, completedToday, reminders,
    settings, saveSettings, recordSession, sessionsToday, minutesToday, streak, getTimer, saveTimer,
    isNewUser, formatHours, formatMinutes, startDemo
  };
})();
