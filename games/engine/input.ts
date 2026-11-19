  import type { InputState } from "./types";

const BLOCKED_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
]);

export interface InputController extends InputState {
  /** Limpia `wasPressed`; el bucle lo llama tras cada paso de simulación. */
  endStep(): void;
  /** Quita los listeners de `window`. */
  dispose(): void;
}

export function createInput(): InputController {
  const down = new Set<string>();
  const pressed = new Set<string>();

  const onKeyDown = (e: KeyboardEvent) => {
    if (BLOCKED_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    down.add(e.code);
    pressed.add(e.code);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (BLOCKED_KEYS.has(e.code)) e.preventDefault();
    down.delete(e.code);
  };
  const clearAll = () => {
    down.clear();
    pressed.clear();
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearAll);

  return {
    isDown: (code) => down.has(code),
    wasPressed: (code) => pressed.has(code),
    endStep: () => pressed.clear(),
    dispose: () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearAll);
      clearAll();
    },
  };
}
