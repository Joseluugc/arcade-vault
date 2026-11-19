import { caidaGame } from "./caida";
import type { GameDefinition } from "./engine/types";
import { glotonGame } from "./gloton";
import { serpentinaGame } from "./serpentina";

export const GAME_REGISTRY: Record<string, GameDefinition> = {
  [serpentinaGame.id]: serpentinaGame,
  [caidaGame.id]: caidaGame,
  [glotonGame.id]: glotonGame,
};
