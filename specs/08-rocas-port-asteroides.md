# SPEC 08 — Rocas: port del juego de asteroides de referencia

> **Estado:** Aprobado 
> **Depende de:** SPEC 01, SPEC 03
> **Fecha:** 2026-11-23
> **Objetivo:** Sustituir la implementación de Rocas por un port del juego de `references/started-games/02-asteroids/` al motor de la plataforma, con power-up de disparo triple y partículas.

## Por qué existe esta spec

Rocas (SPEC 03) ya es un juego de asteroides. La referencia `02-asteroids` es más completa: tiene power-up, partículas, enfriamiento de disparo y pausa al morir. En lugar de tener dos juegos de asteroides en la Biblioteca, la referencia reemplaza el código de Rocas con el mismo id, portada y ruta `/jugar/rocas`.

## Alcance

**Dentro:**

- Reescribir `games/rocas/index.ts` portando `references/started-games/02-asteroids/game.js` a un `GameDefinition` en TypeScript.
- Escalar tamaños, velocidades y distancias de 800×600 a 640×480 (factor 0,8).
- Física y disparo de la referencia: rozamiento por paso sin velocidad máxima y enfriamiento de 0,2 s entre disparos.
- Pausa de 2 s tras perder una vida antes de que reaparezca la nave.
- Power-up de disparo triple.
- Partículas de explosión en rocas y nave.
- Paleta neón de `games/engine/palette.ts` con brillo (`shadowBlur`).
- Se conservan de la Rocas actual: teclas WASD, dibujo envuelto en los bordes y balas que heredan la velocidad de la nave.
- Texto del juego en `games/catalog.ts`: quitar los OVNIs y mencionar el disparo triple.
- Nota en la sección Rocas de `specs/03-juegos-disparo.md` indicando que la sustituye esta spec.
- `CLAUDE.md`: añadir SPEC 08 en Estado.

**Fuera de alcance (para specs futuras):**

- Cambios en el motor (`games/engine/`), en `GameHud` o en `GamePlayer.tsx`.
- Reinicio con `Space` en el fin de partida. Lo gestiona el reproductor.
- OVNIs, hiperespacio y vidas extra por puntos.
- Sonido.
- Otros power-ups distintos del disparo triple.
- Cambios en la portada CSS `.cover-rocas`, el id o la categoría.
- Persistencia de puntuaciones.

## Modelo de datos

Todo vive en `games/rocas/index.ts`. Unidades en píxeles, píxeles/segundo y segundos. El paso de simulación es fijo (`dtMs = 1000/60`).

```ts
type RockSize = 1 | 2 | 3; // 1 pequeña, 2 mediana, 3 grande

interface Rock {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: RockSize;
  rot: number;
  rotSpeed: number; // rotación propia, rad y rad/s
  verts: [number, number][]; // polígono irregular de 8 a 13 vértices
}
interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
}
interface PowerUp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  color: string;
}

interface RocksState {
  ship: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    invincible: number; // s restantes de invulnerabilidad
    cooldown: number; // s hasta poder disparar
    tripleShot: number; // s restantes de disparo triple
    thrusting: boolean;
  };
  rocks: Rock[];
  bullets: Bullet[];
  powerUps: PowerUp[];
  particles: Particle[];
  phase: "playing" | "dead" | "over";
  deadTimer: number; // s hasta reaparecer
  powerUpSpawned: boolean; // ya salió el power-up de este nivel
  killsSinceSpawn: number;
  lives: number;
  score: number;
  level: number;
}
```

Constantes (referencia × 0,8 donde aplica):

| Constante                         | Referencia        | Valor en la plataforma     |
| --------------------------------- | ----------------- | -------------------------- |
| Radio de roca (1, 2, 3)           | 16, 30, 50        | 13, 24, 40                 |
| Velocidad base de roca (1, 2, 3)  | 85, 55, 32 (± 15) | 68, 44, 26 (± 12)          |
| Puntos de roca (1, 2, 3)          | 100, 50, 20       | 100, 50, 20                |
| Radio de la nave                  | 12                | 10                         |
| Distancia de la nariz             | 21                | 17                         |
| Rotación                          | 3,5 rad/s         | 3,5 rad/s                  |
| Empuje                            | 260 px/s²         | 208 px/s²                  |
| Rozamiento                        | 0,987 por frame   | 0,987 por paso             |
| Velocidad de bala                 | 520               | 416 + velocidad de la nave |
| Vida de bala                      | 1,1 s             | 1,1 s                      |
| Enfriamiento de disparo           | 0,2 s             | 0,2 s                      |
| Apertura del disparo triple       | 0,18 rad          | 0,18 rad                   |
| Distancia segura al generar rocas | 130               | 104                        |
| Radio del power-up                | 12                | 10                         |
| Velocidad del power-up            | 20–40             | 16–32                      |
| Velocidad de partícula            | 30–130            | 24–104                     |

Colores (`COLORS`): rocas `cyan`, nave `yellow`, llama `magenta`, balas `ink`, power-up `magenta`, partículas del color del objeto destruido.

## Reglas del juego

- Controles: ←/→ o A/D rotan; ↑ o W empuja; `Space` dispara.
- El disparo se activa con `wasPressed("Space")`. Mantener la tecla no dispara en ráfaga.
- Entre dos disparos hay al menos 0,2 s. No hay máximo de balas en pantalla.
- Nave, rocas, balas y power-ups aparecen por el borde opuesto al salir. Las partículas no envuelven.
- Las rocas rotan sobre sí mismas.
- Una bala que toca una roca la destruye: grande → 2 medianas, mediana → 2 pequeñas, pequeña desaparece.
- Al destruir una roca se emiten `tamaño × 5` partículas cian.
- Al chocar con una roca la nave muere: 14 partículas amarillas y se resta una vida. La roca no se rompe ni suma puntos.
- Tras morir hay 2 s de fase `dead`: la nave no se ve ni se controla; rocas, balas y partículas siguen moviéndose.
- La nave reaparece en el centro mirando hacia arriba, parada y con 3 s de invulnerabilidad parpadeando. También al empezar la partida y cada nivel.
- Al perder la última vida se llama a `onGameOver(score)` y el juego deja de actualizarse.
- Partida: 3 vidas. El nivel 1 empieza con 4 rocas grandes. El nivel `n` empieza con `3 + n`, todas a más de 104 px del centro.
- Al destruir todas las rocas sube el nivel: se vacían balas, partículas y power-ups y la nave reaparece.

### Power-up de disparo triple

- Como máximo uno por nivel.
- Al destruir una roca, si aún no ha salido en el nivel: 15 % de probabilidad, o seguro en la 5.ª roca destruida del nivel.
- Aparece donde estaba la roca y se mueve despacio en una dirección aleatoria.
- Desaparece a los 12 s. Parpadea durante los 2 últimos.
- Se dibuja como un cuadrado rotado 45° que pulsa, con el texto `3x` en el centro.
- Al tocarlo la nave, el disparo triple dura 5 s: 3 balas separadas 0,18 rad.
- El tiempo de disparo triple no se reinicia al morir ni al cambiar de nivel. No corre durante la fase `dead`.
- Mientras está activo, el canvas muestra `3x  N.Ns` en magenta en la esquina superior izquierda.

## Plan de implementación

1. Reescribir `games/rocas/index.ts` con nave, física, disparo con enfriamiento, rocas giratorias que se dividen, puntuación, envoltura y dibujo envuelto en neón. El juego ya se puede jugar sin morir.
2. Añadir colisión nave-roca, vidas, fase `dead` de 2 s, invulnerabilidad de 3 s, niveles y `onGameOver`.
3. Añadir partículas de explosión en rocas y nave.
4. Añadir el power-up de disparo triple y su indicador en el canvas.
5. Actualizar `long` de Rocas en `games/catalog.ts`, la nota en `specs/03-juegos-disparo.md` y la sección Estado de `CLAUDE.md`.

## Criterios de aceptación

**Juego**

- [ ] `/jugar/rocas` carga y empieza con 3 vidas, nivel 1 y 4 rocas grandes.
- [ ] Las flechas y WASD rotan y empujan la nave.
- [ ] Soltar ↑ deja la nave deslizándose y frenando poco a poco.
- [ ] Mantener `Space` dispara una sola bala.
- [ ] Pulsar `Space` muy rápido no dispara dos balas en menos de 0,2 s.
- [ ] Una roca grande se divide en 2 medianas y suma 20.
- [ ] Una roca pequeña desaparece y suma 100.
- [ ] Destruir una roca muestra partículas cian.
- [ ] Chocar con una roca resta una vida, muestra partículas amarillas y no divide la roca.
- [ ] Tras chocar, la nave tarda 2 s en reaparecer y luego parpadea y no muere durante 3 s.
- [ ] El nivel 2 empieza con 5 rocas grandes.
- [ ] Al perder la última vida aparece la pantalla FIN DEL JUEGO del reproductor con la puntuación final.
- [ ] Cruzar un borde se ve continuo, sin que el objeto desaparezca de golpe.

**Power-up**

- [ ] En cada nivel aparece como máximo un power-up `3x`.
- [ ] Si no ha aparecido antes, aparece al destruir la 5.ª roca del nivel.
- [ ] Recogerlo hace que cada disparo lance 3 balas durante 5 s.
- [ ] Mientras dura, el canvas muestra la cuenta atrás `3x` en magenta.
- [ ] Si no se recoge, parpadea y desaparece a los 12 s.

**General**

- [ ] La Biblioteca muestra Rocas con la misma portada y el texto nuevo, sin mencionar OVNIs.
- [ ] `games/engine/` y `app/jugar/[id]/GamePlayer.tsx` no cambian.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.

## Decisiones

- **Sí:** sustituir Rocas en lugar de añadir un juego nuevo. Evita dos juegos de asteroides y no exige catálogo ni portada nuevos.
- **No:** mejorar el código actual de Rocas. Los modelos de física y disparo son distintos; portar la referencia es más limpio.
- **Sí:** escalar constantes ×0,8. El motor tiene un canvas fijo de 640×480 y así se conserva la sensación de la referencia.
- **No:** cambiar el tamaño del canvas del motor. Afectaría a todos los juegos.
- **Sí:** rozamiento de 0,987 por paso. El motor corre a paso fijo de 60 FPS, equivalente a la referencia a 60 FPS.
- **No:** velocidad máxima de la nave. La referencia no la tiene.
- **Sí:** enfriamiento de 0,2 s en lugar de máximo 4 balas. Es el comportamiento de la referencia.
- **Sí:** las balas heredan la velocidad de la nave, como en la Rocas actual.
- **Sí:** teclas WASD además de flechas, como el resto de juegos de la plataforma.
- **Sí:** dibujo envuelto en los bordes de la Rocas actual. La referencia hace desaparecer los objetos de golpe.
- **Sí:** paleta neón. Consistencia visual con los demás juegos.
- **Sí:** la roca no se rompe al chocar con la nave. Comportamiento de la referencia.
- **Sí:** balas siguen moviéndose en la fase `dead`. En la referencia se quedan congeladas, lo que parece un fallo.
- **Sí:** indicador `3x` en el canvas. No obliga a tocar `GameHud` ni el reproductor.
- **No:** reinicio con `Space` en fin de partida. El reproductor ya ofrece reintentar.
- **No:** HUD propio en el canvas para puntos, vidas y nivel. Ya lo muestra el reproductor vía `onHud`.

## Riesgos

| Riesgo                                                    | Mitigación                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Muchas partículas y balas sin límite bajan el rendimiento | Las partículas viven como máximo 1,1 s y las balas 1,1 s; el enfriamiento limita a 5 disparos/s. |
| `shadowBlur` en muchas partículas es costoso              | Dibujar las partículas con `shadowBlur = 0`.                                                     |
| El disparo triple atraviesa sin límite la partida         | Dura 5 s y solo hay un power-up por nivel.                                                       |
| Rocas generadas encima de la nave                         | Distancia mínima de 104 px al centro y 3 s de invulnerabilidad al empezar cada nivel.            |

## Lo que **no** entra en esta spec

- Cambios en el motor, `GameHud` o el reproductor.
- OVNIs, hiperespacio, vidas extra y otros power-ups.
- Sonido.
- Reinicio con `Space`.
- Persistencia de puntuaciones.
