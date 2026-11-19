"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type MouseEvent } from "react";
import { GAME_CATEGORIES, type GameCategory, type GameMeta } from "@/games/catalog";

type CategoryFilter = "TODOS" | GameCategory;

const FILTERS: CategoryFilter[] = ["TODOS", ...GAME_CATEGORIES];

const BUTTON_TONE: Record<GameMeta["color"], string> = {
  cyan: "",
  green: "",
  magenta: " magenta",
  yellow: " yellow",
};

function GameCard({ game, playable }: { game: GameMeta; playable: boolean }) {
  const tiltRef = useRef<HTMLElement>(null);

  const onMove = (e: MouseEvent<HTMLElement>) => {
    const el = tiltRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `translateY(-6px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg)`;
  };
  const onLeave = () => {
    if (tiltRef.current) tiltRef.current.style.transform = "";
  };

  const body = (
    <>
      <div className="cover">
        <div className={"cover-bg " + game.cover} />
        <div className="label">{game.cat}</div>
      </div>
      <div className="meta">
        <h2 className="title">{game.title}</h2>
        <p className="desc">{game.short}</p>
        <div className="row">
          <div className="score-badge">
            <span>MEJOR PUNTUACIÓN</span>
            <b>—</b>
          </div>
          {playable ? (
            <span className={"btn" + BUTTON_TONE[game.color]}>JUGAR</span>
          ) : (
            <span className="btn ghost" aria-hidden="true">PRÓXIMAMENTE</span>
          )}
        </div>
      </div>
    </>
  );

  if (!playable) {
    return (
      <article className="card locked" aria-label={`${game.title}, próximamente`}>
        {body}
      </article>
    );
  }

  return (
    <Link
      ref={(el) => {
        tiltRef.current = el;
      }}
      href={`/jugar/${game.id}`}
      className="card"
      aria-label={`Jugar a ${game.title}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {body}
    </Link>
  );
}

export function GameLibrary({ games, playableIds }: { games: GameMeta[]; playableIds: string[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("TODOS");

  const playable = useMemo(() => new Set(playableIds), [playableIds]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return games.filter(
      (g) => (category === "TODOS" || g.cat === category) && g.title.toLowerCase().includes(q),
    );
  }, [games, query, category]);

  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>

      <div className="av-filters">
        <label className="av-search">
          <span className="ico" aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar un juego por nombre…"
            aria-label="Buscar un juego por nombre"
          />
        </label>
        <div className="av-chips" role="group" aria-label="Filtrar por categoría">
          {FILTERS.map((c) => (
            <button
              key={c}
              type="button"
              className={"chip" + (category === c ? " active" : "")}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="av-grid">
        {filtered.map((g) => (
          <GameCard key={g.id} game={g} playable={playable.has(g.id)} />
        ))}
        {filtered.length === 0 && (
          <div className="av-empty" role="status">
            <div className="pixel">NO HAY RESULTADOS</div>
            <div>Prueba con otro nombre o categoría.</div>
          </div>
        )}
      </div>
    </div>
  );
}
