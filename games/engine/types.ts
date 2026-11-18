export interface GameHud {
  score: number;
  /** null = el juego no usa vidas; el HUD muestra "—". */
  lives: number | null;
  level: number;
}

export interface InputState {
  /** Tecla mantenida (KeyboardEvent.code). */
  isDown(code: string): boolean;
  /** Pulsada desde el paso anterior. */
  wasPressed(code: string): boolean;
}

export interface GameContext {
  width: 640;
  height: 480;
  input: InputState;
  onHud(hud: GameHud): void;
  onGameOver(finalScore: number): void;
}

export interface GameInstance {
  /** dtMs fijo = 1000 / 60. */
  update(dtMs: number): void;
  render(g: CanvasRenderingContext2D): void;
}

export interface GameDefinition {
  id: string;
  create(ctx: GameContext): GameInstance;
}
