import type { GameDefinition } from "../engine/types";
import { COLORS, drawText } from "../engine/palette";
import {
  PIECE_COLORS,
  PIECE_KINDS,
  ROTATIONS,
  SPAWN_X,
  type PieceKind,
} from "./pieces";

const COLS = 10;
const ROWS = 20;
const CELL = 22;
const BOARD_X = (640 - COLS * CELL) / 2;
const BOARD_Y = (480 - ROWS * CELL) / 2;
const LINE_POINTS = [0, 100, 300, 500, 800];
const SOFT_DROP_MS = 50;
const DAS_MS = 170; // retardo antes de repetir el movimiento lateral
const ARR_MS = 50; // intervalo de repetición lateral

type Rotation = 0 | 1 | 2 | 3;

interface FallingState {
  board: (PieceKind | null)[][]; // 20 filas × 10 columnas
  piece: { kind: PieceKind; rotation: Rotation; x: number; y: number };
  next: PieceKind;
  bag: PieceKind[];
  lines: number;
  score: number;
  level: number;
}

const gravityFor = (level: number) => Math.max(100, 800 - 70 * (level - 1));

function shuffledBag(): PieceKind[] {
  const bag = [...PIECE_KINDS];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

export const caidaGame: GameDefinition = {
  id: "caida",
  create(ctx) {
    const { input } = ctx;
    const s: FallingState = {
      board: Array.from({ length: ROWS }, () => Array<PieceKind | null>(COLS).fill(null)),
      piece: { kind: "I", rotation: 0, x: 0, y: 0 },
      next: "I",
      bag: [],
      lines: 0,
      score: 0,
      level: 1,
    };
    let dropAcc = 0;
    const holdMs = { left: 0, right: 0 };
    let over = false;

    const emitHud = () => ctx.onHud({ score: s.score, lives: null, level: s.level });

    const draw = (): PieceKind => {
      if (s.bag.length === 0) s.bag = shuffledBag();
      return s.bag.pop()!;
    };

    const fits = (rotation: Rotation, x: number, y: number) =>
      ROTATIONS[s.piece.kind][rotation].every(({ x: cx, y: cy }) => {
        const bx = x + cx;
        const by = y + cy;
        if (bx < 0 || bx >= COLS || by >= ROWS) return false;
        return by < 0 || s.board[by][bx] === null;
      });

    const tryMove = (dx: number, dy: number) => {
      const { rotation, x, y } = s.piece;
      if (!fits(rotation, x + dx, y + dy)) return false;
      s.piece.x += dx;
      s.piece.y += dy;
      return true;
    };

    /** Rotación horaria con ajuste simple: 0, −1 y +1 en x. */
    const tryRotate = () => {
      const rotation = ((s.piece.rotation + 1) % 4) as Rotation;
      for (const dx of [0, -1, 1]) {
        if (fits(rotation, s.piece.x + dx, s.piece.y)) {
          s.piece.rotation = rotation;
          s.piece.x += dx;
          return;
        }
      }
    };

    const end = () => {
      over = true;
      ctx.onGameOver(s.score);
    };

    const spawn = () => {
      const kind = s.next;
      s.next = draw();
      s.piece = { kind, rotation: 0, x: SPAWN_X[kind], y: kind === "I" ? -1 : 0 };
      dropAcc = 0;
      if (!fits(0, s.piece.x, s.piece.y)) end();
    };

    const lock = () => {
      const { kind, rotation, x, y } = s.piece;
      for (const c of ROTATIONS[kind][rotation]) {
        if (y + c.y < 0) return end(); // bloque fijado por encima del tablero
        s.board[y + c.y][x + c.x] = kind;
      }
      const remaining = s.board.filter((row) => row.some((c) => c === null));
      const cleared = ROWS - remaining.length;
      if (cleared > 0) {
        s.board = [
          ...Array.from({ length: cleared }, () => Array<PieceKind | null>(COLS).fill(null)),
          ...remaining,
        ];
        s.score += LINE_POINTS[cleared] * s.level;
        s.lines += cleared;
        s.level = Math.floor(s.lines / 10) + 1;
      }
      emitHud();
      spawn();
    };

    const horizontal = (side: "left" | "right", dx: number, dtMs: number) => {
      const code = side === "left" ? "ArrowLeft" : "ArrowRight";
      if (input.wasPressed(code)) {
        tryMove(dx, 0);
        holdMs[side] = 0;
      } else if (input.isDown(code)) {
        holdMs[side] += dtMs;
        if (holdMs[side] >= DAS_MS) {
          tryMove(dx, 0);
          holdMs[side] -= ARR_MS;
        }
      } else {
        holdMs[side] = 0;
      }
    };

    s.next = draw();
    spawn();
    emitHud();

    return {
      update(dtMs) {
        if (over) return;
        horizontal("left", -1, dtMs);
        horizontal("right", 1, dtMs);
        if (input.wasPressed("ArrowUp") || input.wasPressed("KeyX")) tryRotate();

        if (input.wasPressed("Space")) {
          let cells = 0;
          while (tryMove(0, 1)) cells++;
          s.score += 2 * cells;
          return lock();
        }

        const soft = input.isDown("ArrowDown");
        const interval = soft ? Math.min(SOFT_DROP_MS, gravityFor(s.level)) : gravityFor(s.level);
        dropAcc += dtMs;
        while (dropAcc >= interval && !over) {
          dropAcc -= interval;
          if (tryMove(0, 1)) {
            if (soft) {
              s.score += 1;
              emitHud();
            }
          } else {
            lock();
            break;
          }
        }
      },
      render(g) {
        g.fillStyle = COLORS.bg;
        g.fillRect(0, 0, ctx.width, ctx.height);

        const cell = (px: number, py: number, color: string) => {
          g.fillStyle = color;
          g.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
          g.fillStyle = "rgba(255,255,255,0.25)";
          g.fillRect(px + 1, py + 1, CELL - 2, 3);
        };

        // Tablero
        g.fillStyle = "#0e0f1a";
        g.fillRect(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL);
        g.strokeStyle = "rgba(0, 245, 255, 0.06)";
        g.lineWidth = 1;
        for (let x = 1; x < COLS; x++) {
          g.beginPath();
          g.moveTo(BOARD_X + x * CELL + 0.5, BOARD_Y);
          g.lineTo(BOARD_X + x * CELL + 0.5, BOARD_Y + ROWS * CELL);
          g.stroke();
        }
        s.board.forEach((row, y) =>
          row.forEach((k, x) => k && cell(BOARD_X + x * CELL, BOARD_Y + y * CELL, PIECE_COLORS[k])),
        );
        if (!over) {
          const { kind, rotation, x, y } = s.piece;
          for (const c of ROTATIONS[kind][rotation])
            if (y + c.y >= 0)
              cell(BOARD_X + (x + c.x) * CELL, BOARD_Y + (y + c.y) * CELL, PIECE_COLORS[kind]);
        }
        g.strokeStyle = COLORS.cyan;
        g.lineWidth = 2;
        g.shadowBlur = 10;
        g.shadowColor = COLORS.cyan;
        g.strokeRect(BOARD_X - 2, BOARD_Y - 2, COLS * CELL + 4, ROWS * CELL + 4);
        g.shadowBlur = 0;

        // Panel derecho: pieza siguiente
        const px = BOARD_X + COLS * CELL + 28;
        drawText(g, "SIGUIENTE", px, BOARD_Y + 14, { size: 12, color: COLORS.inkDim });
        for (const c of ROTATIONS[s.next][0])
          cell(px + c.x * CELL, BOARD_Y + 30 + c.y * CELL, PIECE_COLORS[s.next]);

        // Panel izquierdo: líneas y controles
        const lx = BOARD_X - 28;
        const opts = { align: "right" as const };
        drawText(g, "LÍNEAS", lx, BOARD_Y + 14, { ...opts, size: 12, color: COLORS.inkDim });
        drawText(g, String(s.lines), lx, BOARD_Y + 40, { ...opts, size: 22, color: COLORS.yellow });
        const help = ["← →  MOVER", "↑ X  ROTAR", "↓  BAJAR", "ESPACIO  SOLTAR"];
        help.forEach((line, i) =>
          drawText(g, line, lx, BOARD_Y + ROWS * CELL - 60 + i * 18, {
            ...opts,
            size: 11,
            color: COLORS.inkFaint,
          }),
        );
      },
    };
  },
};
