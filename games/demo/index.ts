import type { GameDefinition } from "../engine/types";

const SIZE = 32;
const SPEED = 240; // px/s

/** Juego de prueba del contrato: un cuadrado con flechas, +1 punto/s, fin con Enter. */
export const demoGame: GameDefinition = {
  id: "demo",
  create(ctx) {
    let x = (ctx.width - SIZE) / 2;
    let y = (ctx.height - SIZE) / 2;
    let elapsedMs = 0;
    let score = 0;

    ctx.onHud({ score, lives: null, level: 1 });

    return {
      update(dtMs) {
        const dt = dtMs / 1000;
        const { input } = ctx;
        if (input.isDown("ArrowLeft")) x -= SPEED * dt;
        if (input.isDown("ArrowRight")) x += SPEED * dt;
        if (input.isDown("ArrowUp")) y -= SPEED * dt;
        if (input.isDown("ArrowDown")) y += SPEED * dt;
        x = Math.min(Math.max(x, 0), ctx.width - SIZE);
        y = Math.min(Math.max(y, 0), ctx.height - SIZE);

        elapsedMs += dtMs;
        const nextScore = Math.floor(elapsedMs / 1000);
        if (nextScore !== score) {
          score = nextScore;
          ctx.onHud({ score, lives: null, level: 1 });
        }

        if (input.wasPressed("Enter")) ctx.onGameOver(score);
      },
      render(g) {
        g.fillStyle = "#0a0a0f";
        g.fillRect(0, 0, ctx.width, ctx.height);
        g.fillStyle = "#00f5ff";
        g.fillRect(Math.round(x), Math.round(y), SIZE, SIZE);
        g.fillStyle = "#8a8fb5";
        g.font = "16px monospace";
        g.textAlign = "center";
        g.fillText("FLECHAS: MOVER   ENTER: TERMINAR", ctx.width / 2, ctx.height - 16);
      },
    };
  },
};
