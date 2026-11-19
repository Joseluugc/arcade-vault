# SPEC 03 — Juegos de acción: Bloque Buster, Invasores y Rocas

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-18
> **Objetivo:** Implementar el MVP jugable de Bloque Buster, Invasores y Rocas sobre el motor de la SPEC 01, con 3 vidas, niveles y fin de juego.

## Alcance

**Dentro:**

- `games/bloque-buster/`: paleta, pelota, muro de bloques, 3 patrones de nivel.
- `games/invasores/`: formación de aliens, disparos de ambos bandos, oleadas.
- `games/rocas/`: nave con inercia, disparos, rocas que se dividen, bordes envolventes.
- Registro de los tres juegos en `games/registry.ts`.
- Eliminar `games/demo/` y su entrada del registro si sigue existiendo.

**Fuera de alcance (para specs futuras):**

- Bloque Buster: power-ups, bloques resistentes, varias pelotas.
- Invasores: escudos, nave misteriosa (OVNI), animación de sprites.
- Rocas: OVNIs, hiperespacio, vidas extra por puntos.
- Sonido y partículas de explosión.

## Modelo de datos

Cada juego exporta un `GameDefinition` desde `games/<id>/index.ts`. Unidades en píxeles y píxeles/segundo.

```ts
// games/bloque-buster/index.ts
interface Brick { x: number; y: number; w: number; h: number; points: number; alive: boolean }
interface BreakoutState {
  paddle: { x: number; w: 80; h: 12 };
  ball: { x: number; y: number; vx: number; vy: number; r: 4; stuck: boolean };
  bricks: Brick[];
  lives: number;
  score: number;
  level: number;
}

// games/bloque-buster/levels.ts
export const PATTERNS: string[][]; // 3 patrones de 6 filas × 10 columnas, "#" = bloque
```

```ts
// games/invasores/index.ts
interface Alien { col: number; row: number; alive: boolean; points: number }
interface Bullet { x: number; y: number; vy: number }
interface InvadersState {
  player: { x: number };
  aliens: Alien[];             // 5 filas × 11 columnas
  offset: { x: number; y: number };
  stepDir: 1 | -1;
  stepMs: number;
  playerBullet: Bullet | null;
  alienBullets: Bullet[];      // máximo 3
  lives: number;
  score: number;
  level: number;
}
```

```ts
// games/rocas/index.ts
type RockSize = "large" | "medium" | "small";
interface Rock { x: number; y: number; vx: number; vy: number; size: RockSize; shape: number[] }
interface Shot { x: number; y: number; vx: number; vy: number; ttlMs: number }
interface RocksState {
  ship: { x: number; y: number; vx: number; vy: number; angle: number; invulnMs: number };
  rocks: Rock[];
  shots: Shot[];               // máximo 4
  lives: number;
  score: number;
  level: number;
}
```

## Reglas por juego

### Bloque Buster

- Controles: ←/→ o A/D mueven la paleta; `Space` lanza la pelota.
- La pelota empieza pegada a la paleta al inicio de cada vida.
- Ángulo de rebote según el punto de impacto en la paleta: centro vertical, extremos hasta ±60°.
- Bloques en 6 filas × 10 columnas. Puntos por fila desde arriba: 30, 30, 20, 20, 10, 10.
- Velocidad de la pelota: `300 + 30 × (nivel − 1)` px/s.
- Al destruir todos los bloques sube el nivel y carga el siguiente patrón en ciclo de 3.
- Si la pelota sale por abajo se pierde una vida. 3 vidas.

### Invasores

- Controles: ←/→ o A/D mueven el cañón; `Space` dispara. Solo una bala propia en pantalla.
- Formación de 5 filas × 11 columnas. Puntos por fila desde arriba: 30, 20, 20, 10, 10.
- La formación avanza un paso lateral cada `stepMs`; al tocar un borde baja 16 px e invierte la dirección.
- `stepMs` = `max(50, (600 − 50 × (nivel − 1)) × vivos / 55)`.
- Los aliens disparan desde el alien más bajo de una columna al azar. Máximo 3 balas enemigas.
- Una bala enemiga en el cañón quita una vida. 3 vidas.
- Si un alien alcanza la altura del cañón, termina la partida.
- Al eliminar toda la formación sube el nivel y la siguiente empieza 16 px más abajo, hasta un máximo de 5 niveles de descenso.

### Rocas

- Controles: ←/→ o A/D rotan; ↑ o W empuja; `Space` dispara.
- Inercia con rozamiento leve; velocidad máxima de la nave 300 px/s.
- Todos los objetos aparecen por el borde opuesto al salir de la pantalla.
- Disparos: máximo 4 en pantalla, vida de 1000 ms.
- Rocas grandes se dividen en 2 medianas; medianas en 2 pequeñas; pequeñas desaparecen.
- Puntos: grande 20, mediana 50, pequeña 100.
- Nivel `n` empieza con `3 + n` rocas grandes lejos de la nave.
- Chocar con una roca quita una vida. La nave reaparece en el centro con 2000 ms de invulnerabilidad parpadeando. 3 vidas.
- Al destruir todas las rocas sube el nivel.

## Plan de implementación

1. Crear `games/bloque-buster/levels.ts` e `index.ts` con paleta y pelota rebotando en paredes. Registrarlo.
2. Añadir bloques, colisiones, puntuación y rebote según impacto en Bloque Buster.
3. Añadir vidas, cambio de nivel y fin de partida a Bloque Buster.
4. Crear `games/invasores/index.ts` con cañón, formación y su avance. Registrarlo.
5. Añadir disparos de ambos bandos, colisiones y puntuación a Invasores.
6. Añadir vidas, oleadas y condición de invasión a Invasores.
7. Crear `games/rocas/index.ts` con nave, inercia y bordes envolventes. Registrarlo.
8. Añadir rocas, disparos, división y puntuación a Rocas.
9. Añadir vidas, invulnerabilidad y niveles a Rocas.
10. Eliminar `games/demo/` y su entrada en `games/registry.ts` si existe.

## Criterios de aceptación

**General**

- [ ] `/jugar/bloque-buster`, `/jugar/invasores` y `/jugar/rocas` cargan y se pueden jugar con teclado.
- [ ] Los tres juegos empiezan con 3 vidas en el HUD.
- [ ] Los tres juegos llaman a `onGameOver` al perder la última vida.
- [ ] `/jugar/demo` responde 404.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

**Bloque Buster**

- [ ] La pelota no se mueve hasta pulsar `Space`.
- [ ] Golpear con el extremo de la paleta desvía la pelota hacia ese lado.
- [ ] Un bloque de la fila superior suma 30 y el de la inferior 10.
- [ ] Vaciar el muro sube el nivel y carga un patrón distinto.
- [ ] Perder la pelota resta una vida y la deja pegada a la paleta.

**Invasores**

- [ ] Mantener `Space` no dispara una segunda bala mientras la primera sigue en pantalla.
- [ ] Al eliminar aliens la formación se mueve más rápido.
- [ ] Un alien de la fila superior suma 30.
- [ ] Nunca hay más de 3 balas enemigas a la vez.
- [ ] Si un alien llega a la altura del cañón la partida termina aunque queden vidas.
- [ ] Eliminar toda la formación sube el nivel.

**Rocas**

- [ ] Soltar ↑ deja la nave deslizándose y frenando poco a poco.
- [ ] Salir por un borde hace aparecer la nave por el opuesto.
- [ ] Una roca grande se divide en 2 medianas y suma 20.
- [ ] Una roca pequeña desaparece y suma 100.
- [ ] Nunca hay más de 4 disparos propios a la vez.
- [ ] Tras perder una vida la nave parpadea y no muere durante 2 s.
- [ ] El nivel 2 empieza con 5 rocas grandes.

## Decisiones

- **Sí:** 3 patrones de bloques en ciclo. Variedad suficiente sin un editor de niveles.
- **No:** power-ups ni OVNIs. Fuera del MVP acordado.
- **Sí:** velocidad de Invasores proporcional a aliens vivos. Es la tensión central del juego.
- **Sí:** formas de roca aleatorias generadas al crearlas (`shape`). Evita que todas se vean iguales.
- **Sí:** colisiones círculo-círculo en Rocas y AABB en Bloque Buster e Invasores. Simples y suficientes.
- **No:** escudos en Invasores. Añaden destrucción por píxel; van en otra spec si llegan.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La pelota atraviesa bloques a alta velocidad (efecto túnel) | Subdividir el movimiento por paso si el desplazamiento supera el radio. |
| La pelota queda en bucle horizontal | Componente vertical mínima en cada rebote. |
| Rocas que aparecen encima de la nave | Distancia mínima de 150 px a la nave al generar un nivel. |

## Lo que **no** entra en esta spec

- Juegos de las SPEC 02 y 04.
- Power-ups, escudos, OVNIs e hiperespacio.
- Sonido y partículas.
