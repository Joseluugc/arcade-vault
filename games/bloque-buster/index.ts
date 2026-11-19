import type { GameDefinition } from "../engine/types";
import { COLORS, drawText } from "../engine/palette";
import { PATTERNS } from "./levels";

const PADDLE_W = 80;
const PADDLE_H = 12;
const PADDLE_Y = 440;
const PADDLE_SPEED = 480; // px/s
const BALL_R = 4;
const MAX_ANGLE = Math.PI / 3; // ±60° en los extremos de la paleta
const MIN_VERTICAL = 0.3; // fracción mínima de la velocidad en vertical
const BRICK_COLS = 10;
const BRICK_W = 60;
const BRICK_H = 18;
const BRICK_GAP = 2;
const BRICK_X0 = (640 - BRICK_COLS * (BRICK_W + BRICK_GAP) + BRICK_GAP) / 2;
const BRICK_Y0 = 60;
const ROW_POINTS = [30, 30, 20, 20, 10, 10];
const ROW_COLORS = [COLORS.magenta, COLORS.magenta, COLORS.yellow, COLORS.yellow, COLORS.green, COLORS.green];

interface Brick { x: number; y: number; w: number; h: number; points: number; alive: boolean; row: number }

interface BreakoutState {
  paddle: { x: number; w: number; h: number };
  ball: { x: number; y: number; vx: number; vy: number; r: number; stuck: boolean };
  bricks: Brick[];
  lives: number;
  score: number;
  level: number;
}

const speedFor = (level: number) => 300 + 30 * (level - 1);

function buildBricks(level: number): Brick[] {
  const pattern = PATTERNS[(level - 1) % PATTERNS.length];
  return pattern.flatMap((line, row) =>
    [...line].flatMap((ch, col) =>
      ch === "#"
        ? [{
            x: BRICK_X0 + col * (BRICK_W + BRICK_GAP),
            y: BRICK_Y0 + row * (BRICK_H + BRICK_GAP),
            w: BRICK_W,
            h: BRICK_H,
            points: ROW_POINTS[row],
            alive: true,
            row,
          }]
        : [],
    ),
  );
}

export const bloqueBusterGame: GameDefinition = {
  id: "bloque-buster",
  create(ctx) {
    const { input } = ctx;
    const s: BreakoutState = {
      paddle: { x: (ctx.width - PADDLE_W) / 2, w: PADDLE_W, h: PADDLE_H },
      ball: { x: 0, y: 0, vx: 0, vy: 0, r: BALL_R, stuck: true },
      bricks: buildBricks(1),
      lives: 3,
      score: 0,
      level: 1,
    };
    let over = false;

    const emitHud = () => ctx.onHud({ score: s.score, lives: s.lives, level: s.level });

    const stickBall = () => {
      s.ball.stuck = true;
      s.ball.vx = 0;
      s.ball.vy = 0;
    };

    /** Fija la velocidad en `angle` (0 = vertical hacia arriba) con el módulo del nivel. */
    const launchAt = (angle: number) => {
      const speed = speedFor(s.level);
      s.ball.vx = speed * Math.sin(angle);
      s.ball.vy = -speed * Math.cos(angle);
    };

    /** Evita bucles casi horizontales: garantiza una componente vertical mínima. */
    const keepVertical = () => {
      const speed = Math.hypot(s.ball.vx, s.ball.vy);
      const min = speed * MIN_VERTICAL;
      if (Math.abs(s.ball.vy) >= min) return;
      s.ball.vy = Math.sign(s.ball.vy || -1) * min;
      s.ball.vx = Math.sign(s.ball.vx || 1) * Math.sqrt(speed * speed - min * min);
    };

    const loseLife = () => {
      s.lives--;
      emitHud();
      if (s.lives <= 0) {
        over = true;
        ctx.onGameOver(s.score);
        return;
      }
      stickBall();
    };

    const nextLevel = () => {
      s.level++;
      s.bricks = buildBricks(s.level);
      stickBall();
      emitHud();
    };

    /** Mueve la pelota un subpaso y resuelve como mucho una colisión con bloque. */
    const moveBall = (dt: number) => {
      const b = s.ball;
      const prevX = b.x;
      const prevY = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x + b.r > ctx.width) { b.x = ctx.width - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); }

      // Paleta: el rebote depende del punto de impacto
      const p = s.paddle;
      if (
        b.vy > 0 &&
        b.y + b.r >= PADDLE_Y && prevY + b.r <= PADDLE_Y + p.h &&
        b.x + b.r >= p.x && b.x - b.r <= p.x + p.w
      ) {
        const offset = Math.max(-1, Math.min(1, (b.x - (p.x + p.w / 2)) / (p.w / 2)));
        launchAt(offset * MAX_ANGLE);
        b.y = PADDLE_Y - b.r;
      }

      for (const brick of s.bricks) {
        if (!brick.alive) continue;
        if (
          b.x + b.r < brick.x || b.x - b.r > brick.x + brick.w ||
          b.y + b.r < brick.y || b.y - b.r > brick.y + brick.h
        ) continue;
        brick.alive = false;
        s.score += brick.points;
        // Si antes ya solapaba en horizontal, el choque fue por arriba o por abajo.
        const wasOverlappingX = prevX + b.r >= brick.x && prevX - b.r <= brick.x + brick.w;
        if (wasOverlappingX) b.vy = -b.vy;
        else b.vx = -b.vx;
        b.x = prevX;
        b.y = prevY;
        keepVertical();
        emitHud();
        if (s.bricks.every((k) => !k.alive)) nextLevel();
        return;
      }

      if (b.y - b.r > ctx.height) loseLife();
    };

    emitHud();

    return {
      update(dtMs) {
        if (over) return;
        const dt = dtMs / 1000;
        const p = s.paddle;
        const left = input.isDown("ArrowLeft") || input.isDown("KeyA");
        const right = input.isDown("ArrowRight") || input.isDown("KeyD");
        if (left) p.x -= PADDLE_SPEED * dt;
        if (right) p.x += PADDLE_SPEED * dt;
        p.x = Math.max(0, Math.min(ctx.width - p.w, p.x));

        const b = s.ball;
        if (b.stuck) {
          b.x = p.x + p.w / 2;
          b.y = PADDLE_Y - b.r;
          if (input.wasPressed("Space")) {
            b.stuck = false;
            launchAt(0);
          }
          return;
        }

        // Subdividir para que la pelota no atraviese bloques (efecto túnel)
        const dist = Math.hypot(b.vx, b.vy) * dt;
        const steps = Math.max(1, Math.ceil(dist / b.r));
        for (let i = 0; i < steps && !over && !b.stuck; i++) moveBall(dt / steps);
      },
      render(g) {
        g.fillStyle = COLORS.bg;
        g.fillRect(0, 0, ctx.width, ctx.height);

        for (const k of s.bricks) {
          if (!k.alive) continue;
          g.fillStyle = ROW_COLORS[k.row];
          g.fillRect(k.x, k.y, k.w, k.h);
          g.fillStyle = "rgba(255,255,255,0.3)";
          g.fillRect(k.x, k.y, k.w, 3);
          g.fillStyle = "rgba(0,0,0,0.25)";
          g.fillRect(k.x, k.y + k.h - 3, k.w, 3);
        }

        g.shadowBlur = 12;
        g.shadowColor = COLORS.cyan;
        g.fillStyle = COLORS.cyan;
        g.fillRect(Math.round(s.paddle.x), PADDLE_Y, s.paddle.w, s.paddle.h);
        g.shadowColor = COLORS.ink;
        g.fillStyle = COLORS.ink;
        g.beginPath();
        g.arc(s.ball.x, s.ball.y, s.ball.r, 0, Math.PI * 2);
        g.fill();
        g.shadowBlur = 0;

        if (s.ball.stuck && !over) {
          drawText(g, "ESPACIO PARA LANZAR", ctx.width / 2, 380, {
            size: 14,
            color: COLORS.yellow,
            align: "center",
          });
        }
      },
    };
  },
};
