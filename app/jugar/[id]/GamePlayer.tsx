"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getGameMeta } from "@/games/catalog";
import { GameCanvas } from "@/games/engine/GameCanvas";
import type { GameHud } from "@/games/engine/types";
import { GAME_REGISTRY } from "@/games/registry";

const PLAYER_NAME = "INVITADO";

const INITIAL_HUD: GameHud = { score: 0, lives: null, level: 1 };

export function GamePlayer({ id }: { id: string }) {
  const definition = GAME_REGISTRY[id];
  const title = getGameMeta(id)?.title ?? id.toUpperCase();
  const [hud, setHud] = useState<GameHud>(INITIAL_HUD);
  const [paused, setPaused] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const over = finalScore !== null;

  const restart = () => {
    setHud(INITIAL_HUD);
    setPaused(false);
    setFinalScore(null);
    setRunKey((k) => k + 1); // nueva instancia del juego
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyP" && !e.repeat) setPaused((p) => !p);
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
          <Link href="/" className="btn ghost">
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
            <div className="actions">
              <button type="button" className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/" className="btn magenta">
                VOLVER
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
