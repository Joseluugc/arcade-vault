import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GAME_REGISTRY } from "@/games/registry";
import { GamePlayer } from "./GamePlayer";

export function generateStaticParams() {
  return Object.keys(GAME_REGISTRY).map((id) => ({ id }));
}

export default function JugarPage({ params }: PageProps<"/jugar/[id]">) {
  return (
    <Suspense fallback={null}>
      <Player params={params} />
    </Suspense>
  );
}

async function Player({ params }: { params: PageProps<"/jugar/[id]">["params"] }) {
  const { id } = await params;
  if (!Object.hasOwn(GAME_REGISTRY, id)) notFound();

  return <GamePlayer id={id} />;
}
