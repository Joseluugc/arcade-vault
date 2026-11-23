"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getGameMeta } from "@/games/catalog";
import { GameCanvas } from "@/games/engine/GameCanvas";
import type { GameHud } from "@/games/engine/types";
import { GAME_REGISTRY } from "@/games/registry";
import { normalizePlayerName } from "@/lib/scores";
import { saveScore } from "./actions";

const PLAYER_NAME = "INVITADO";

const INITIAL_HUD: GameHud = { score: 0, lives: null, level: 1 };

type SaveState = "idle" | "saving" | "saved" | "error";

/** Campos de texto: sus teclas no son atajos del reproductor. */
function isTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
  );
}

export function GamePlayer({ id }: { id: string }) {
  const definition = GAME_REGISTRY[id];
  const title = getGameMeta(id)?.title ?? id.toUpperCase();
  const [hud, setHud] = useState<GameHud>(INITIAL_HUD);
  const [paused, setPaused] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const over = finalScore !== null;
  // Partida actual: descarta respuestas de guardado de una partida anterior.
  const runRef = useRef(0);

  const restart = () => {
    setHud(INITIAL_HUD);
    setPaused(false);
    setFinalScore(null);
    setSaveState("idle");
    runRef.current += 1;
    setRunKey((k) => k + 1); // nueva instancia del juego
  };

  const save = async () => {
    if (finalScore === null || !playerName) return;
    const run = runRef.current;
    setSaveState("saving");
    let ok = false;
    try {
      const result = await saveScore({ gameId: id, playerName, score: finalScore });
      ok = result.ok;
    } catch {
      ok = false; // fallo de red al llamar a la Server Action
    }
    if (runRef.current === run) setSaveState(ok ? "saved" : "error");
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyP" && !e.repeat && !isTextField(e.target)) {
        setPaused((p) => !p);
      }
    };
    const onVisibility = () => {
      if (document.hidden) setPaused(true);
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const livesText =
    hud.lives && hud.lives > 0 ? "♥ ".repeat(hud.lives).trim() : "—";

  return (
    <div className="av-player">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {PLAYER_NAME}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{hud.score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{livesText}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(hud.level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button
            type="button"
            className="btn yellow"
            onClick={(e) => {
              setPaused((p) => !p);
              e.currentTarget.blur(); // que Space no vuelva a activar el botón
            }}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button
            type="button"
            className="btn magenta"
            disabled={over}
            onClick={(e) => {
              setFinalScore(hud.score);
              e.currentTarget.blur();
            }}
          >
            FIN
          </button>
          <Link href="/biblioteca" className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <GameCanvas
            key={runKey}
            definition={definition}
            paused={paused || over}
            onHud={setHud}
            onGameOver={setFinalScore}
          />
          {paused && !over && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA P O REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-over-title"
          >
            <h2 id="game-over-title">FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{finalScore.toLocaleString("es-ES")}</div>
            {finalScore > 0 &&
              (saveState === "saved" ? (
                <div>
                  <div className="toast-saved" role="status">
                    ▸ PUNTUACIÓN GUARDADA_
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Link href={`/salon?juego=${id}`} className="btn ghost">
                      VER EN EL SALÓN
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <form
                    className="input-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void save();
                    }}
                  >
                    <input
                      value={playerName}
                      onChange={(e) =>
                        setPlayerName(normalizePlayerName(e.target.value))
                      }
                      // Que las teclas no lleguen a los listeners de window
                      // (motor y atajos del reproductor).
                      onKeyDown={(e) => e.stopPropagation()}
                      onKeyUp={(e) => e.stopPropagation()}
                      placeholder="TUS INICIALES"
                      aria-label="Tus iniciales"
                      maxLength={10}
                      autoComplete="off"
                      spellCheck={false}
                      disabled={saveState === "saving"}
                    />
                    <button
                      type="submit"
                      className="btn yellow"
                      disabled={!playerName || saveState === "saving"}
                    >
                      {saveState === "saving" ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                    </button>
                  </form>
                  {saveState === "error" && (
                    <p className="contact-error" role="alert">
                      NO SE PUDO GUARDAR. INTÉNTALO DE NUEVO.
                    </p>
                  )}
                </>
              ))}
            <div className="actions">
              <button type="button" className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/biblioteca" className="btn magenta">
                VOLVER
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
