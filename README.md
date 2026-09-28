# StudyFlow

Plataforma de productividad académica para universitarios: Pomodoro, gestión
de materias y tareas, estadísticas, logros y metas semanales.

Este proyecto es un **prototipo de diseño y maquetación** basado en el diseño de
Figma de StudyFlow. No incluye backend, base de datos ni autenticación real.

## Tecnologías

- HTML5 semántico
- CSS3 (variables, Flexbox, Grid, media queries)
- JavaScript vanilla (sin frameworks ni librerías)

## Estructura del proyecto

```
StudyFlow/
│
├── index.html                  Punto de entrada (redirige a html/inicio.html)
│
├── html/
│   ├── inicio.html              Landing page (hero, características, testimonio)
│   ├── iniciar-sesion.html      Iniciar sesión (con Google / Microsoft simulados)
│   ├── crear-cuenta.html        Crear cuenta (con Google / Microsoft simulados)
│   ├── recuperar-contrasena.html  Olvidé mi contraseña
│   ├── terminos.html            Términos y condiciones (placeholder)
│   ├── dashboard.html           Panel principal (Inicio)
│   ├── tareas.html              Mis Tareas: crear, editar, subtareas, filtros
│   ├── materias.html            Materias: crear, editar, progreso
│   ├── pomodoro.html            Temporizador Pomodoro y resumen del día
│   ├── calendario.html          Calendario con detalle del día
│   └── perfil.html              Mi perfil y seguridad (contraseña)
│
├── css/
│   ├── styles.css               General: variables, reset, accesibilidad, botones, navbar, footer
│   ├── inicio.css               Landing: hero, mockup, características, testimonio
│   ├── components.css           Compartido: stats, formularios, modal, pestañas, chips, avisos
│   ├── auth.css                 Iniciar sesión / crear cuenta / recuperar contraseña
│   ├── app.css                  App: sidebar, barra superior, menús desplegables
│   ├── calendar.css              Componente calendario (reutilizado en dashboard y Calendario)
│   ├── dashboard.css            Dashboard: sesión, progreso, materias, tareas
│   ├── tareas.css               Mis Tareas: tarjetas, filtros, columna lateral
│   ├── materias.css             Materias: tarjetas y selector de ícono/color
│   ├── pomodoro.css             Pomodoro: temporizador, configuración, resumen
│   ├── calendario.css           Página Calendario: layout y panel del día
│   └── perfil.css               Mi perfil: tarjeta y formularios
│
├── js/
│   ├── icons.js                 Iconos SVG reutilizables
│   ├── store.js                 Capa de datos: cuentas, sesión, materias, tareas y Pomodoro (localStorage)
│   ├── ui.js                    Utilidades: avisos, diálogos, validación de formularios
│   ├── main.js                  Landing: menú móvil, scroll suave
│   ├── auth.js                  Iniciar sesión, crear cuenta, recuperar contraseña, Google/Microsoft
│   ├── app.js                   App: sidebar, buscador, notificaciones, cerrar sesión
│   ├── dashboard.js             Panel principal
│   ├── tareas.js                Mis Tareas
│   ├── materias.js              Materias
│   ├── pomodoro.js              Temporizador Pomodoro
│   ├── calendar.js              Componente calendario
│   ├── calendario.js            Página Calendario (panel del día)
│   └── perfil.js                Mi perfil y seguridad
│
├── assets/
│   ├── images/
│   ├── icons/                   favicon.svg
│   └── logo/                    studyflow-mark.svg
│
└── README.md
```

## Cómo ejecutarlo localmente

1. Abre la carpeta `StudyFlow/` en Visual Studio Code.
2. Instala la extensión **Live Server**.
3. Clic derecho sobre `index.html` → **Open with Live Server**.

`index.html` redirige a `html/inicio.html`. Todas las rutas son relativas, por lo
que también funciona en GitHub Pages u otro hosting estático (incluso si el sitio
se publica en una subcarpeta).

## Cómo funciona (todo en el navegador, sin backend)

Es un prototipo: no hay servidor ni base de datos. Todo se guarda en `localStorage`,
por cuenta (identificada por su correo). Los datos de una cuenta nunca se mezclan con
los de otra, y **una cuenta nueva siempre empieza en cero**: sin materias, sin tareas,
sin sesiones de Pomodoro.

- **Crear cuenta** (`crear-cuenta.html`): nombre, correo y contraseña (mínimo 8
  caracteres), con validación en pantalla. Los botones de **Google** y **Microsoft**
  simulan el acceso: piden un correo (y opcionalmente un nombre) y crean o inician la
  cuenta con ese correo — no se conectan a un proveedor real.
- **Iniciar sesión** (`iniciar-sesion.html`): valida contra la cuenta guardada.
  **¿Olvidaste tu contraseña?** lleva a `recuperar-contrasena.html`, donde se verifica
  el correo y se define una nueva contraseña directamente (aquí no hay envío real de
  correos: es la simulación equivalente dentro de un prototipo sin backend).
- Visitar cualquier página interna (`dashboard.html`, `tareas.html`, etc.) sin sesión
  iniciada redirige automáticamente a `iniciar-sesion.html`.
- **Cerrar sesión** está al final del menú lateral en todas las páginas internas.
- **Ver Demo** en la landing (`dashboard.html?demo=1`) crea, solo si no hay ninguna
  sesión activa, una cuenta de ejemplo con materias, tareas y racha ya cargadas —así
  se ve StudyFlow "en uso" sin afectar cuentas reales.

## Navegación entre páginas

- Landing → **Iniciar Sesión** abre `iniciar-sesion.html`; **Comenzar Gratis** /
  **Comienza Gratis** abren `crear-cuenta.html`; **Ver Demo** abre el panel con datos
  de ejemplo.
- El sidebar de las páginas internas conecta Inicio, Tareas, Calendario, Pomodoro,
  Materias y Perfil entre sí, más **Cerrar sesión**.
- El buscador de la barra superior busca en tareas y materias en tiempo real.
- La campana muestra recordatorios (tareas vencidas, de hoy y de mañana).

## Datos de ejemplo (solo en la cuenta Demo)

La cuenta creada por **Ver Demo** usa la fecha de prototipo **5 de agosto de 2026**
como referencia y materias/tareas de ejemplo, definidas en `js/store.js`
(función `demoData`). Cualquier otra cuenta empieza completamente vacía.

## Añadir una página nueva

1. Copia una página existente similar (por ejemplo `materias.html`) como base en `html/`.
2. Si necesita estilos propios, crea `css/<pagina>.css` y añádelo al `<head>`.
3. Si necesita lógica propia, crea `js/<pagina>.js` (usa `SF.onReady(...)` para esperar
   los datos) y añádelo antes de `</body>`.
4. En `js/app.js`, agrega la entrada correspondiente al arreglo `NAV` para que el
   enlace del sidebar apunte a la nueva página.

## Prototipo de Figma

`https://www.figma.com/design/s1VlpQj5Kp7ybpq2Xs0jR0/Studyflow`
