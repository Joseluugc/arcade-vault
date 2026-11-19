import type { GameDefinition } from "../engine/types";
import { COLORS } from "../engine/palette";

const CELL = 20;
const COLS = 32;
const ROWS = 24;
const FOODS_PER_LEVEL = 5;

type Cell = { x: number; y: number };

interface SnakeState {
  body: Cell[]; // body[0] = cabeza
  dir: Cell;
  nextDir: Cell;
  food: Cell;
  eaten: number;
  score: number;
  level: number;
  tickMs: number;
}

const DIRECTIONS: { keys: string[]; dir: Cell }[] = [
  { keys: ["ArrowUp", "KeyW"], dir: { x: 0, y: -1 } },
  { keys: ["ArrowDown", "KeyS"], dir: { x: 0, y: 1 } },
  { keys: ["ArrowLeft", "KeyA"], dir: { x: -1, y: 0 } },
  { keys: ["ArrowRight", "KeyD"], dir: { x: 1, y: 0 } },
];

const tickFor = (level: number) => Math.max(60, 150 - 15 * (level - 1));
const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;

export const serpentinaGame: GameDefinition = {
  id: "serpentina",
  create(ctx) {
    const cx = COLS / 2;
    const cy = ROWS / 2;
    const s: SnakeState = {
      body: [
        { x: cx, y: cy },
        { x: cx - 1, y: cy },
        { x: cx - 2, y: cy },
      ],
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      food: { x: 0, y: 0 },
      eaten: 0,
      score: 0,
      level: 1,
      tickMs: tickFor(1),
    };
    let acc = 0;
    let over = false;

    const emitHud = () =>
      ctx.onHud({ score: s.score, lives: null, level: s.level });

    const end = () => {
      over = true;
      ctx.onGameOver(s.score);
    };

    /** Coloca la comida en una celda libre al azar; sin hueco, la partida termina. */
    const placeFood = () => {
      const free: Cell[] = [];
      for (let y = 0; y < ROWS; y++)
        for (let x = 0; x < COLS; x++)
          if (!s.body.some((b) => b.x === x && b.y === y)) free.push({ x, y });
      if (free.length === 0) return end();
      s.food = free[Math.floor(Math.random() * free.length)];
    };

    const step = () => {
      s.dir = s.nextDir;
      const head = { x: s.body[0].x + s.dir.x, y: s.body[0].y + s.dir.y };
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS)
        return end();

      const grows = same(head, s.food);
      // Si no crece, la cola deja libre su celda en este mismo paso.
      const obstacles = grows ? s.body : s.body.slice(0, -1);
      if (obstacles.some((b) => same(b, head))) return end();

      s.body.unshift(head);
      if (!grows) {
        s.body.pop();
        return;
      }
      s.eaten++;
      s.score += 10 * s.level;
      if (s.eaten % FOODS_PER_LEVEL === 0) {
        s.level++;
        s.tickMs = tickFor(s.level);
      }
      placeFood();
      emitHud();
    };

    placeFood();
    emitHud();

    return {
      update(dtMs) {
        if (over) return;
        for (const { keys, dir } of DIRECTIONS) {
          const reverse = dir.x === -s.dir.x && dir.y === -s.dir.y;
          if (!reverse && keys.some((k) => ctx.input.wasPressed(k)))
            s.nextDir = dir;
        }
        acc += dtMs;
        while (acc >= s.tickMs && !over) {
          acc -= s.tickMs;
          step();
        }
      },
      render(g) {
        g.fillStyle = COLORS.bg;
        g.fillRect(0, 0, ctx.width, ctx.height);

        g.fillStyle = "rgba(0, 245, 255, 0.08)";
        for (let y = 0; y < ROWS; y++)
          for (let x = 0; x < COLS; x++)
            g.fillRect(x * CELL + CELL / 2 - 1, y * CELL + CELL / 2 - 1, 2, 2);

        g.shadowBlur = 12;
        g.shadowColor = COLORS.magenta;
        g.fillStyle = COLORS.magenta;
        g.fillRect(s.food.x * CELL + 4, s.food.y * CELL + 4, CELL - 8, CELL - 8);

        g.shadowColor = COLORS.green;
        s.body.forEach((b, i) => {
          g.fillStyle = i === 0 ? COLORS.ink : COLORS.green;
          g.fillRect(b.x * CELL + 1, b.y * CELL + 1, CELL - 2, CELL - 2);
        });
        g.shadowBlur = 0;
      },
    };
  },
};
