import { demoGame } from "./demo";
import type { GameDefinition } from "./engine/types";

export const GAME_REGISTRY: Record<string, GameDefinition> = {
  [demoGame.id]: demoGame,
};
