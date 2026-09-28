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
│   ├── inicio.html             Landing page (hero, características, testimonio)
│   ├── dashboard.html          Panel del usuario que regresa ("Inicio de nuevo")
│   ├── dashboard-nuevo.html    Panel del usuario nuevo ("Crear cuenta")
│   └── calendario.html         Calendario con detalle del día
│
├── css/
│   ├── styles.css              General: variables, reset, accesibilidad, botones, navbar y footer
│   ├── inicio.css              Landing: hero, mockup, características, testimonio
│   ├── app.css                 App: sidebar, barra superior, tarjetas, barras, badges
│   ├── calendar.css            Componente calendario (dashboard y página Calendario)
│   ├── dashboard.css           Dashboard: sesión, estadísticas, progreso, materias, tareas
│   └── calendario.css          Página Calendario: layout y panel del día
│
├── js/
│   ├── main.js                 General: menú móvil de la landing, scroll suave
│   ├── app.js                  App: sidebar responsive, enlaces pendientes, buscador
│   └── calendar.js             Calendario: render del mes, navegación y día seleccionado
│
├── assets/
│   ├── images/
│   ├── icons/                  favicon.svg
│   └── logo/                   studyflow-mark.svg
│
└── README.md
```

### Qué CSS/JS carga cada página

| Página                  | CSS                                             | JS                            |
|-------------------------|-------------------------------------------------|-------------------------------|
| `inicio.html`           | `styles`, `inicio`                              | `main`                        |
| `dashboard.html`        | `styles`, `app`, `calendar`, `dashboard`        | `main`, `app`, `calendar`     |
| `dashboard-nuevo.html`  | `styles`, `app`, `calendar`, `dashboard`        | `main`, `app`, `calendar`     |
| `calendario.html`       | `styles`, `app`, `calendar`, `calendario`       | `main`, `app`, `calendar`     |

## Cómo ejecutarlo localmente

1. Abre la carpeta `StudyFlow/` en Visual Studio Code.
2. Instala la extensión **Live Server**.
3. Clic derecho sobre `index.html` → **Open with Live Server**.

`index.html` redirige a `html/inicio.html`. Todas las rutas son relativas, por lo
que también funciona en GitHub Pages u otro hosting estático (incluso si el sitio
se publica en una subcarpeta).

## Navegación entre páginas

- Landing → **Iniciar Sesión** y **Ver Demo** abren `dashboard.html`.
- Landing → **Comenzar Gratis** / **Comienza Gratis** abren `dashboard-nuevo.html`.
- Sidebar → **Inicio** y **Calendario** ya están conectados.

### Cómo agregar una página nueva

1. Crea `html/<pagina>.html` (puedes copiar `calendario.html` como base) y su CSS
   en `css/` solo si tiene estilos propios.
2. En el sidebar, cambia el `href="#"` del enlace correspondiente
   (Tareas, Pomodoro, Materias, Perfil) por `<pagina>.html`.
3. En la navbar de la landing (`html/inicio.html`) hay un bloque comentado con los
   enlaces futuros (Pomodoro, Materias, Tareas, Logros, Metas): descoméntalo.

## Datos de ejemplo

El calendario usa la fecha de prototipo **5 de agosto de 2026** como "hoy" y unas
tareas de ejemplo definidas en `js/calendar.js` (constante `EVENTS`).

## Prototipo de Figma

`https://www.figma.com/design/s1VlpQj5Kp7ybpq2Xs0jR0/Studyflow`
