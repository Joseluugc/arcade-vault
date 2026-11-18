export const STEP_MS = 1000 / 60;
const MAX_STEPS_PER_FRAME = 5;

export interface Loop {
  start(): void;
  stop(): void;
  setPaused(paused: boolean): void;
}

/**
 * Bucle de paso fijo a 60 Hz sobre requestAnimationFrame.
 * `update` se llama 0..5 veces por frame con dtMs = STEP_MS; `render` una vez.
 * En pausa no se llama a `update`, pero se sigue pintando el último estado.
 */
export function createLoop(
  update: (dtMs: number) => void,
  render: () => void,
): Loop {
  let rafId: number | null = null;
  let last = 0;
  let acc = 0;
  let paused = false;

  const frame = (now: number) => {
    rafId = requestAnimationFrame(frame);
    const elapsed = now - last;
    last = now;

    if (!paused) {
      acc += elapsed;
      let steps = 0;
      while (acc >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
        update(STEP_MS);
        acc -= STEP_MS;
        steps++;
      }
      // Si se alcanzó el tope, se descarta el atraso para no entrar en espiral.
      if (steps === MAX_STEPS_PER_FRAME) acc = 0;
    }
    render();
  };

  return {
    start() {
      if (rafId !== null) return;
      last = performance.now();
      acc = 0;
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    },
    setPaused(value) {
      paused = value;
      acc = 0;
    },
  };
}
