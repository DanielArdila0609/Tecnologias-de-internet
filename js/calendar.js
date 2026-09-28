/* =========================================================
   StudyFlow — Calendario
   Renderiza el mes, permite navegar entre meses y seleccionar días.
   Los datos son de ejemplo (maqueta): fecha "hoy" = 5 de agosto de 2026.
   ========================================================= */

(() => {
  const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const SUBJECTS = {
    calculo: 'Cálculo Diferencial',
    fisica: 'Física General II',
    historia: 'Historia Universal',
    literatura: 'Literatura Contemporánea',
    quimica: 'Química Orgánica',
    programacion: 'Programación Avanzada'
  };

  // Fechas con tareas programadas (clave: AAAA-MM-DD).
  const EVENTS = {
    '2026-08-03': ['quimica'],
    '2026-08-04': ['calculo', 'quimica'],
    '2026-08-06': ['fisica'],
    '2026-08-08': ['historia'],
    '2026-08-11': ['quimica'],
    '2026-08-13': ['literatura'],
    '2026-08-18': ['programacion', 'literatura'],
    '2026-08-22': ['calculo'],
    '2026-08-25': ['literatura']
  };

  const PROTOTYPE_TODAY = new Date(2026, 7, 5);

  const pad = (n) => String(n).padStart(2, '0');
  const toKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const isSameDay = (a, b) => toKey(a) === toKey(b);

  document.querySelectorAll('[data-calendar]').forEach(initCalendar);

  function initCalendar(root) {
    const showEvents = root.dataset.events !== 'off';
    const grid = root.querySelector('[data-cal-grid]');
    const monthLabel = root.querySelector('[data-cal-month]');
    const yearLabel = root.querySelector('[data-cal-year]');
    const prev = root.querySelector('[data-cal-prev]');
    const next = root.querySelector('[data-cal-next]');

    let view = new Date(PROTOTYPE_TODAY.getFullYear(), PROTOTYPE_TODAY.getMonth(), 1);
    let selected = new Date(PROTOTYPE_TODAY);

    function render() {
      monthLabel.textContent = MONTHS[view.getMonth()];
      yearLabel.textContent = view.getFullYear();
      grid.replaceChildren();

      const year = view.getFullYear();
      const month = view.getMonth();
      const offset = new Date(year, month, 1).getDay();

      // Siempre 6 semanas (42 celdas), como en el diseño.
      for (let i = 0; i < 42; i++) {
        const date = new Date(year, month, i - offset + 1);
        grid.appendChild(date.getMonth() === month ? createDay(date) : createOutsideDay(date));
      }
    }

    function createOutsideDay(date) {
      const cell = document.createElement('span');
      cell.className = 'calendar__day is-outside';
      cell.setAttribute('aria-hidden', 'true');
      cell.textContent = date.getDate();
      return cell;
    }

    function createDay(date) {
      const key = toKey(date);
      const events = showEvents ? EVENTS[key] || [] : [];
      const isToday = isSameDay(date, PROTOTYPE_TODAY);
      const isSelected = isSameDay(date, selected);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'calendar__day';
      if (isToday) button.classList.add('is-today');
      else if (isSelected) button.classList.add('is-selected');
      button.dataset.date = key;
      button.setAttribute('aria-pressed', String(isSelected));

      let label = `${date.getDate()} de ${MONTHS[date.getMonth()].toLowerCase()} de ${date.getFullYear()}`;
      if (events.length) label += `, ${events.length} ${events.length === 1 ? 'tarea programada' : 'tareas programadas'}`;
      button.setAttribute('aria-label', label);

      button.append(String(date.getDate()));

      if (events.length) {
        const dots = document.createElement('span');
        dots.className = 'calendar__dots';
        dots.setAttribute('aria-hidden', 'true');
        events.forEach((subject) => {
          const dot = document.createElement('span');
          dot.className = `dot-subject dot-subject--${subject}`;
          dots.appendChild(dot);
        });
        button.appendChild(dots);
      }

      return button;
    }

    function changeMonth(delta) {
      view = new Date(view.getFullYear(), view.getMonth() + delta, 1);
      render();
    }

    prev.addEventListener('click', () => changeMonth(-1));
    next.addEventListener('click', () => changeMonth(1));

    grid.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-date]');
      if (!button) return;

      const [y, m, d] = button.dataset.date.split('-').map(Number);
      selected = new Date(y, m - 1, d);
      render();

      const active = grid.querySelector(`button[data-date="${button.dataset.date}"]`);
      if (active) active.focus();

      root.dispatchEvent(new CustomEvent('calendar:select', {
        bubbles: true,
        detail: { date: selected, events: showEvents ? EVENTS[toKey(selected)] || [] : [] }
      }));
    });

    render();
  }

  // Panel lateral con el detalle del día (solo en la página Calendario).
  const panel = document.querySelector('[data-day-panel]');

  if (panel) {
    const weekday = panel.querySelector('[data-day-weekday]');
    const dateLabel = panel.querySelector('[data-day-date]');
    const yearLabel = panel.querySelector('[data-day-year]');
    const empty = panel.querySelector('[data-day-empty]');
    const list = panel.querySelector('[data-day-list]');

    const update = (date, events) => {
      weekday.textContent = WEEKDAYS[date.getDay()];
      dateLabel.textContent = `${date.getDate()} de ${MONTHS[date.getMonth()].toLowerCase()}`;
      yearLabel.textContent = date.getFullYear();

      list.replaceChildren();
      events.forEach((subject) => {
        const item = document.createElement('li');
        item.className = 'day-panel__item';

        const dot = document.createElement('span');
        dot.className = `dot-subject dot-subject--${subject}`;
        dot.setAttribute('aria-hidden', 'true');

        item.append(dot, SUBJECTS[subject]);
        list.appendChild(item);
      });

      empty.hidden = events.length > 0;
    };

    update(PROTOTYPE_TODAY, EVENTS[toKey(PROTOTYPE_TODAY)] || []);
    document.addEventListener('calendar:select', (event) => update(event.detail.date, event.detail.events));
  }
})();
