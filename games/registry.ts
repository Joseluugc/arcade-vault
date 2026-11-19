import { bloqueBusterGame } from "./bloque-buster";
import type { GameDefinition } from "./engine/types";
import { invasoresGame } from "./invasores";
import { rocasGame } from "./rocas";

export const GAME_REGISTRY: Record<string, GameDefinition> = {
  [bloqueBusterGame.id]: bloqueBusterGame,
  [invasoresGame.id]: invasoresGame,
  [rocasGame.id]: rocasGame,
};
