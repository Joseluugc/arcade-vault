"use server";
import { GAME_REGISTRY } from "@/games/registry";
import {
  isValidPlayerName,
  isValidScore,
  normalizePlayerName,
} from "@/lib/scores";
import { createClient } from "@/lib/supabase/server";
export type SaveScoreResult = { ok: true } | { ok: false; error: string };
const GENERIC_ERROR = "No se pudo guardar la puntuación.";
export async function saveScore(input: {
  gameId: string;
  playerName: string;
  score: number;
}): Promise<SaveScoreResult> {
  // Los argumentos llegan del cliente: no se confía en sus tipos.
  const { gameId, playerName, score } = input ?? {};
  if (typeof gameId !== "string" || !Object.hasOwn(GAME_REGISTRY, gameId)) {
    return { ok: false, error: "Juego no válido." };
  }
  const name =
    typeof playerName === "string" ? normalizePlayerName(playerName) : "";
  if (!isValidPlayerName(name)) {
    return { ok: false, error: "Nombre no válido." };
  }
  if (typeof score !== "number" || !isValidScore(score)) {
    return { ok: false, error: "Puntuación no válida." };
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("scores")
      .insert({ game_id: gameId, player_name: name, score });
    if (error) {
      console.error("[saveScore] Supabase insert failed:", error);
      return { ok: false, error: GENERIC_ERROR };
    }
  } catch (err) {
    console.error("[saveScore] Unexpected error:", err);
    return { ok: false, error: GENERIC_ERROR };
  }
  return { ok: true };
}
