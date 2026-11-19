import { bloqueBusterGame } from "./bloque-buster";
import { caidaGame } from "./caida";
import type { GameDefinition } from "./engine/types";
import { glotonGame } from "./gloton";
import { invasoresGame } from "./invasores";
import { rocasGame } from "./rocas";
import { serpentinaGame } from "./serpentina";

export const GAME_REGISTRY: Record<string, GameDefinition> = {
  [serpentinaGame.id]: serpentinaGame,
  [caidaGame.id]: caidaGame,
  [glotonGame.id]: glotonGame,
  [bloqueBusterGame.id]: bloqueBusterGame,
  [invasoresGame.id]: invasoresGame,
  [rocasGame.id]: rocasGame,
};
