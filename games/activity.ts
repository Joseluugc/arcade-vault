// Datos de prueba de la sección Actividad de la home (copiados del prototipo home-about).
// Se sustituirán cuando exista la persistencia de puntuaciones.

export interface RecentScore {
  player: string;
  /** id de `GAMES` en `games/catalog.ts`. */
  gameId: string;
  score: number;
  ago: string;
}

export interface TopPlayer {
  player: string;
  score: number;
}

export const RECENT_SCORES: RecentScore[] = [
  { player: "NEONFOX", gameId: "caida", score: 184220, ago: "hace 2 min" },
  { player: "PX_KAI", gameId: "gloton", score: 96400, ago: "hace 5 min" },
  { player: "Z3R0COOL", gameId: "invasores", score: 54190, ago: "hace 8 min" },
  { player: "VAULT_07", gameId: "rocas", score: 41200, ago: "hace 12 min" },
  { player: "GLITCHA", gameId: "bloque-buster", score: 28450, ago: "hace 18 min" },
  { player: "ARKADYA", gameId: "serpentina", score: 7820, ago: "hace 24 min" },
  { player: "CYBER_LU", gameId: "ranaria", score: 18900, ago: "hace 31 min" },
];

/** Ordenados de mayor a menor puntuación. */
export const TOP_PLAYERS: TopPlayer[] = [
  { player: "NEONFOX", score: 312840 },
  { player: "PX_KAI", score: 248110 },
  { player: "M00NRYU", score: 196720 },
  { player: "VAULT_07", score: 154300 },
  { player: "GLITCHA", score: 138900 },
];
