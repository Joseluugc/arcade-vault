/** Colores neón del prototipo (mismos valores que los tokens de `app/globals.css`). */
export const COLORS = {
  bg: "#0a0a0f",
  ink: "#e6e9ff",
  inkDim: "#8a8fb5",
  inkFaint: "#4a4f70",
  cyan: "#00f5ff",
  magenta: "#ff006e",
  yellow: "#f5ff00",
  green: "#00ff88",
  gold: "#ffcf3a",
} as const;

interface TextOptions {
  size?: number;
  color?: string;
  align?: CanvasTextAlign;
}

/** Texto monoespaciado en negrita, alineado por la línea base. */
export function drawText(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  { size = 14, color = COLORS.ink, align = "left" }: TextOptions = {},
) {
  g.font = `bold ${size}px monospace`;
  g.textAlign = align;
  g.textBaseline = "alphabetic";
  g.fillStyle = color;
  g.fillText(text, x, y);
}
