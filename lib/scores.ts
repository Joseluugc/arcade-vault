// Reglas de puntuaciones compartidas por cliente y servidor.
// Las restricciones CHECK de public.scores repiten estas mismas reglas.
export const PLAYER_NAME_MAX = 10;
export const PLAYER_NAME_RE = /^[A-Z0-9_]{1,10}$/;
export const SCORE_MIN = 1;
export const SCORE_MAX = 9_999_999;
export const LEADERBOARD_SIZE = 10;
/** Mayúsculas y solo A-Z, 0-9 y _, recortado a 10. Se usa al escribir en el input. */
export function normalizePlayerName(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, PLAYER_NAME_MAX);
}
export function isValidPlayerName(name: string): boolean {
  return PLAYER_NAME_RE.test(name);
}
/** Entero entre SCORE_MIN y SCORE_MAX. */
export function isValidScore(score: number): boolean {
  return Number.isInteger(score) && score >= SCORE_MIN && score <= SCORE_MAX;
}
export interface ScoreRow {
  id: number;
  game_id: string;
  player_name: string;
  score: number;
  created_at: string; // ISO
}
