import type { GameDefinition } from "../engine/types";
import { COLORS } from "../engine/palette";

const COLS = 11;
const ROWS = 5;
const CELL_W = 36;
const CELL_H = 28;
const ALIEN_W = 24;
const ALIEN_H = 15;
const FORMATION_W = (COLS - 1) * CELL_W + ALIEN_W;
const STEP_X = 8;
const DROP_Y = 16;
const MARGIN = 8;
const TOP_Y = 60;
const MAX_LEVEL_DROPS = 5;
const ROW_POINTS = [30, 20, 20, 10, 10];

const PLAYER_Y = 440;
const PLAYER_W = 26;
const PLAYER_H = 14;
const PLAYER_SPEED = 260; // px/s
const PLAYER_BULLET_SPEED = 480;
const ALIEN_BULLET_SPEED = 220;
const MAX_ALIEN_BULLETS = 3;
const RESPAWN_MS = 1000;

/** Sprites de 8×5 píxeles escalados ×3, uno por tipo de fila. */
const SPRITES = [
  ["..####..", ".######.", "##.##.##", "########", ".#.##.#."],
  ["#..##..#", ".######.", "##.##.##", ".######.", "#......#"],
  [".######.", "########", "#.#..#.#", "########", ".#....#."],
];
const SPRITE_FOR_ROW = [0, 1, 1, 2, 2];
const COLOR_FOR_ROW = [COLORS.magenta, COLORS.cyan, COLORS.cyan, COLORS.green, COLORS.green];

interface Alien { col: number; row: number; alive: boolean; points: number }
interface Bullet { x: number; y: number; vy: number }

interface InvadersState {
  player: { x: number };
  aliens: Alien[];
  offset: { x: number; y: number };
  stepDir: 1 | -1;
  stepMs: number;
  playerBullet: Bullet | null;
  alienBullets: Bullet[];
  lives: number;
  score: number;
  level: number;
}

const overlaps = (
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

export const invasoresGame: GameDefinition = {
  id: "invasores",
  create(ctx) {
    const { input } = ctx;
    const s: InvadersState = {
      player: { x: ctx.width / 2 },
      aliens: [],
      offset: { x: 0, y: 0 },
      stepDir: 1,
      stepMs: 0,
      playerBullet: null,
      alienBullets: [],
      lives: 3,
      score: 0,
      level: 1,
    };
    let stepAcc = 0;
    let fireAcc = 0;
    let nextFireMs = 0;
    let respawnMs = 0;
    let over = false;

    const emitHud = () => ctx.onHud({ score: s.score, lives: s.lives, level: s.level });
    const alive = () => s.aliens.filter((a) => a.alive);
    const alienX = (a: Alien) => s.offset.x + a.col * CELL_W;
    const alienY = (a: Alien) => s.offset.y + a.row * CELL_H;

    const updateStepMs = () => {
      const base = 600 - 50 * (s.level - 1);
      s.stepMs = Math.max(50, (base * alive().length) / (ROWS * COLS));
    };

    const scheduleFire = () => {
      nextFireMs = (500 + Math.random() * 800) / (1 + 0.15 * (s.level - 1));
      fireAcc = 0;
    };

    const startWave = () => {
      s.aliens = [];
      for (let row = 0; row < ROWS; row++)
        for (let col = 0; col < COLS; col++)
          s.aliens.push({ col, row, alive: true, points: ROW_POINTS[row] });
      s.offset = {
        x: (ctx.width - FORMATION_W) / 2,
        y: TOP_Y + DROP_Y * Math.min(s.level - 1, MAX_LEVEL_DROPS),
      };
      s.stepDir = 1;
      s.playerBullet = null;
      s.alienBullets = [];
      stepAcc = 0;
      updateStepMs();
      scheduleFire();
    };

    const end = () => {
      over = true;
      ctx.onGameOver(s.score);
    };

    /** Un paso lateral; al tocar un borde baja e invierte la dirección. */
    const stepFormation = () => {
      const living = alive();
      const minCol = Math.min(...living.map((a) => a.col));
      const maxCol = Math.max(...living.map((a) => a.col));
      const nextX = s.offset.x + STEP_X * s.stepDir;
      const left = nextX + minCol * CELL_W;
      const right = nextX + maxCol * CELL_W + ALIEN_W;
      if (left < MARGIN || right > ctx.width - MARGIN) {
        s.offset.y += DROP_Y;
        s.stepDir = s.stepDir === 1 ? -1 : 1;
      } else {
        s.offset.x = nextX;
      }
      const lowest = Math.max(...living.map((a) => alienY(a) + ALIEN_H));
      if (lowest >= PLAYER_Y) end();
    };

    /** Dispara desde el alien más bajo de una columna viva al azar. */
    const alienFire = () => {
      if (s.alienBullets.length >= MAX_ALIEN_BULLETS) return;
      const living = alive();
      const cols = [...new Set(living.map((a) => a.col))];
      const col = cols[Math.floor(Math.random() * cols.length)];
      const shooter = living
        .filter((a) => a.col === col)
        .reduce((low, a) => (a.row > low.row ? a : low));
      s.alienBullets.push({
        x: alienX(shooter) + ALIEN_W / 2,
        y: alienY(shooter) + ALIEN_H,
        vy: ALIEN_BULLET_SPEED,
      });
    };

    const hitPlayer = () => {
      s.lives--;
      s.alienBullets = [];
      emitHud();
      if (s.lives <= 0) return end();
      respawnMs = RESPAWN_MS;
    };

    startWave();
    emitHud();

    return {
      update(dtMs) {
        if (over) return;
        const dt = dtMs / 1000;

        if (respawnMs > 0) {
          respawnMs -= dtMs;
        } else {
          const left = input.isDown("ArrowLeft") || input.isDown("KeyA");
          const right = input.isDown("ArrowRight") || input.isDown("KeyD");
          if (left) s.player.x -= PLAYER_SPEED * dt;
          if (right) s.player.x += PLAYER_SPEED * dt;
          s.player.x = Math.max(PLAYER_W / 2, Math.min(ctx.width - PLAYER_W / 2, s.player.x));
          // Solo una bala propia en pantalla
          if (input.isDown("Space") && !s.playerBullet)
            s.playerBullet = { x: s.player.x, y: PLAYER_Y - 10, vy: -PLAYER_BULLET_SPEED };
        }

        stepAcc += dtMs;
        while (stepAcc >= s.stepMs && !over) {
          stepAcc -= s.stepMs;
          stepFormation();
        }
        if (over) return;

        fireAcc += dtMs;
        if (fireAcc >= nextFireMs) {
          alienFire();
          scheduleFire();
        }

        // Bala propia
        const pb = s.playerBullet;
        if (pb) {
          pb.y += pb.vy * dt;
          if (pb.y < 0) s.playerBullet = null;
          else {
            const target = alive().find((a) =>
              overlaps(pb.x - 1, pb.y, 2, 10, alienX(a), alienY(a), ALIEN_W, ALIEN_H),
            );
            if (target) {
              target.alive = false;
              s.playerBullet = null;
              s.score += target.points;
              updateStepMs();
              emitHud();
              if (alive().length === 0) {
                s.level++;
                startWave();
                emitHud();
                return;
              }
            }
          }
        }

        // Balas enemigas
        for (const b of s.alienBullets) b.y += b.vy * dt;
        s.alienBullets = s.alienBullets.filter((b) => b.y < ctx.height);
        if (respawnMs <= 0) {
          const hit = s.alienBullets.some((b) =>
            overlaps(b.x - 1.5, b.y, 3, 10, s.player.x - PLAYER_W / 2, PLAYER_Y, PLAYER_W, PLAYER_H),
          );
          if (hit) hitPlayer();
        }
      },
      render(g) {
        g.fillStyle = COLORS.bg;
        g.fillRect(0, 0, ctx.width, ctx.height);

        for (const a of s.aliens) {
          if (!a.alive) continue;
          const sprite = SPRITES[SPRITE_FOR_ROW[a.row]];
          g.fillStyle = COLOR_FOR_ROW[a.row];
          const x0 = Math.round(alienX(a));
          const y0 = Math.round(alienY(a));
          sprite.forEach((line, py) =>
            [...line].forEach((ch, px) => ch === "#" && g.fillRect(x0 + px * 3, y0 + py * 3, 3, 3)),
          );
        }

        // Cañón (parpadea al reaparecer)
        if (respawnMs <= 0 || Math.floor(respawnMs / 100) % 2 === 0) {
          const x = Math.round(s.player.x - PLAYER_W / 2);
          g.fillStyle = COLORS.yellow;
          g.shadowBlur = 10;
          g.shadowColor = COLORS.yellow;
          g.fillRect(x, PLAYER_Y + 6, PLAYER_W, PLAYER_H - 6);
          g.fillRect(x + 4, PLAYER_Y + 3, PLAYER_W - 8, 3);
          g.fillRect(x + PLAYER_W / 2 - 2, PLAYER_Y - 2, 4, 5);
          g.shadowBlur = 0;
        }

        g.fillStyle = COLORS.ink;
        if (s.playerBullet) g.fillRect(s.playerBullet.x - 1, s.playerBullet.y, 2, 10);
        g.fillStyle = COLORS.magenta;
        for (const b of s.alienBullets) g.fillRect(b.x - 1.5, b.y, 3, 10);

        g.fillStyle = COLORS.green;
        g.fillRect(0, PLAYER_Y + PLAYER_H + 8, ctx.width, 2);
      },
    };
  },
};
