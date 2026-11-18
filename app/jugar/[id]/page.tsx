import { notFound } from "next/navigation";
import { GAME_REGISTRY } from "@/games/registry";
import { GamePlayer } from "./GamePlayer";

export function generateStaticParams() {
  return Object.keys(GAME_REGISTRY).map((id) => ({ id }));
}

export default async function JugarPage({ params }: PageProps<"/jugar/[id]">) {
  const { id } = await params;
  if (!Object.hasOwn(GAME_REGISTRY, id)) notFound();

  return <GamePlayer id={id} />;
}
