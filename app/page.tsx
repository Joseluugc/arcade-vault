import { GAMES } from "@/games/catalog";
import { GAME_REGISTRY } from "@/games/registry";
import { GameLibrary } from "./GameLibrary";

export default function Home() {
  // Solo los juegos registrados en el motor se pueden jugar; el resto se muestra como "próximamente".
  const playableIds = GAMES.map((g) => g.id).filter((id) => Object.hasOwn(GAME_REGISTRY, id));

  return <GameLibrary games={GAMES} playableIds={playableIds} />;
}
