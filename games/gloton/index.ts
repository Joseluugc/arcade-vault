import type { GameDefinition } from "../engine/types";
import { COLORS, drawText } from "../engine/palette";
import { MAZE } from "./maze";

const CELL = 15;
const COLS = MAZE[0].length;
const ROWS = MAZE.length;
const OX = Math.floor((640 - COLS * CELL) / 2);
const OY = Math.floor((480 - ROWS * CELL) / 2);

const PLAYER_SPEED = 8; // celdas/s
const GHOST_SPEED = 7; // celdas/s en nivel 1
const HOUSE_SPEED = 4; // celdas/s al salir de la casa
const RELEASE_GAP_MS = 3000;
const READY_MS = 1500;
const RANDOM_TURN = 0.2;
const GHOST_COLORS = [COLORS.magenta, COLORS.cyan, COLORS.green, COLORS.gold];

type Dir = "up" | "down" | "left" | "right";
type Cell = { x: number; y: number };

const VEC: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };
const DIRS: Dir[] = ["up", "left", "down", "right"];
const KEYS: Record<Dir, string[]> = {
  up: ["ArrowUp", "KeyW"],
  down: ["ArrowDown", "KeyS"],
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
};

/**
 * Posición sobre la rejilla: celda de partida (x, y) y avance `t` ∈ [0, 1)
 * hacia la celda vecina en `dir`. Con t = 0 la entidad está centrada en su celda.
 */
interface Mover {
  x: number;
  y: number;
  t: number;
  dir: Dir;
}

interface Ghost extends Mover {
  home: Cell;
  mode: "house" | "chase" | "frightened";
  releaseAtMs: number;
}

interface GlotonState {
  player: Mover & { wantDir: Dir };
  ghosts: Ghost[];
  dots: string[][];
  dotsLeft: number;
  frightenedMs: number;
  ghostCombo: number;
  lives: number;
  score: number;
  level: number;
}

// --- Datos derivados del laberinto -------------------------------------------

const find = (ch: string): Cell[] =>
  MAZE.flatMap((row, y) => [...row].flatMap((c, x) => (c === ch ? [{ x, y }] : [])));

const PLAYER_START = find("P")[0];
const GHOST_HOMES = find("G");
const DOOR = find("-");
/** Celda justo encima de la puerta, por donde salen los fantasmas. */
const EXIT: Cell = { x: DOOR[0].x, y: DOOR[0].y - 1 };

/** Interior de la casa: celdas alcanzables desde "G" sin cruzar muros ni la puerta. */
const HOUSE = (() => {
  const seen = new Set<string>();
  const stack = [...GHOST_HOMES];
  while (stack.length) {
    const c = stack.pop()!;
    const key = `${c.x},${c.y}`;
    if (seen.has(key) || "#-".includes(MAZE[c.y][c.x])) continue;
    seen.add(key);
    for (const d of DIRS) stack.push({ x: c.x + VEC[d].x, y: c.y + VEC[d].y });
  }
  return seen;
})();

/** Transitable para el jugador y para los fantasmas fuera de la casa. */
const walkable = (x: number, y: number) =>
  y >= 0 && y < ROWS && x >= 0 && x < COLS &&
  !"#-".includes(MAZE[y][x]) && !HOUSE.has(`${x},${y}`);

const freshDots = () =>
  MAZE.map((row) => [...row].map((c) => (c === "." || c === "o" ? c : " ")));

const countDots = (dots: string[][]) =>
  dots.reduce((n, row) => n + row.filter((c) => c !== " ").length, 0);

// --- Movimiento ----------------------------------------------------------------

/** Avanza `distance` celdas; en cada centro de celda pregunta a `choose` la dirección. */
function advance(
  m: Mover,
  distance: number,
  choose: (m: Mover) => Dir | null,
  onArrive?: (m: Mover) => void,
) {
  while (distance > 0) {
    if (m.t === 0) {
      const dir = choose(m);
      if (dir === null) return;
      m.dir = dir;
    }
    const step = Math.min(distance, 1 - m.t);
    m.t += step;
    distance -= step;
    if (m.t >= 1 - 1e-9) {
      m.x += VEC[m.dir].x;
      m.y += VEC[m.dir].y;
      m.t = 0;
      onArrive?.(m);
    }
  }
}

/** Da media vuelta, también a mitad de celda. */
function reverse(m: Mover) {
  if (m.t > 0) {
    m.x += VEC[m.dir].x;
    m.y += VEC[m.dir].y;
    m.t = 1 - m.t;
  }
  m.dir = OPPOSITE[m.dir];
}

/** Celda que ocupa visualmente la entidad (la más cercana). */
const cellOf = (m: Mover): Cell =>
  m.t < 0.5 ? { x: m.x, y: m.y } : { x: m.x + VEC[m.dir].x, y: m.y + VEC[m.dir].y };

const pixelOf = (m: Mover) => ({
  px: OX + (m.x + VEC[m.dir].x * m.t) * CELL + CELL / 2,
  py: OY + (m.y + VEC[m.dir].y * m.t) * CELL + CELL / 2,
});

// --- Juego ---------------------------------------------------------------------

export const glotonGame: GameDefinition = {
  id: "gloton",
  create(ctx) {
    const dots = freshDots();
    const s: GlotonState = {
      player: { ...PLAYER_START, t: 0, dir: "left", wantDir: "left" },
      ghosts: [],
      dots,
      dotsLeft: countDots(dots),
      frightenedMs: 0,
      ghostCombo: 0,
      lives: 3,
      score: 0,
      level: 1,
    };
    let timeMs = 0;
    let readyMs = READY_MS;
    let over = false;

    const emitHud = () => ctx.onHud({ score: s.score, lives: s.lives, level: s.level });

    const sendHome = (gh: Ghost, delayMs: number) => {
      Object.assign(gh, { ...gh.home, t: 0, dir: "up", mode: "house", releaseAtMs: timeMs + delayMs });
    };

    const resetPositions = () => {
      Object.assign(s.player, { ...PLAYER_START, t: 0, dir: "left", wantDir: "left" });
      s.ghosts = GHOST_HOMES.slice(0, 4).map((home, i) => {
        const gh = { home } as Ghost;
        sendHome(gh, i * RELEASE_GAP_MS);
        return gh;
      });
      s.frightenedMs = 0;
      readyMs = READY_MS;
    };

    const ghostSpeed = (gh: Ghost) => {
      if (gh.mode === "house") return HOUSE_SPEED;
      const base = GHOST_SPEED * 1.1 ** (s.level - 1);
      return gh.mode === "frightened" ? base / 2 : base;
    };

    const chooseGhostDir = (gh: Ghost) => (m: Mover): Dir | null => {
      if (gh.mode === "house") {
        if (timeMs < gh.releaseAtMs) return null;
        if (m.x !== EXIT.x) return m.x < EXIT.x ? "right" : "left";
        if (m.y > EXIT.y) return "up";
        gh.mode = "chase"; // ya está fuera, sobre la salida
      }
      let options = DIRS.filter(
        (d) => d !== OPPOSITE[m.dir] && walkable(m.x + VEC[d].x, m.y + VEC[d].y),
      );
      if (options.length === 0) options = [OPPOSITE[m.dir]];
      if (gh.mode === "frightened" || Math.random() < RANDOM_TURN)
        return options[Math.floor(Math.random() * options.length)];
      const target = cellOf(s.player);
      const dist = (d: Dir) =>
        (m.x + VEC[d].x - target.x) ** 2 + (m.y + VEC[d].y - target.y) ** 2;
      return options.reduce((best, d) => (dist(d) < dist(best) ? d : best));
    };

    const choosePlayerDir = (m: Mover): Dir | null => {
      const { wantDir } = s.player;
      if (walkable(m.x + VEC[wantDir].x, m.y + VEC[wantDir].y)) return wantDir;
      if (walkable(m.x + VEC[m.dir].x, m.y + VEC[m.dir].y)) return m.dir;
      return null;
    };

    const eatAt = (m: Mover) => {
      const c = s.dots[m.y][m.x];
      if (c === " ") return;
      s.dots[m.y][m.x] = " ";
      s.dotsLeft--;
      if (c === ".") {
        s.score += 10;
      } else {
        s.score += 50;
        s.frightenedMs = Math.max(2000, 6000 - 500 * (s.level - 1));
        s.ghostCombo = 0;
        for (const gh of s.ghosts) {
          if (gh.mode === "house") continue;
          gh.mode = "frightened";
          reverse(gh);
        }
      }
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
      resetPositions();
    };

    /** Misma celda, o tan cerca que se han cruzado entre dos pasos. */
    const touching = (a: Mover, b: Mover) => {
      const ca = cellOf(a);
      const cb = cellOf(b);
      if (ca.x === cb.x && ca.y === cb.y) return true;
      const pa = pixelOf(a);
      const pb = pixelOf(b);
      return Math.hypot(pa.px - pb.px, pa.py - pb.py) < CELL * 0.6;
    };

    const checkCollisions = () => {
      for (const gh of s.ghosts) {
        if (gh.mode === "house") continue;
        if (!touching(s.player, gh)) continue;
        if (gh.mode === "frightened") {
          s.ghostCombo++;
          s.score += 200 * 2 ** (s.ghostCombo - 1);
          sendHome(gh, RELEASE_GAP_MS);
          emitHud();
        } else {
          loseLife();
          return;
        }
      }
    };

    resetPositions();
    emitHud();

    return {
      update(dtMs) {
        if (over) return;
        if (readyMs > 0) {
          readyMs -= dtMs;
          return;
        }
        timeMs += dtMs;
        const dt = dtMs / 1000;

        const p = s.player;
        for (const d of DIRS) if (KEYS[d].some((k) => ctx.input.wasPressed(k))) p.wantDir = d;
        if (p.wantDir === OPPOSITE[p.dir]) reverse(p);
        advance(p, PLAYER_SPEED * dt, choosePlayerDir, eatAt);

        if (s.frightenedMs > 0) {
          s.frightenedMs -= dtMs;
          if (s.frightenedMs <= 0)
            for (const gh of s.ghosts) if (gh.mode === "frightened") gh.mode = "chase";
        }

        for (const gh of s.ghosts) {
          advance(gh, ghostSpeed(gh) * dt, chooseGhostDir(gh));
          checkCollisions();
          if (over || readyMs > 0) return;
        }

        if (s.dotsLeft === 0) {
          s.level++;
          s.dots = freshDots();
          s.dotsLeft = countDots(s.dots);
          resetPositions();
          emitHud();
        }
      },
      render(g) {
        g.fillStyle = COLORS.bg;
        g.fillRect(0, 0, ctx.width, ctx.height);

        // Muros: relleno oscuro y borde neón solo hacia los pasillos
        g.strokeStyle = COLORS.cyan;
        g.lineWidth = 2;
        g.shadowBlur = 6;
        g.shadowColor = COLORS.cyan;
        g.beginPath();
        for (let y = 0; y < ROWS; y++) {
          for (let x = 0; x < COLS; x++) {
            if (MAZE[y][x] !== "#") continue;
            const px = OX + x * CELL;
            const py = OY + y * CELL;
            g.fillStyle = "#0b1030";
            g.fillRect(px, py, CELL, CELL);
            const open = (dx: number, dy: number) => {
              const c = MAZE[y + dy]?.[x + dx];
              return c !== undefined && c !== "#";
            };
            if (open(0, -1)) { g.moveTo(px, py + 1); g.lineTo(px + CELL, py + 1); }
            if (open(0, 1)) { g.moveTo(px, py + CELL - 1); g.lineTo(px + CELL, py + CELL - 1); }
            if (open(-1, 0)) { g.moveTo(px + 1, py); g.lineTo(px + 1, py + CELL); }
            if (open(1, 0)) { g.moveTo(px + CELL - 1, py); g.lineTo(px + CELL - 1, py + CELL); }
          }
        }
        g.stroke();
        g.shadowBlur = 0;

        g.fillStyle = COLORS.magenta;
        for (const d of DOOR) g.fillRect(OX + d.x * CELL, OY + d.y * CELL + CELL / 2 - 1, CELL, 3);

        // Puntos y píldoras
        const pillOn = Math.floor(timeMs / 250) % 2 === 0 || readyMs > 0;
        for (let y = 0; y < ROWS; y++) {
          for (let x = 0; x < COLS; x++) {
            const c = s.dots[y][x];
            const cx = OX + x * CELL + CELL / 2;
            const cy = OY + y * CELL + CELL / 2;
            if (c === ".") {
              g.fillStyle = COLORS.ink;
              g.fillRect(cx - 1.5, cy - 1.5, 3, 3);
            } else if (c === "o" && pillOn) {
              g.fillStyle = COLORS.yellow;
              g.beginPath();
              g.arc(cx, cy, 5, 0, Math.PI * 2);
              g.fill();
            }
          }
        }

        // Jugador
        const { px, py } = pixelOf(s.player);
        const mouth = 0.08 + 0.32 * Math.abs(Math.sin(timeMs / 70));
        const facing = { right: 0, down: 0.5, left: 1, up: 1.5 }[s.player.dir] * Math.PI;
        g.fillStyle = COLORS.yellow;
        g.shadowBlur = 10;
        g.shadowColor = COLORS.yellow;
        g.beginPath();
        g.moveTo(px, py);
        g.arc(px, py, CELL * 0.6, facing + mouth * Math.PI, facing - mouth * Math.PI + Math.PI * 2);
        g.closePath();
        g.fill();
        g.shadowBlur = 0;

        // Fantasmas
        const flashing = s.frightenedMs > 0 && s.frightenedMs < 2000 && Math.floor(s.frightenedMs / 200) % 2 === 0;
        s.ghosts.forEach((gh, i) => {
          const { px: gx, py: gy } = pixelOf(gh);
          const r = CELL * 0.6;
          const color = gh.mode === "frightened" ? (flashing ? COLORS.ink : "#3a4dff") : GHOST_COLORS[i];
          g.fillStyle = color;
          g.beginPath();
          g.arc(gx, gy - 1, r, Math.PI, 0);
          g.lineTo(gx + r, gy + r);
          for (let k = 1; k <= 4; k++) g.lineTo(gx + r - (k * r) / 2, gy + r - (k % 2) * 4);
          g.closePath();
          g.fill();
          if (gh.mode !== "frightened") {
            const v = VEC[gh.dir];
            for (const ex of [-3.5, 3.5]) {
              g.fillStyle = COLORS.ink;
              g.fillRect(gx + ex - 2, gy - 4, 4, 5);
              g.fillStyle = "#1a1aff";
              g.fillRect(gx + ex - 1 + v.x, gy - 3 + v.y * 1.5, 2, 2);
            }
          }
        });

        if (readyMs > 0 && !over) {
          drawText(g, "¡PREPARADO!", OX + (COLS * CELL) / 2, OY + 17 * CELL + 12, {
            size: 14,
            color: COLORS.yellow,
            align: "center",
          });
        }
      },
    };
  },
};
