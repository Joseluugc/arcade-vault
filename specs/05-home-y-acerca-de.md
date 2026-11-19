# SPEC 05 — Home y Acerca de

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-19
> **Objetivo:** Portar la home y la página Acerca de del prototipo `references/templates/home-about/` a la app, moviendo la Biblioteca a `/biblioteca`.

## Alcance

**Dentro:**

- Nueva home en `/` con todas las secciones de `home-about/home.jsx`: hero, "¿Por qué Arcade Vault?", juegos disponibles, estadísticas, actividad (últimas puntuaciones + top 5), precios con FAQ y CTA final.
- Mover la Biblioteca de `/` a `/biblioteca`.
- Nueva página `/acerca` con la misión, los destacados y el formulario de contacto de `home-about/about.jsx`. El formulario es solo visual.
- Nav con los enlaces Inicio, Biblioteca, Salón de la Fama y Acerca de, en escritorio y en el panel móvil.
- El Nav conserva el logo "ARCADE VAULT" arriba a la izquierda, el contador de créditos fijo y el botón "Iniciar Sesión" hacia `/auth`.
- Portar a `app/globals.css` las clases de `home-about/styles.css` que usan la home y Acerca de.
- Puntuaciones y actividad de prueba en un archivo de datos aparte.

**Fuera de alcance (para specs futuras):**

- Autenticación. `/auth` sigue respondiendo 404.
- Página `/salon` y persistencia de puntuaciones.
- Página de detalle de juego.
- Envío real del formulario de contacto. Necesita backend.
- Foro.
- Créditos reales que se consuman al jugar.
- Renombrar la app a "Home Vault".

## Modelo de datos

Datos de prueba para la sección Actividad. Viven en `games/activity.ts` y se sustituirán cuando exista la persistencia de puntuaciones.

```ts
// games/activity.ts
export interface RecentScore {
  player: string;      // "NEONFOX"
  gameId: string;      // id de GAMES, p. ej. "caida"
  score: number;
  ago: string;         // "hace 2 min"
}

export interface TopPlayer {
  player: string;
  score: number;
}

export const RECENT_SCORES: RecentScore[]; // 7 filas, copiadas de home.jsx
export const TOP_PLAYERS: TopPlayer[];     // 5 filas, ordenadas de mayor a menor
```

Convenciones:

- El título y el color del juego de cada fila salen de `GAMES` a través de `gameId`. No se duplican.
- Las cifras se formatean con `toLocaleString("es-ES")`.
- Los créditos son la constante `GUEST_CREDITS = 3` en `app/Nav.tsx`, su único consumidor. Se muestran como `CRÉDITOS · 03`.

## Rutas y enlaces

| Elemento | Destino |
| --- | --- |
| Logo del Nav, enlace "Inicio" | `/` |
| Enlace "Biblioteca", "▶ EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →", "INSERTAR MONEDA →" | `/biblioteca` |
| Enlace "Salón de la Fama" | `/#salon` (sección Actividad de la home) |
| Enlace "Acerca de" | `/acerca` |
| "Iniciar Sesión", "✦ CREAR CUENTA", "EMPEZAR GRATIS →" | `/auth` (404 hasta la spec de autenticación) |
| Mini-tarjeta de juego | `/jugar/[id]` |
| Botón "SALIR" del reproductor | `/biblioteca` |

Enlace activo del Nav:

- `/` → Inicio.
- `/biblioteca` y `/jugar/*` → Biblioteca.
- `/acerca` → Acerca de.
- Salón de la Fama no se marca como activo mientras sea un ancla.

## Contenido de la home

Se respeta el orden, las clases y los textos de `home.jsx`, con estos cambios:

- **Juegos disponibles:** los 6 primeros juegos de `GAMES` que estén en `GAME_REGISTRY`, en el orden del catálogo.
- **¿Por qué Arcade Vault?:** la tarjeta "JUEGOS CLÁSICOS" nombra juegos propios ("Bloque Buster, Caída, Serpentina…") en lugar de marcas reales.
- **Estadísticas:** el primer bloque muestra `GAMES.length` + "JUEGOS" en lugar de "12+".
- **Actividad:** la sección lleva `id="salon"`. El bloque "TOP JUGADORES · HOY" no muestra el botón "VER SALÓN →".
- Las secciones con la clase `.reveal` aparecen al entrar en pantalla mediante `IntersectionObserver`.
- Los enlaces son `<Link>` de Next.js, no `onClick` con `navigate`.

## Formulario de contacto

- Campos: nombre, correo electrónico (`type="email"`) y mensaje. Cada uno tiene un `<label>` asociado.
- Si falta algún campo al enviar, el formulario aplica la clase `.shake` durante 400 ms y no avanza.
- Con los tres campos rellenos, se sustituye por la terminal de éxito con el nombre en mayúsculas.
- "ENVIAR OTRO MENSAJE" vacía los campos y vuelve a mostrar el formulario.
- No se hace ninguna petición de red.

## Archivos

- `app/page.tsx`: pasa a ser la home (componente servidor).
- `app/biblioteca/page.tsx`: nuevo. Contiene la lógica que tenía `app/page.tsx`.
- `app/biblioteca/GameLibrary.tsx`: movido desde `app/GameLibrary.tsx`.
- `app/acerca/page.tsx`: nuevo (componente servidor).
- `app/acerca/ContactForm.tsx`: nuevo (cliente).
- `app/Reveal.tsx`: nuevo (cliente). Activa `.reveal` → `.reveal.in`. Lo usan la home y Acerca de.
- `app/PixelArt.tsx`: nuevo. Siluetas flotantes del hero, iconos de "¿Por qué?" y de los destacados de Acerca de, como SVG.
- `games/activity.ts`: nuevo.
- `app/Nav.tsx`: enlaces, estado activo y `GUEST_CREDITS`.
- `app/jugar/[id]/GamePlayer.tsx`: "SALIR" apunta a `/biblioteca`.
- `app/globals.css`: clases portadas.
- `CLAUDE.md`: secciones Arquitectura y Estado actualizadas.

Clases que se portan de `home-about/styles.css`, con sus `@media` y sus `@keyframes` (`float`, `bounce` y las demás que falten): `.home*`, `.hero-*`, `.section-*`, `.feature-*`, `.ft-*`, `.mini-*`, `.stat*`, `.activity-*`, `.ac-*`, `.ticker`, `.tick-row`, `.tk-*`, `.top-*`, `.tp-*`, `.lb-link`, `.pricing-*`, `.price-card`, `.pc-*`, `.faq-*`, `.final-*`, `.reveal`, `.about*`, `.highlight*`, `.hl-*`, `.div-*`, `.contact-*`, `.tip*`, `.terminal-success`, `.term-*`, `.shake`. No se portan las clases del mando (`.gp-*`, `.dp-*`, `.lg-*`, `.screw`, `.rivet`), que no usan estas pantallas.

## Plan de implementación

1. Mover la Biblioteca a `app/biblioteca/` (`page.tsx` + `GameLibrary.tsx`). Dejar en `app/page.tsx` un placeholder mínimo. Actualizar el enlace "Biblioteca" del Nav y el "SALIR" del reproductor a `/biblioteca`. Comprobar que `/biblioteca` funciona igual que antes.
2. Portar a `app/globals.css` las clases de la home y Acerca de listadas arriba.
3. Crear `app/Reveal.tsx` y `app/PixelArt.tsx`.
4. Implementar el hero de la home con las siluetas y los botones "EXPLORAR JUEGOS" y "CREAR CUENTA".
5. Añadir a la home "¿Por qué Arcade Vault?", Juegos disponibles y Estadísticas.
6. Crear `games/activity.ts` y añadir la sección Actividad con `id="salon"`.
7. Añadir Precios/FAQ y CTA final a la home.
8. Crear `app/acerca/page.tsx` con misión, destacados y separador pixelado.
9. Crear `app/acerca/ContactForm.tsx` e integrarlo en `/acerca`.
10. Actualizar `app/Nav.tsx`: enlaces Inicio, Biblioteca, Salón y Acerca de, estado activo, panel móvil y `GUEST_CREDITS`.
11. Añadir `metadata` (título y descripción) a `/`, `/biblioteca` y `/acerca`. Actualizar `CLAUDE.md`.

## Criterios de aceptación

**Rutas**

- [ ] `/` muestra la home, no la Biblioteca.
- [ ] `/biblioteca` muestra la Biblioteca con búsqueda, filtro y "PRÓXIMAMENTE" como antes.
- [ ] `/acerca` muestra la página Acerca de.
- [ ] "SALIR" en `/jugar/[id]` lleva a `/biblioteca`.

**Nav**

- [ ] Arriba a la izquierda aparece el logo "ARCADE VAULT" y lleva a `/`.
- [ ] El Nav muestra Inicio, Biblioteca, Salón de la Fama y Acerca de, en escritorio y en el panel móvil.
- [ ] El Nav muestra `CRÉDITOS · 03` y el botón "Iniciar Sesión" hacia `/auth`.
- [ ] En `/` está activo Inicio; en `/biblioteca` y `/jugar/*`, Biblioteca; en `/acerca`, Acerca de.
- [ ] "Salón de la Fama" lleva a la sección Actividad de la home.

**Home**

- [ ] Las secciones aparecen en este orden: hero, ¿Por qué?, Juegos, Estadísticas, Actividad, Precios/FAQ, CTA final.
- [ ] "▶ EXPLORAR JUEGOS" lleva a `/biblioteca` y "✦ CREAR CUENTA" a `/auth`.
- [ ] Juegos disponibles muestra 6 mini-tarjetas con portada, todas de juegos registrados.
- [ ] Pulsar una mini-tarjeta abre `/jugar/[id]` y el juego se puede jugar.
- [ ] El primer bloque de Estadísticas muestra "8" (el número de juegos del catálogo).
- [ ] Actividad muestra 7 puntuaciones recientes y un top 5, con los títulos de los juegos sacados de `GAMES`.
- [ ] No hay ningún botón "VER SALÓN →".
- [ ] Las secciones `.reveal` pasan de invisibles a visibles al hacer scroll.
- [ ] A 375 px de ancho no hay scroll horizontal.

**Acerca de**

- [ ] Enviar el formulario con algún campo vacío aplica `.shake` y no muestra la terminal.
- [ ] Enviar con los tres campos muestra la terminal con el nombre en mayúsculas.
- [ ] "ENVIAR OTRO MENSAJE" vuelve al formulario vacío.
- [ ] Enviar el formulario no genera ninguna petición en la pestaña Network.

**General**

- [ ] La consola no muestra errores ni avisos de hidratación en `/`, `/biblioteca` y `/acerca`.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.

## Decisiones

- **Sí:** el diseño sigue `references/templates/home-about/`. Lo pidió el usuario tras descartar al principio inspirarse en él.
- **Sí:** home en `/` y Biblioteca en `/biblioteca`. La home es la portada natural de la app.
- **Sí:** todas las secciones del prototipo, incluidos Precios y Estadísticas. Fidelidad al diseño.
- **Sí:** mantener el nombre "ARCADE VAULT" en el logo. Es el nombre de la app en layout, metadata y footer. "home-vault" se refería a la posición del logo, no a un nombre nuevo.
- **No:** renombrar la app a "Home Vault".
- **Sí:** "Acerca de" como página `/acerca`, igual que el prototipo. Descarta la idea inicial de una sección dentro de la home.
- **No:** un foro. Necesita backend y autenticación; iría en su propia spec.
- **Sí:** formulario de contacto solo visual. El envío real necesita backend.
- **Sí:** Salón de la Fama como ancla `/#salon` mientras no exista `/salon`. Evita un enlace roto.
- **Sí:** puntuaciones de prueba en `games/activity.ts`. Aíslan los datos falsos en un único archivo fácil de sustituir.
- **No:** ranking en localStorage. Añade persistencia, que va en otra spec.
- **Sí:** créditos fijos (`GUEST_CREDITS = 3`) solo en el Nav. El Nav ya es visible en la home y no hace falta duplicarlos.
- **No:** créditos que se consumen al jugar. Es una mecánica nueva.
- **Sí:** "Iniciar Sesión" y "Crear cuenta" apuntan a `/auth` aunque dé 404. Quedarán conectados cuando llegue la autenticación.
- **Sí:** mini-tarjetas a `/jugar/[id]`, no al detalle. El detalle todavía no existe.
- **Sí:** nombres de juegos propios en "¿Por qué?" y el número real de juegos en Estadísticas. El prototipo citaba marcas reales y "12+".

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Las secciones `.reveal` quedan invisibles si falla JavaScript | Bajo `prefers-reduced-motion: reduce`, `.reveal` se muestra sin animación. `Reveal.tsx` marca como visibles todos los elementos si no existe `IntersectionObserver`. |
| Conflictos de nombres al portar CSS a `globals.css` | Portar solo las clases listadas y comprobar que `/biblioteca` y `/jugar/[id]` no cambian de aspecto. |
| Enlaces antiguos a `/` que esperaban la Biblioteca | Se revisan todos los `href="/"` del código en el paso 1. |
| Las siluetas flotantes tapan el texto del hero en móvil | Mantener `pointer-events: none` y `opacity` del prototipo. Verificar a 375 px. |

## Lo que **no** entra en esta spec

- Autenticación y página `/auth`.
- Página `/salon` y persistencia de puntuaciones.
- Detalle de juego.
- Envío real del formulario de contacto.
- Foro.
- Créditos que se consumen al jugar.
- Cambio de nombre de la app.
