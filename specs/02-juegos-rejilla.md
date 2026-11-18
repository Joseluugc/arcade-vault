# SPEC 02 — Juegos de rejilla: Serpentina, Caída y Glotón

> **Estado:** Borrador
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-18
> **Objetivo:** Implementar el MVP jugable de Serpentina, Caída y Glotón sobre el motor de la SPEC 01, con niveles, puntuación y fin de juego.

## Alcance

**Dentro:**

- `games/serpentina/`: serpiente en rejilla, comida, crecimiento y velocidad creciente.
- `games/caida/`: tablero 10×20, 7 piezas, rotación, líneas, niveles y pieza siguiente.
- `games/gloton/`: laberinto fijo, puntos, píldoras, 4 fantasmas, modo asustado y 3 vidas.
- Registro de los tres juegos en `games/registry.ts`.
- Eliminar `games/demo/` y su entrada del registro si sigue existiendo.

**Fuera de alcance (para specs futuras):**

- Serpentina: obstáculos, portales, modo sin paredes.
- Caída: pieza guardada (hold), pieza fantasma, T-spins, rotación SRS completa.
- Glotón: frutas bonus, túnel lateral, IA por personalidad, modos persecución/dispersión, varios laberintos.
- Sonido y animaciones de muerte elaboradas.

## Modelo de datos

Cada juego exporta un `GameDefinition` desde `games/<id>/index.ts`. El estado es interno a la instancia.

```ts
// games/serpentina/index.ts
type Cell = { x: number; y: number };
interface SnakeState {
  body: Cell[];          // body[0] = cabeza
  dir: Cell;             // (1,0), (-1,0), (0,1), (0,-1)
  nextDir: Cell;
  food: Cell;
  eaten: number;
  score: number;
  level: number;
  tickMs: number;
}
```

```ts
// games/caida/index.ts
type PieceKind = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
interface FallingState {
  board: (PieceKind | null)[][]; // 20 filas × 10 columnas
  piece: { kind: PieceKind; rotation: 0 | 1 | 2 | 3; x: number; y: number };
  next: PieceKind;
  bag: PieceKind[];              // bolsa de 7 barajada
  lines: number;
  score: number;
  level: number;
}
```

```ts
// games/gloton/maze.ts
export const MAZE: string[]; // 28 columnas × 31 filas
// "#" muro, "." punto, "o" píldora, " " pasillo vacío, "-" puerta de la casa,
// "P" salida del jugador, "G" salida de fantasmas

// games/gloton/index.ts
type Dir = "up" | "down" | "left" | "right";
interface Ghost {
  x: number; y: number;        // en celdas, con fracción durante el movimiento
  dir: Dir;
  mode: "house" | "chase" | "frightened";
  releaseAtMs: number;
}
interface GlotonState {
  player: { x: number; y: number; dir: Dir; wantDir: Dir };
  ghosts: Ghost[];             // 4
  dotsLeft: number;
  frightenedMs: number;
  ghostCombo: number;
  lives: number;
  score: number;
  level: number;
}
```

## Reglas por juego

### Serpentina

- Rejilla de 32×24 celdas de 20 px.
- Controles: flechas o WASD. No se puede invertir la dirección 180°.
- Empieza con 3 segmentos en el centro, hacia la derecha.
- Comida: +10 × nivel puntos y un segmento más.
- Cada 5 comidas sube el nivel.
- Intervalo de movimiento: `max(60, 150 − 15 × (nivel − 1))` ms.
- Chocar con pared o con el propio cuerpo termina la partida. Sin vidas (`lives: null`).

### Caída

- Tablero 10×20 con celdas de 22 px, centrado; panel lateral con la pieza siguiente.
- Controles: ←/→ mover, ↑ o `KeyX` rotar en sentido horario, ↓ caída suave, `Space` caída instantánea.
- Rotación con ajuste simple: si choca, probar desplazamiento −1 y +1 en x; si ambos fallan, no rota.
- Generador de bolsa de 7 piezas barajadas.
- Líneas: 1 → 100, 2 → 300, 3 → 500, 4 → 800, todo × nivel.
- Caída suave: +1 por celda. Caída instantánea: +2 por celda.
- Sube un nivel cada 10 líneas.
- Gravedad: `max(100, 800 − 70 × (nivel − 1))` ms por celda.
- Si una pieza nueva no cabe al aparecer, termina la partida. Sin vidas (`lives: null`).

### Glotón

- Laberinto fijo de 28×31 celdas de 15 px en `games/gloton/maze.ts`, inspirado en el clásico, sin túnel lateral.
- Controles: flechas o WASD. El giro pedido se guarda y se aplica en la siguiente celda donde sea posible.
- Punto: 10. Píldora: 50 y activa el modo asustado.
- Modo asustado: `max(2000, 6000 − 500 × (nivel − 1))` ms. Los fantasmas se mueven al azar a la mitad de velocidad.
- Comer fantasmas en un mismo modo asustado: 200, 400, 800, 1600. El fantasma comido vuelve a la casa al instante.
- Fantasmas salen de la casa escalonados cada 3 s.
- IA: en cada cruce, el fantasma elige la dirección que minimiza la distancia al jugador, con un 20 % de probabilidad de dirección aleatoria. Nunca invierte la dirección salvo al entrar en modo asustado.
- Colisión: jugador y fantasma en la misma celda.
- Tocar un fantasma no asustado quita una vida y recoloca a todos. 3 vidas.
- Al comer todos los puntos sube el nivel: laberinto rellenado, fantasmas +10 % de velocidad.
- Sin vidas restantes termina la partida.

## Plan de implementación

1. Crear `games/serpentina/index.ts` con estado, movimiento por intervalo y render de rejilla. Registrarlo. Prueba manual: `/jugar/serpentina` mueve la serpiente.
2. Añadir comida, crecimiento, puntuación, niveles y colisiones a Serpentina.
3. Crear `games/caida/pieces.ts` con las 7 formas y sus 4 rotaciones.
4. Crear `games/caida/index.ts` con tablero, gravedad, movimiento y rotación. Registrarlo.
5. Añadir limpieza de líneas, puntuación, niveles, pieza siguiente y fin de partida a Caída.
6. Crear `games/gloton/maze.ts` y `games/gloton/index.ts` con laberinto, jugador y puntos. Registrarlo.
7. Añadir fantasmas con salida escalonada e IA de Glotón.
8. Añadir píldoras, modo asustado, vidas y cambio de nivel a Glotón.
9. Eliminar `games/demo/` y su entrada en `games/registry.ts` si existe.

## Criterios de aceptación

**General**

- [ ] `/jugar/serpentina`, `/jugar/caida` y `/jugar/gloton` cargan y se pueden jugar con teclado.
- [ ] Los tres juegos llaman a `onGameOver` y aparece el modal de la SPEC 01.
- [ ] `/jugar/demo` responde 404.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

**Serpentina**

- [ ] Comer suma exactamente 10 × nivel y alarga la serpiente un segmento.
- [ ] Tras 5 comidas el HUD muestra nivel 02 y la serpiente va más rápida.
- [ ] Pulsar la dirección contraria a la actual no tiene efecto.
- [ ] Chocar con la pared o con el cuerpo termina la partida.
- [ ] La comida nunca aparece sobre la serpiente.

**Caída**

- [ ] Aparecen las 7 piezas y cada bolsa de 7 las contiene todas.
- [ ] Limpiar 4 líneas a la vez en nivel 1 suma 800.
- [ ] Tras 10 líneas el HUD muestra nivel 02 y la caída es más rápida.
- [ ] Rotar junto a una pared desplaza la pieza o no rota; nunca la solapa.
- [ ] `Space` coloca la pieza en el fondo al instante.
- [ ] La pieza siguiente es visible y coincide con la que aparece después.
- [ ] Si una pieza nueva no cabe, termina la partida.

**Glotón**

- [ ] Comer un punto suma 10 y una píldora 50.
- [ ] Tras una píldora los fantasmas cambian de color y se pueden comer.
- [ ] Comer 4 fantasmas en una misma píldora suma 200 + 400 + 800 + 1600.
- [ ] Tocar un fantasma no asustado resta una vida en el HUD.
- [ ] Vaciar el laberinto sube el nivel y lo rellena.
- [ ] Perder la tercera vida termina la partida.

## Decisiones

- **Sí:** un laberinto fijo como matriz de texto. Fácil de leer y de editar.
- **No:** IA clásica por personalidad. Más trabajo del que pide el MVP.
- **Sí:** IA voraz con 20 % de azar. Evita que los fantasmas se amontonen en fila.
- **Sí:** bolsa de 7 en Caída. Evita rachas largas sin pieza I.
- **No:** rotación SRS completa. El ajuste ±1 basta para el MVP.
- **Sí:** Serpentina y Caída sin vidas (`lives: null`). En sus originales una muerte termina la partida.
- **No:** túnel lateral en Glotón. Añade casos de borde sin cambiar el bucle principal.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Movimiento en Glotón desalineado con la rejilla | Los giros solo se aplican al estar centrado en una celda. |
| Fantasmas atascados en la casa | La puerta `-` solo es transitable para fantasmas en modo `house`. |
| Laberinto de 31 filas × 15 px no cabe con márgenes | 31 × 15 = 465 px < 480 px. |

## Lo que **no** entra en esta spec

- Juegos de las SPEC 03 y 04.
- Hold, pieza fantasma y SRS en Caída.
- Frutas, túnel e IA por personalidad en Glotón.
- Sonido.
