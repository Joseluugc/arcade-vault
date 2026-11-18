# SPEC 04 — Ranaria y Duelo Pixel

> **Estado:** Borrador
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-18
> **Objetivo:** Implementar el MVP jugable de Ranaria y Duelo Pixel (contra la CPU) sobre el motor de la SPEC 01, con niveles, puntuación y fin de juego.

## Alcance

**Dentro:**

- `games/ranaria/`: carretera con coches, río con troncos, 5 nenúfares, temporizador por vida y 3 vidas.
- `games/duelo-pixel/`: jugador contra CPU, partidas a 11 encadenadas por niveles.
- Registro de los dos juegos en `games/registry.ts`.
- Eliminar `games/demo/` y su entrada del registro si sigue existiendo.

**Fuera de alcance (para specs futuras):**

- Ranaria: tortugas que se sumergen, cocodrilos, moscas bonus, ranas acompañantes.
- Duelo Pixel: modo 2 jugadores local, partidas online, efectos de giro de la pelota.
- Sonido.

## Modelo de datos

Cada juego exporta un `GameDefinition` desde `games/<id>/index.ts`.

```ts
// games/ranaria/lanes.ts
interface Lane {
  row: number;                 // 0 = fila de nenúfares, 12 = salida
  kind: "road" | "river";
  speed: number;               // px/s, signo = dirección
  objectWidth: number;         // en celdas
  gap: number;                 // en celdas
}
export const LANES: Lane[];    // 5 carriles de carretera + 5 de río

// games/ranaria/index.ts
interface FrogState {
  frog: { col: number; row: number; x: number };
  maxRowReached: number;       // para puntuar solo el avance nuevo
  lilies: boolean[];           // 5, true = ocupado
  timeLeftMs: number;
  lives: number;
  score: number;
  level: number;
}
```

```ts
// games/duelo-pixel/index.ts
interface PongState {
  player: { y: number };       // paleta izquierda
  cpu: { y: number };          // paleta derecha
  ball: { x: number; y: number; vx: number; vy: number };
  playerGoals: number;         // en la partida actual
  cpuGoals: number;            // en la partida actual
  totalGoals: number;          // acumulado = puntuación
  level: number;               // = número de partida
  serveDelayMs: number;
}
```

## Reglas por juego

### Ranaria

- Rejilla de 14 columnas × 13 filas con celdas de 32 px, centrada.
- Filas de abajo arriba: 1 de salida, 5 de carretera, 1 franja segura, 5 de río, 1 de nenúfares.
- Controles: flechas o WASD. Un salto de una celda por pulsación.
- Carretera: tocar un coche quita una vida.
- Río: la rana debe estar sobre un tronco y se desplaza con él. Caer al agua o salir de la pantalla arrastrada quita una vida.
- Fila superior: 5 nenúfares. Entrar en uno libre lo ocupa y devuelve la rana a la salida. Entrar en un nenúfar ocupado o fuera de un nenúfar quita una vida.
- Temporizador: 30 s por vida. Llegar a 0 quita una vida.
- Puntos: 10 por cada fila nueva alcanzada en la vida actual; 50 por nenúfar; 10 por segundo restante al llegar; 1000 al llenar los 5.
- Al llenar los 5 nenúfares sube el nivel: nenúfares vacíos y velocidad de carriles × `(1 + 0,15 × (nivel − 1))`.
- 3 vidas. Sin vidas termina la partida.

### Duelo Pixel

- Paletas de 10×70 px; pelota de 8×8 px.
- Controles del jugador (izquierda): ↑/↓ o W/S.
- CPU (derecha): sigue la `y` de la pelota con velocidad máxima `220 + 40 × (nivel − 1)` px/s. Solo reacciona cuando la pelota se acerca a su campo.
- Velocidad inicial de la pelota: `320 + 20 × (nivel − 1)` px/s, con +5 % en cada golpe de paleta.
- Ángulo de rebote según el punto de impacto en la paleta, hasta ±50°.
- Tras cada gol, 1000 ms de pausa y saque hacia quien recibió el gol.
- Cada gol del jugador suma 1 punto a la puntuación (`totalGoals`).
- Partida a 11. Si gana el jugador, sube el nivel y empieza otra partida 0-0.
- Si gana la CPU, termina la partida con `onGameOver(totalGoals)`.
- Sin vidas (`lives: null`). El marcador de la partida actual se dibuja en el canvas.

## Plan de implementación

1. Crear `games/ranaria/lanes.ts` e `index.ts` con rejilla, rana y saltos. Registrarlo.
2. Añadir carriles de coches y colisión a Ranaria.
3. Añadir río, troncos y arrastre a Ranaria.
4. Añadir nenúfares, temporizador, puntuación, vidas y niveles a Ranaria.
5. Crear `games/duelo-pixel/index.ts` con paletas, pelota y rebotes. Registrarlo.
6. Añadir IA de la CPU, goles, saque y marcador a Duelo Pixel.
7. Añadir partidas encadenadas, niveles y fin de partida a Duelo Pixel.
8. Eliminar `games/demo/` y su entrada en `games/registry.ts` si existe.

## Criterios de aceptación

**General**

- [ ] `/jugar/ranaria` y `/jugar/duelo-pixel` cargan y se pueden jugar con teclado.
- [ ] Ambos juegos llaman a `onGameOver` y aparece el modal de la SPEC 01.
- [ ] `/jugar/demo` responde 404.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

**Ranaria**

- [ ] Cada pulsación mueve la rana exactamente una celda.
- [ ] Tocar un coche resta una vida y devuelve la rana a la salida.
- [ ] Sobre un tronco la rana se desplaza con él.
- [ ] Saltar al agua sin tronco resta una vida.
- [ ] Volver a una fila ya alcanzada en la misma vida no suma puntos.
- [ ] Ocupar un nenúfar suma 50 más 10 por segundo restante.
- [ ] Entrar en un nenúfar ocupado resta una vida.
- [ ] Agotar los 30 s resta una vida.
- [ ] Llenar los 5 nenúfares suma 1000, sube el nivel y los vacía.

**Duelo Pixel**

- [ ] El HUD muestra "—" en Vidas.
- [ ] Cada gol del jugador suma exactamente 1 a la puntuación del HUD.
- [ ] Golpear con el extremo de la paleta da más ángulo que golpear en el centro.
- [ ] Ganar 11-x sube el nivel y reinicia el marcador a 0-0.
- [ ] En nivel 2 la CPU se mueve más rápido que en nivel 1.
- [ ] Perder una partida abre el modal con los goles acumulados.

## Decisiones

- **Sí:** Duelo Pixel solo contra CPU. Una partida a 2 jugadores no tiene un jugador al que asignar la puntuación.
- **No:** modo 2 jugadores local. Queda para otra spec.
- **Sí:** puntuación = goles acumulados en partidas encadenadas. Coherente con el récord de 24 del prototipo.
- **Sí:** CPU con velocidad limitada. Es lo que la hace batible sin introducir errores aleatorios.
- **Sí:** puntuar solo filas nuevas en Ranaria. Evita sumar puntos subiendo y bajando.
- **Sí:** carriles definidos como datos en `lanes.ts`. Ajustar dificultad no requiere tocar la lógica.
- **No:** tortugas que se sumergen. Fuera del MVP acordado.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La rana sobre un tronco desalineada de la rejilla | La `x` de la rana es continua en el río y se redondea a columna al volver a tierra. |
| Pelota que atraviesa la paleta a alta velocidad | Comprobar el cruce del plano de la paleta entre la posición anterior y la nueva. |
| CPU imbatible en niveles altos | La velocidad de la CPU crece más despacio que la de la pelota. |

## Lo que **no** entra en esta spec

- Juegos de las SPEC 02 y 03.
- Modo 2 jugadores en Duelo Pixel.
- Tortugas, cocodrilos y bonus en Ranaria.
- Sonido.
