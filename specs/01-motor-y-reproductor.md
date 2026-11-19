# SPEC 01 — Motor de juegos y reproductor

> **Estado:** Implementado
> **Depende de:** —
> **Fecha:** 2026-11-18
> **Objetivo:** Crear un motor Canvas 2D común y la ruta `/jugar/[id]` que ejecuta cualquier juego registrado con HUD, pausa y pantalla de fin de juego.

## Por qué existe esta spec

Los 8 juegos del catálogo comparten bucle, entrada de teclado, HUD, pausa y fin de juego. Esta spec fija ese contrato una sola vez. Las SPEC 02, 03 y 04 solo implementan la lógica de cada juego contra este contrato.

## Alcance

**Dentro:**

- Catálogo tipado de los 8 juegos en `games/catalog.ts`, con los datos de `references/templates/data.jsx`.
- Contrato de juego (`GameDefinition`, `GameInstance`, `GameContext`, `GameHud`) en `games/engine/types.ts`.
- Bucle de paso fijo a 60 Hz con `requestAnimationFrame` en `games/engine/loop.ts`.
- Entrada de teclado (`InputState`) en `games/engine/input.ts`.
- Componente cliente `GameCanvas` en `games/engine/GameCanvas.tsx`: canvas de resolución lógica 640×480, escalado al contenedor, `imageSmoothingEnabled = false`.
- Registro id → `GameDefinition` en `games/registry.ts`.
- Ruta `app/jugar/[id]/page.tsx` y componente cliente `app/jugar/[id]/GamePlayer.tsx` portado de `references/templates/reproductor.jsx`: HUD (jugador, puntuación, vidas, nivel), botones PAUSA / FIN / SALIR, marco CRT y modal de fin de juego.
- Juego de prueba `games/demo/` registrado con id `demo` para verificar el contrato.
- Pausa con la tecla `P`, con el botón PAUSA y automática al ocultar la pestaña.

**Fuera de alcance (para specs futuras):**

- La lógica de los 8 juegos (SPEC 02, 03 y 04).
- Biblioteca, detalle de juego, autenticación y salón de la fama.
- Guardar la puntuación (campo de iniciales y botón GUARDAR PUNTUACIÓN del prototipo).
- Controles táctiles, gamepad y sonido.
- Barra de navegación global (`nav.jsx`).

## Modelo de datos

```ts
// games/catalog.ts
type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
type GameColor = "cyan" | "magenta" | "green" | "yellow";

interface GameMeta {
  id: string;            // "bloque-buster", "caida", "serpentina", "gloton",
                         // "invasores", "rocas", "ranaria", "duelo-pixel"
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  color: GameColor;
}

export const GAMES: GameMeta[];
export function getGameMeta(id: string): GameMeta | undefined;
```

```ts
// games/engine/types.ts
interface GameHud {
  score: number;
  lives: number | null;  // null = el juego no usa vidas; el HUD muestra "—"
  level: number;
}

interface InputState {
  isDown(code: string): boolean;     // tecla mantenida (KeyboardEvent.code)
  wasPressed(code: string): boolean; // pulsada desde el paso anterior
}

interface GameContext {
  width: 640;
  height: 480;
  input: InputState;
  onHud(hud: GameHud): void;
  onGameOver(finalScore: number): void;
}

interface GameInstance {
  update(dtMs: number): void;                   // dtMs fijo = 1000 / 60
  render(g: CanvasRenderingContext2D): void;
}

interface GameDefinition {
  id: string;
  create(ctx: GameContext): GameInstance;
}
```

```ts
// games/registry.ts
export const GAME_REGISTRY: Record<string, GameDefinition>;
```

Convenciones:

- Coordenadas lógicas con origen arriba a la izquierda, en píxeles de 640×480.
- Velocidades en píxeles por segundo; cada juego multiplica por `dtMs / 1000`.
- Las teclas se identifican por `KeyboardEvent.code` (`"ArrowLeft"`, `"KeyA"`, `"Space"`, `"KeyP"`).
- El juego llama a `onHud` solo cuando cambia algún valor.
- El juego llama a `onGameOver` una única vez; después el reproductor deja de llamar a `update`.
- Reiniciar crea una instancia nueva con `create`; los juegos no implementan `reset`.

## Plan de implementación

1. Leer en `node_modules/next/dist/docs/` las guías de rutas dinámicas, `params` y `notFound` de Next.js 16.
2. Crear `games/catalog.ts` con los 8 juegos y `getGameMeta`.
3. Crear `games/engine/types.ts` con el contrato.
4. Crear `games/engine/input.ts`: escucha `keydown`/`keyup` en `window`, limpia `wasPressed` tras cada paso y vacía todo en `blur`. Llama a `preventDefault` para flechas y `Space` mientras está activo.
5. Crear `games/engine/loop.ts`: acumulador de tiempo, paso fijo de 1000/60 ms, máximo 5 pasos por frame, funciones `start`, `stop`, `setPaused`.
6. Crear `games/engine/GameCanvas.tsx` (`"use client"`): monta el canvas, crea la instancia, arranca el bucle y lo detiene al desmontar.
7. Crear `games/demo/index.ts`: un cuadrado que se mueve con flechas, suma 1 punto por segundo y termina al pulsar `Enter`. Registrarlo en `games/registry.ts`.
8. Crear `app/jugar/[id]/page.tsx`: lee `params` y llama a `notFound()` si el id no está en `GAME_REGISTRY`.
9. Crear `app/jugar/[id]/GamePlayer.tsx`: HUD, botones y marco CRT con las clases ya presentes en `app/globals.css` (`.player-hud`, `.hud-stat`, `.crt`, `.crt-screen`, `.crt-bottom`).
10. Añadir pausa: tecla `P`, botón PAUSA/REANUDAR, `visibilitychange` a oculto, y superposición "EN PAUSA".
11. Añadir el modal de fin de juego: título FIN DEL JUEGO, PUNTUACIÓN FINAL, botones JUGAR DE NUEVO (nueva instancia) y VOLVER (enlace a `/`). El botón FIN fuerza el fin con la puntuación actual.
12. Aplicar el skill `/frontend-design` a la ruta para respetar la estética neón/CRT del prototipo.

## Criterios de aceptación

- [ ] `/jugar/demo` muestra el canvas dentro del marco CRT y el HUD.
- [ ] `/jugar/no-existe` responde con la página 404.
- [ ] El HUD muestra "INVITADO" como jugador.
- [ ] El HUD actualiza puntuación, vidas y nivel cuando el juego llama a `onHud`.
- [ ] Con `lives: null` el HUD muestra "—" en Vidas.
- [ ] Pulsar `P` pausa el juego y muestra "EN PAUSA"; pulsar `P` otra vez lo reanuda.
- [ ] Cambiar de pestaña pausa el juego.
- [ ] Las flechas y `Space` no desplazan la página mientras se juega.
- [ ] Al llamar `onGameOver(n)` aparece el modal con la puntuación `n` formateada con `toLocaleString("es-ES")`.
- [ ] JUGAR DE NUEVO reinicia con puntuación 0, nivel 1 y vidas iniciales.
- [ ] El botón FIN abre el modal con la puntuación actual.
- [ ] Salir de la ruta detiene el bucle y elimina los listeners de teclado.
- [ ] El canvas se ve nítido (sin suavizado) a cualquier ancho de ventana.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisiones

- **Sí:** Canvas 2D propio. Sin dependencias y encaja con la estética píxel.
- **No:** Phaser u otra librería. Dependencia pesada para juegos de este tamaño.
- **No:** juegos con elementos DOM. Demasiado lento para Rocas o Invasores.
- **Sí:** paso fijo a 60 Hz. La física se comporta igual en monitores de 60 y 144 Hz.
- **Sí:** resolución lógica fija 640×480 escalada. Cada juego razona en un único sistema de coordenadas.
- **Sí:** solo teclado. Los controles táctiles exigen un diseño por juego.
- **Sí:** el juego solo emite la puntuación final. Persistencia y ranking van en otra spec.
- **Sí:** código de juegos en `games/` en la raíz. Separa la lógica de juego de las rutas de `app/`.
- **Sí:** reiniciar recreando la instancia. Evita que cada juego implemente su propio `reset`.
- **No:** campo de iniciales en el modal. Sin persistencia no tiene función.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Cambios incompatibles en Next.js 16 (`params` asíncrono, componentes cliente) | Paso 1: leer la documentación local antes de escribir la ruta. |
| Saltos de tiempo al volver a la pestaña | Pausa automática y máximo 5 pasos por frame. |
| Teclas atascadas al perder el foco | `InputState` se vacía en `blur`. |
| Doble montaje de efectos en modo desarrollo | `GameCanvas` detiene el bucle y quita listeners en la limpieza del efecto. |

## Lo que **no** entra en esta spec

- Ningún juego real del catálogo.
- Biblioteca, detalle, autenticación, salón y barra de navegación.
- Guardar puntuaciones.
- Táctil, gamepad y sonido.
