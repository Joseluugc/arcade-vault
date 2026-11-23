import type { GameDefinition } from "../engine/types";
import { COLORS, drawText } from "../engine/palette";
// Port de references/started-games/02-asteroids/game.js (800×600) escalado ×0,8 a 640×480.
type RockSize = 1 | 2 | 3; // 1 pequeña, 2 mediana, 3 grande
const ROCK_RADIUS: Record<RockSize, number> = { 1: 13, 2: 24, 3: 40 };
const ROCK_SPEED: Record<RockSize, number> = { 1: 68, 2: 44, 3: 26 };
const ROCK_SPEED_JITTER = 12;
const ROCK_POINTS: Record<RockSize, number> = { 1: 100, 2: 50, 3: 20 };
const SHIP_RADIUS = 10;
const SHIP_HIT_FACTOR = 0.82; // radio efectivo de la roca contra la nave, como en la referencia
const NOSE = 17;
const ROTATE_SPEED = 3.5; // rad/s
const THRUST = 208; // px/s²
const DRAG = 0.987; // por paso de simulación
const BULLET_SPEED = 416;
const BULLET_TTL = 1.1; // s
const BULLET_RADIUS = 1.6;
const SHOOT_COOLDOWN = 0.2; // s
const SAFE_DISTANCE = 104;
const INVINCIBLE_TIME = 3; // s
const DEAD_TIME = 2; // s hasta reaparecer
const ROCK_PARTICLES_PER_SIZE = 5;
const SHIP_PARTICLES = 14;
const POWERUP_DROP_CHANCE = 0.15;
const POWERUP_GUARANTEED_KILLS = 5; // seguro en la 5.ª roca destruida del nivel
const POWERUP_TTL = 12; // s en pantalla
const POWERUP_BLINK = 2; // s finales parpadeando
const POWERUP_DURATION = 5; // s de disparo triple
const POWERUP_RADIUS = 10;
const TRIPLE_SPREAD = 0.18; // rad
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
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
function makeRock(x: number, y: number, size: RockSize): Rock {
  const dir = rand(0, Math.PI * 2);
  const speed = ROCK_SPEED[size] + rand(-ROCK_SPEED_JITTER, ROCK_SPEED_JITTER);
  const n = randInt(8, 13);
  const verts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = ROCK_RADIUS[size] * rand(0.6, 1);
    verts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return {
    x,
    y,
    vx: Math.cos(dir) * speed,
    vy: Math.sin(dir) * speed,
    size,
    rot: rand(0, Math.PI * 2),
    rotSpeed: rand(-1.2, 1.2),
    verts,
  };
}
export const rocasGame: GameDefinition = {
  id: "rocas",
  create(ctx) {
    const { input, width: W, height: H } = ctx;
    const s: RocksState = {
      ship: {
        x: W / 2,
        y: H / 2,
        vx: 0,
        vy: 0,
        angle: -Math.PI / 2,
        invincible: INVINCIBLE_TIME,
        cooldown: 0,
        tripleShot: 0,
        thrusting: false,
      },
      rocks: [],
      bullets: [],
      powerUps: [],
      particles: [],
      phase: "playing",
      deadTimer: 0,
      powerUpSpawned: false,
      killsSinceSpawn: 0,
      lives: 3,
      score: 0,
      level: 1,
    };
    const emitHud = () =>
      ctx.onHud({ score: s.score, lives: s.lives, level: s.level });
    /** Envoltura toroidal: lo que sale por un borde entra por el opuesto. */
    const move = (
      o: { x: number; y: number; vx: number; vy: number },
      dt: number,
    ) => {
      o.x = (((o.x + o.vx * dt) % W) + W) % W;
      o.y = (((o.y + o.vy * dt) % H) + H) % H;
    };
    const spawnRocks = (count: number) => {
      for (let i = 0; i < count; i++) {
        let x: number;
        let y: number;
        do {
          x = rand(0, W);
          y = rand(0, H);
        } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DISTANCE);
        s.rocks.push(makeRock(x, y, 3));
      }
    };
    const explode = (x: number, y: number, count: number, color: string) => {
      for (let i = 0; i < count; i++) {
        const dir = rand(0, Math.PI * 2);
        const speed = rand(24, 104);
        const life = rand(0.4, 1.1);
        s.particles.push({
          x,
          y,
          vx: Math.cos(dir) * speed,
          vy: Math.sin(dir) * speed,
          life,
          ttl: life,
          color,
        });
      }
    };
    /** Máximo uno por nivel: 15 % por roca destruida o seguro en la 5.ª. */
    const maybeSpawnPowerUp = (x: number, y: number) => {
      if (s.powerUpSpawned) return;
      s.killsSinceSpawn++;
      if (
        s.killsSinceSpawn < POWERUP_GUARANTEED_KILLS &&
        Math.random() >= POWERUP_DROP_CHANCE
      )
        return;
      const dir = rand(0, Math.PI * 2);
      const speed = rand(16, 32);
      s.powerUps.push({
        x,
        y,
        vx: Math.cos(dir) * speed,
        vy: Math.sin(dir) * speed,
        ttl: POWERUP_TTL,
      });
      s.powerUpSpawned = true;
    };
    /** Centro, mirando hacia arriba, parada y con invulnerabilidad. El disparo triple se conserva. */
    const resetShip = () => {
      Object.assign(s.ship, {
        x: W / 2,
        y: H / 2,
        vx: 0,
        vy: 0,
        angle: -Math.PI / 2,
        invincible: INVINCIBLE_TIME,
        cooldown: 0,
        thrusting: false,
      });
    };
    const nextLevel = () => {
      s.level++;
      s.bullets = [];
      s.particles = [];
      s.powerUps = [];
      s.powerUpSpawned = false;
      s.killsSinceSpawn = 0;
      resetShip();
      spawnRocks(3 + s.level);
      emitHud();
    };
    const killShip = () => {
      explode(s.ship.x, s.ship.y, SHIP_PARTICLES, COLORS.yellow);
      s.lives--;
      emitHud();
      if (s.lives <= 0) {
        s.phase = "over";
        ctx.onGameOver(s.score);
      } else {
        s.phase = "dead";
        s.deadTimer = DEAD_TIME;
      }
    };
    const tryShoot = () => {
      const ship = s.ship;
      if (ship.cooldown > 0) return;
      ship.cooldown = SHOOT_COOLDOWN;
      const ox = ship.x + Math.cos(ship.angle) * NOSE;
      const oy = ship.y + Math.sin(ship.angle) * NOSE;
      const angles =
        ship.tripleShot > 0
          ? [ship.angle - TRIPLE_SPREAD, ship.angle, ship.angle + TRIPLE_SPREAD]
          : [ship.angle];
      for (const a of angles)
        s.bullets.push({
          x: ox,
          y: oy,
          vx: ship.vx + Math.cos(a) * BULLET_SPEED,
          vy: ship.vy + Math.sin(a) * BULLET_SPEED,
          ttl: BULLET_TTL,
        });
    };
    const updateShip = (dt: number) => {
      const ship = s.ship;
      if (ship.invincible > 0) ship.invincible -= dt;
      if (ship.cooldown > 0) ship.cooldown -= dt;
      if (ship.tripleShot > 0)
        ship.tripleShot = Math.max(0, ship.tripleShot - dt);
      if (input.isDown("ArrowLeft") || input.isDown("KeyA"))
        ship.angle -= ROTATE_SPEED * dt;
      if (input.isDown("ArrowRight") || input.isDown("KeyD"))
        ship.angle += ROTATE_SPEED * dt;
      ship.thrusting = input.isDown("ArrowUp") || input.isDown("KeyW");
      if (ship.thrusting) {
        ship.vx += Math.cos(ship.angle) * THRUST * dt;
        ship.vy += Math.sin(ship.angle) * THRUST * dt;
      }
      ship.vx *= DRAG;
      ship.vy *= DRAG;
      move(ship, dt);
    };
    spawnRocks(4);
    emitHud();
    return {
      update(dtMs) {
        if (s.phase === "over") return;
        const dt = dtMs / 1000;
        if (s.phase === "dead") {
          // La nave no se ve ni se controla; el resto del mundo sigue moviéndose
          s.deadTimer -= dt;
          if (s.deadTimer <= 0) {
            s.phase = "playing";
            resetShip();
          }
        } else {
          if (input.wasPressed("Space")) tryShoot();
          updateShip(dt);
        }
        for (const b of s.bullets) {
          move(b, dt);
          b.ttl -= dt;
        }
        s.bullets = s.bullets.filter((b) => b.ttl > 0);
        for (const p of s.powerUps) {
          move(p, dt);
          p.ttl -= dt;
        }
        s.powerUps = s.powerUps.filter((p) => p.ttl > 0);
        // Las partículas no envuelven
        for (const p of s.particles) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.ttl -= dt;
        }
        s.particles = s.particles.filter((p) => p.ttl > 0);
        for (const r of s.rocks) {
          move(r, dt);
          r.rot += r.rotSpeed * dt;
        }
        // Bala contra roca: la roca se divide y la bala desaparece
        const hitRocks = new Set<Rock>();
        const hitBullets = new Set<Bullet>();
        const newRocks: Rock[] = [];
        for (const b of s.bullets) {
          for (const r of s.rocks) {
            if (hitRocks.has(r) || hitBullets.has(b)) continue;
            if (Math.hypot(b.x - r.x, b.y - r.y) >= ROCK_RADIUS[r.size])
              continue;
            hitBullets.add(b);
            hitRocks.add(r);
            s.score += ROCK_POINTS[r.size];
            explode(r.x, r.y, r.size * ROCK_PARTICLES_PER_SIZE, COLORS.cyan);
            maybeSpawnPowerUp(r.x, r.y);
            if (r.size > 1) {
              const next = (r.size - 1) as RockSize;
              newRocks.push(makeRock(r.x, r.y, next), makeRock(r.x, r.y, next));
            }
          }
        }
        if (hitRocks.size > 0) {
          s.rocks = s.rocks.filter((r) => !hitRocks.has(r)).concat(newRocks);
          s.bullets = s.bullets.filter((b) => !hitBullets.has(b));
          emitHud();
        }
        if (s.phase !== "playing") return;
        const ship = s.ship;
        // Nave contra power-up
        const picked = s.powerUps.filter(
          (p) =>
            Math.hypot(ship.x - p.x, ship.y - p.y) <
            SHIP_RADIUS + POWERUP_RADIUS,
        );
        if (picked.length > 0) {
          ship.tripleShot = POWERUP_DURATION;
          s.powerUps = s.powerUps.filter((p) => !picked.includes(p));
        }
        // Nave contra roca: la roca no se rompe ni suma puntos
        if (
          ship.invincible <= 0 &&
          s.rocks.some(
            (r) =>
              Math.hypot(ship.x - r.x, ship.y - r.y) <
              SHIP_RADIUS + ROCK_RADIUS[r.size] * SHIP_HIT_FACTOR,
          )
        ) {
          killShip();
          return;
        }
        if (s.rocks.length === 0) nextLevel();
      },
      render(g) {
        g.fillStyle = COLORS.bg;
        g.fillRect(0, 0, W, H);
        g.lineWidth = 2;
        g.lineJoin = "round";
        // Partículas sin brillo: shadowBlur en muchas es costoso
        g.shadowBlur = 0;
        g.lineWidth = 1;
        for (const p of s.particles) {
          g.globalAlpha = p.ttl / p.life;
          g.strokeStyle = p.color;
          g.beginPath();
          g.moveTo(p.x, p.y);
          g.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
          g.stroke();
        }
        g.globalAlpha = 1;
        g.lineWidth = 2;
        // Dibuja en la posición y en sus copias envueltas para que el cruce de borde sea continuo
        const drawWrapped = (
          x: number,
          y: number,
          r: number,
          draw: (x: number, y: number) => void,
        ) => {
          for (const dx of [-W, 0, W])
            for (const dy of [-H, 0, H]) {
              const px = x + dx;
              const py = y + dy;
              if (px + r < 0 || px - r > W || py + r < 0 || py - r > H)
                continue;
              draw(px, py);
            }
        };
        g.strokeStyle = COLORS.cyan;
        g.shadowColor = COLORS.cyan;
        g.shadowBlur = 8;
        for (const rock of s.rocks) {
          drawWrapped(rock.x, rock.y, ROCK_RADIUS[rock.size], (x, y) => {
            g.save();
            g.translate(x, y);
            g.rotate(rock.rot);
            g.beginPath();
            g.moveTo(rock.verts[0][0], rock.verts[0][1]);
            for (let i = 1; i < rock.verts.length; i++)
              g.lineTo(rock.verts[i][0], rock.verts[i][1]);
            g.closePath();
            g.stroke();
            g.restore();
          });
        }
        g.fillStyle = COLORS.ink;
        g.shadowColor = COLORS.ink;
        for (const b of s.bullets) {
          drawWrapped(b.x, b.y, BULLET_RADIUS, (x, y) => {
            g.beginPath();
            g.arc(x, y, BULLET_RADIUS, 0, Math.PI * 2);
            g.fill();
          });
        }
        // Power-up: cuadrado rotado 45° que pulsa, con "3x"; parpadea al final
        const pulse = 0.85 + Math.sin(performance.now() / 150) * 0.15;
        g.strokeStyle = COLORS.magenta;
        g.fillStyle = COLORS.magenta;
        g.shadowColor = COLORS.magenta;
        for (const p of s.powerUps) {
          if (p.ttl < POWERUP_BLINK && Math.floor(p.ttl * 8) % 2 === 0)
            continue;
          drawWrapped(p.x, p.y, POWERUP_RADIUS * 1.5, (x, y) => {
            const r = POWERUP_RADIUS * pulse;
            g.save();
            g.translate(x, y);
            g.rotate(Math.PI / 4);
            g.strokeRect(-r, -r, r * 2, r * 2);
            g.restore();
            g.font = "bold 10px monospace";
            g.textAlign = "center";
            g.textBaseline = "middle";
            g.fillText("3x", x, y);
          });
        }
        const ship = s.ship;
        // Parpadeo durante la invulnerabilidad de reaparición
        const blinkOff =
          ship.invincible > 0 && Math.floor(ship.invincible * 8) % 2 === 0;
        if (s.phase === "playing" && !blinkOff)
          drawWrapped(ship.x, ship.y, NOSE, (x, y) => {
            g.save();
            g.translate(x, y);
            g.rotate(ship.angle);
            // Silueta clásica: triángulo con muesca trasera
            g.strokeStyle = COLORS.yellow;
            g.shadowColor = COLORS.yellow;
            g.beginPath();
            g.moveTo(16, 0);
            g.lineTo(-9.6, -7.2);
            g.lineTo(-5.6, 0);
            g.lineTo(-9.6, 7.2);
            g.closePath();
            g.stroke();
            // Llama del propulsor
            if (ship.thrusting && Math.random() > 0.35) {
              g.strokeStyle = COLORS.magenta;
              g.shadowColor = COLORS.magenta;
              g.beginPath();
              g.moveTo(-6.4, -3.2);
              g.lineTo(-6.4 - rand(5, 11), 0);
              g.lineTo(-6.4, 3.2);
              g.stroke();
            }
            g.restore();
          });
        g.shadowBlur = 0;
        if (ship.tripleShot > 0)
          drawText(g, `3x  ${ship.tripleShot.toFixed(1)}s`, 12, 24, {
            color: COLORS.magenta,
          });
      },
    };
  },
};
