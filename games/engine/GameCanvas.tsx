"use client";

import { useEffect, useRef } from "react";
import { createInput } from "./input";
import { createLoop, type Loop } from "./loop";
import type { GameDefinition, GameHud } from "./types";

const WIDTH = 640;
const HEIGHT = 480;

interface GameCanvasProps {
  definition: GameDefinition;
  paused: boolean;
  onHud(hud: GameHud): void;
  onGameOver(finalScore: number): void;
}

/**
 * Monta el canvas lógico de 640×480, crea la instancia del juego y ejecuta el bucle.
 * Para reiniciar, el padre cambia la `key`: se desmonta y se crea una instancia nueva.
 */
export function GameCanvas({
  definition,
  paused,
  onHud,
  onGameOver,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loopRef = useRef<Loop | null>(null);
  const pausedRef = useRef(paused);
  const onHudRef = useRef(onHud);
  const onGameOverRef = useRef(onGameOver);

  useEffect(() => {
    pausedRef.current = paused;
    onHudRef.current = onHud;
    onGameOverRef.current = onGameOver;
    loopRef.current?.setPaused(paused);
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;

    const input = createInput();
    let finished = false;

    const game = definition.create({
      width: WIDTH,
      height: HEIGHT,
      input,
      onHud: (hud) => onHudRef.current(hud),
      onGameOver: (finalScore) => {
        if (finished) return;
        finished = true;
        onGameOverRef.current(finalScore);
      },
    });

    const loop = createLoop(
      (dtMs) => {
        if (finished) return;
        game.update(dtMs);
        input.endStep();
      },
      () => {
        g.imageSmoothingEnabled = false;
        game.render(g);
      },
    );
    loop.setPaused(pausedRef.current);
    loopRef.current = loop;
    loop.start();

    return () => {
      loop.stop();
      loopRef.current = null;
      input.dispose();
    };
  }, [definition]);

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      style={{
        display: "block",
        width: "100%",
        height: "auto",
        aspectRatio: `${WIDTH} / ${HEIGHT}`,
        imageRendering: "pixelated",
      }}
    />
  );
}
