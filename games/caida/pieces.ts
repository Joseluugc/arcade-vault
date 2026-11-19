import { COLORS } from "../engine/palette";

export type PieceKind = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export type Cell = { x: number; y: number };

export const PIECE_KINDS: PieceKind[] = ["I", "O", "T", "S", "Z", "J", "L"];

/** Forma base (rotación 0) dentro de su caja cuadrada. */
const BASE: Record<PieceKind, string[]> = {
  I: ["....", "####", "....", "...."],
  O: ["##", "##"],
  T: [".#.", "###", "..."],
  S: [".##", "##.", "..."],
  Z: ["##.", ".##", "..."],
  J: ["#..", "###", "..."],
  L: ["..#", "###", "..."],
};

export const PIECE_COLORS: Record<PieceKind, string> = {
  I: COLORS.cyan,
  O: COLORS.yellow,
  T: COLORS.magenta,
  S: COLORS.green,
  Z: "#ff4d4d",
  J: "#4d7cff",
  L: COLORS.gold,
};

/** Columna de aparición para que la pieza quede centrada en el tablero de 10. */
export const SPAWN_X: Record<PieceKind, number> = {
  I: 3, O: 4, T: 3, S: 3, Z: 3, J: 3, L: 3,
};

const rotateCW = (m: string[]) =>
  m.map((_, r) => m.map((_, c) => m[m.length - 1 - c][r]).join(""));

const toCells = (m: string[]): Cell[] =>
  m.flatMap((row, y) => [...row].flatMap((ch, x) => (ch === "#" ? [{ x, y }] : [])));

/** Celdas de cada pieza en sus 4 rotaciones horarias: ROTATIONS[kind][rotation]. */
export const ROTATIONS = Object.fromEntries(
  PIECE_KINDS.map((kind) => {
    const shapes = [BASE[kind]];
    for (let i = 1; i < 4; i++) shapes.push(rotateCW(shapes[i - 1]));
    return [kind, shapes.map(toCells)];
  }),
) as Record<PieceKind, Cell[][]>;
