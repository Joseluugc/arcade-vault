import type { GameDefinition } from "../engine/types";
import { COLORS } from "../engine/palette";

const ROTATE_SPEED = 4; // rad/s
const THRUST = 320; // px/s²
const FRICTION = 0.5; // fracción de velocidad perdida por segundo (rozamiento leve)
const MAX_SPEED = 300; // px/s
const SHIP_R = 10;
const SHOT_SPEED = 480;
const SHOT_TTL_MS = 1000;
const MAX_SHOTS = 4;
const INVULN_MS = 2000;
const SAFE_DISTANCE = 150;
const SHAPE_POINTS = 11;

type RockSize = "large" | "medium" | "small";

const ROCK: Record<RockSize, { r: number; minSpeed: number; maxSpeed: number; points: number; next: RockSize | null }> = {
  large: { r: 40, minSpeed: 30, maxSpeed: 70, points: 20, next: "medium" },
  medium: { r: 22, minSpeed: 60, maxSpeed: 110, points: 50, next: "small" },
  small: { r: 12, minSpeed: 90, maxSpeed: 150, points: 100, next: null },
};

interface Rock { x: number; y: number; vx: number; vy: number; size: RockSize; shape: number[] }
interface Shot { x: number; y: number; vx: number; vy: number; ttlMs: number }

interface RocksState {
  ship: { x: number; y: number; vx: number; vy: number; angle: number; invulnMs: number };
  rocks: Rock[];
  shots: Shot[];
  lives: number;
  score: number;
  level: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function makeRock(x: number, y: number, size: RockSize): Rock {
  const { minSpeed, maxSpeed } = ROCK[size];
  const dir = rand(0, Math.PI * 2);
  const speed = rand(minSpeed, maxSpeed);
  return {
    x,
    y,
    vx: Math.cos(dir) * speed,
    vy: Math.sin(dir) * speed,
    size,
    // Radio relativo de cada vértice: forma irregular propia de cada roca
    shape: Array.from({ length: SHAPE_POINTS }, () => rand(0.72, 1.12)),
  };
}

export const rocasGame: GameDefinition = {
  id: "rocas",
  create(ctx) {
    const { input, width: W, height: H } = ctx;
    const s: RocksState = {
      ship: { x: W / 2, y: H / 2, vx: 0, vy: 0, angle: -Math.PI / 2, invulnMs: 0 },
      rocks: [],
      shots: [],
      lives: 3,
      score: 0,
      level: 1,
    };
    let thrusting = false;
    let over = false;

    const emitHud = () => ctx.onHud({ score: s.score, lives: s.lives, level: s.level });

    /** Envoltura toroidal: lo que sale por un borde entra por el opuesto. */
    const wrap = (o: { x: number; y: number }) => {
      o.x = ((o.x % W) + W) % W;
      o.y = ((o.y % H) + H) % H;
    };

    const startLevel = () => {
      s.rocks = [];
      s.shots = [];
      for (let i = 0; i < 3 + s.level; i++) {
        let x: number;
        let y: number;
        do {
          x = rand(0, W);
          y = rand(0, H);
        } while (Math.hypot(x - s.ship.x, y - s.ship.y) < SAFE_DISTANCE);
        s.rocks.push(makeRock(x, y, "large"));
      }
    };

    const destroyRock = (rock: Rock) => {
      s.rocks = s.rocks.filter((r) => r !== rock);
      s.score += ROCK[rock.size].points;
      const next = ROCK[rock.size].next;
      if (next) s.rocks.push(makeRock(rock.x, rock.y, next), makeRock(rock.x, rock.y, next));
      emitHud();
    };

    const loseLife = () => {
      s.lives--;
      emitHud();
      if (s.lives <= 0) {
        over = true;
        ctx.onGameOver(s.score);
        return;
      }
      Object.assign(s.ship, { x: W / 2, y: H / 2, vx: 0, vy: 0, angle: -Math.PI / 2, invulnMs: INVULN_MS });
    };

    startLevel();
    emitHud();

    return {
      update(dtMs) {
        if (over) return;
        const dt = dtMs / 1000;
        const ship = s.ship;

        // Nave: rotación, empuje, rozamiento y velocidad máxima
        if (input.isDown("ArrowLeft") || input.isDown("KeyA")) ship.angle -= ROTATE_SPEED * dt;
        if (input.isDown("ArrowRight") || input.isDown("KeyD")) ship.angle += ROTATE_SPEED * dt;
        thrusting = input.isDown("ArrowUp") || input.isDown("KeyW");
        if (thrusting) {
          ship.vx += Math.cos(ship.angle) * THRUST * dt;
          ship.vy += Math.sin(ship.angle) * THRUST * dt;
        }
        const drag = Math.max(0, 1 - FRICTION * dt);
        ship.vx *= drag;
        ship.vy *= drag;
        const speed = Math.hypot(ship.vx, ship.vy);
        if (speed > MAX_SPEED) {
          ship.vx *= MAX_SPEED / speed;
          ship.vy *= MAX_SPEED / speed;
        }
        ship.x += ship.vx * dt;
        ship.y += ship.vy * dt;
        wrap(ship);
        if (ship.invulnMs > 0) ship.invulnMs -= dtMs;

        if (input.wasPressed("Space") && s.shots.length < MAX_SHOTS) {
          const nose = { x: ship.x + Math.cos(ship.angle) * SHIP_R, y: ship.y + Math.sin(ship.angle) * SHIP_R };
          s.shots.push({
            ...nose,
            vx: ship.vx + Math.cos(ship.angle) * SHOT_SPEED,
            vy: ship.vy + Math.sin(ship.angle) * SHOT_SPEED,
            ttlMs: SHOT_TTL_MS,
          });
        }

        for (const shot of s.shots) {
          shot.x += shot.vx * dt;
          shot.y += shot.vy * dt;
          shot.ttlMs -= dtMs;
          wrap(shot);
        }
        s.shots = s.shots.filter((shot) => shot.ttlMs > 0);

        for (const rock of s.rocks) {
          rock.x += rock.vx * dt;
          rock.y += rock.vy * dt;
          wrap(rock);
        }

        // Disparos contra rocas (círculo-círculo)
        for (const shot of [...s.shots]) {
          const rock = s.rocks.find((r) => Math.hypot(r.x - shot.x, r.y - shot.y) < ROCK[r.size].r);
          if (!rock) continue;
          s.shots = s.shots.filter((x) => x !== shot);
          destroyRock(rock);
        }

        // Nave contra rocas
        if (ship.invulnMs <= 0) {
          const hit = s.rocks.find(
            (r) => Math.hypot(r.x - ship.x, r.y - ship.y) < ROCK[r.size].r * 0.85 + SHIP_R,
          );
          if (hit) {
            destroyRock(hit);
            loseLife();
            if (over) return;
          }
        }

        if (s.rocks.length === 0) {
          s.level++;
          startLevel();
          emitHud();
        }
      },
      render(g) {
        g.fillStyle = COLORS.bg;
        g.fillRect(0, 0, W, H);
        g.lineWidth = 2;
        g.lineJoin = "round";

        // Dibuja en la posición y en sus copias envueltas para que el cruce de borde sea continuo
        const drawWrapped = (x: number, y: number, r: number, draw: (x: number, y: number) => void) => {
          for (const dx of [-W, 0, W])
            for (const dy of [-H, 0, H]) {
              const px = x + dx;
              const py = y + dy;
              if (px + r < 0 || px - r > W || py + r < 0 || py - r > H) continue;
              draw(px, py);
            }
        };

        g.strokeStyle = COLORS.cyan;
        g.shadowBlur = 8;
        g.shadowColor = COLORS.cyan;
        for (const rock of s.rocks) {
          const r = ROCK[rock.size].r;
          drawWrapped(rock.x, rock.y, r * 1.2, (x, y) => {
            g.beginPath();
            rock.shape.forEach((k, i) => {
              const a = (i / rock.shape.length) * Math.PI * 2;
              const px = x + Math.cos(a) * r * k;
              const py = y + Math.sin(a) * r * k;
              if (i === 0) g.moveTo(px, py);
              else g.lineTo(px, py);
            });
            g.closePath();
            g.stroke();
          });
        }

        g.fillStyle = COLORS.ink;
        g.shadowColor = COLORS.ink;
        for (const shot of s.shots) g.fillRect(shot.x - 1.5, shot.y - 1.5, 3, 3);

        const ship = s.ship;
        const visible = ship.invulnMs <= 0 || Math.floor(ship.invulnMs / 120) % 2 === 0;
        if (visible && !over) {
          g.strokeStyle = COLORS.yellow;
          g.shadowColor = COLORS.yellow;
          drawWrapped(ship.x, ship.y, SHIP_R * 2, (x, y) => {
            const pt = (angle: number, r: number) => [x + Math.cos(ship.angle + angle) * r, y + Math.sin(ship.angle + angle) * r] as const;
            g.beginPath();
            g.moveTo(...pt(0, SHIP_R * 1.4));
            g.lineTo(...pt(2.5, SHIP_R));
            g.lineTo(...pt(Math.PI, SHIP_R * 0.4));
            g.lineTo(...pt(-2.5, SHIP_R));
            g.closePath();
            g.stroke();
            if (thrusting && Math.random() < 0.7) {
              g.strokeStyle = COLORS.magenta;
              g.beginPath();
              g.moveTo(...pt(2.8, SHIP_R * 0.7));
              g.lineTo(...pt(Math.PI, SHIP_R * 1.5));
              g.lineTo(...pt(-2.8, SHIP_R * 0.7));
              g.stroke();
              g.strokeStyle = COLORS.yellow;
            }
          });
        }
        g.shadowBlur = 0;
      },
    };
  },
};
