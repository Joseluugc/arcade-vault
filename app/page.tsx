import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { RECENT_SCORES, TOP_PLAYERS } from "@/games/activity";
import { GAMES, type GameMeta } from "@/games/catalog";
import { GAME_REGISTRY } from "@/games/registry";
import { FeatureIcon, FloatingSilhouettes, type FeatureIconKind } from "./PixelArt";
import { Reveal } from "./Reveal";

export const metadata: Metadata = {
  title: "Arcade Vault · Juegos arcade en tu navegador",
  description: "Juega clásicos arcade gratis en tu navegador y compite por la mayor puntuación.",
};

const FEATURES: { icon: FeatureIconKind; title: string; desc: string; color: string }[] = [
  {
    icon: "gamepad",
    title: "JUEGOS CLÁSICOS",
    desc: "Bloque Buster, Caída, Serpentina y muchos más. Los mejores arcades de todos los tiempos en un solo lugar.",
    color: "cyan",
  },
  {
    icon: "free",
    title: "100% GRATIS",
    desc: "Sin suscripciones, sin pagos ocultos. Todos los juegos disponibles de forma gratuita.",
    color: "yellow",
  },
  {
    icon: "trophy",
    title: "LADDER BOARDS",
    desc: "Compite con jugadores de todo el mundo. Escala el ranking y demuestra quién es el mejor.",
    color: "magenta",
  },
  {
    icon: "rocket",
    title: "SIEMPRE CRECIENDO",
    desc: "Agregamos nuevos juegos constantemente. Vuelve seguido, siempre habrá algo nuevo que jugar.",
    color: "green",
  },
];

const STATS = [
  { n: String(GAMES.length), u: "JUEGOS", s: "Y CONTANDO" },
  { n: "MILES", u: "DE PARTIDAS", s: "JUGADAS CADA DÍA" },
  { n: "GLOBAL", u: "RANKING", s: "COMPITE CON EL MUNDO" },
];

const PRICE_PERKS = [
  "Acceso a todos los juegos",
  "Ranking global y salón de la fama",
  "Sin anuncios entre partidas",
  "Guarda tus puntuaciones",
  "Nuevos juegos cada mes",
  "Funciona en cualquier navegador",
];

const FAQ = [
  {
    q: "¿REALMENTE ES GRATIS?",
    a: 'Sí. Arcade Vault es un proyecto sin fines de lucro hecho por amor a los clásicos. No hay versión "premium" escondida.',
  },
  {
    q: "¿NECESITO CREAR CUENTA?",
    a: "No. Puedes jugar como invitado. Si quieres guardar tu puntuación y aparecer en el ranking, regístrate en 10 segundos.",
  },
  {
    q: "¿CÓMO SOBREVIVEN SIN COBRAR?",
    a: "Es un proyecto comunitario. Si te gusta, compártelo. Esa es toda la moneda que aceptamos.",
  },
];

const GAMES_BY_ID = new Map(GAMES.map((g) => [g.id, g]));
const formatScore = (n: number) => n.toLocaleString("es-ES");
const TOP_CLASS = ["top1", "top2", "top3"];

/** Retraso escalonado de la transición de entrada de cada tarjeta. */
const delay = (i: number, step: number): CSSProperties => ({ transitionDelay: `${i * step}ms` });

function SectionHead({ index, color, title }: { index: string; color: string; title: string }) {
  return (
    <div className="section-head">
      <div className={`kicker pixel neon-${color}`}>{"// " + index}</div>
      <h2 className="section-title">{title}</h2>
      <div className="section-rule" />
    </div>
  );
}

function MiniCard({ game }: { game: GameMeta }) {
  return (
    <Link href={`/jugar/${game.id}`} className="mini-card">
      <div className="mini-cover">
        <div className={`cover-bg ${game.cover}`} />
      </div>
      <div className="mini-meta">
        <div className="mini-title">{game.title}</div>
        <div className="mini-cat">{game.cat}</div>
      </div>
    </Link>
  );
}

export default function Home() {
  const previewGames = GAMES.filter((g) => Object.hasOwn(GAME_REGISTRY, g.id)).slice(0, 6);

  return (
    <div className="home fade-in">
      {/* HERO */}
      <section className="home-hero">
        <FloatingSilhouettes />
        <div className="home-hero-inner">
          <div className="hero-eyebrow pixel neon-yellow">
            ▸ INSERTA UNA MONEDA<span className="blink">_</span>
          </div>
          <h1 className="home-title">
            <span className="line-1">EL ARCADE</span>
            <span className="line-2">CLÁSICO ESTÁ</span>
            <span className="line-3">DE VUELTA</span>
          </h1>
          <p className="home-sub">
            Juega los mejores clásicos directamente en tu navegador.
            <br />
            Sin descargas. Sin costo. Solo diversión.
          </p>
          <div className="home-ctas">
            <Link href="/biblioteca" className="btn xl pulse">
              ▶ EXPLORAR JUEGOS
            </Link>
            <Link href="/auth" className="btn xl magenta">
              ✦ CREAR CUENTA
            </Link>
          </div>
          <div className="hero-scroll" aria-hidden="true">
            <span>DESLIZA</span>
            <span className="arrow">▼</span>
          </div>
        </div>
      </section>

      {/* ¿POR QUÉ? */}
      <Reveal className="home-section">
        <SectionHead index="01" color="magenta" title="¿POR QUÉ ARCADE VAULT?" />
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <div key={f.title} className={`feature-card ${f.color}`} style={delay(i, 80)}>
              <FeatureIcon kind={f.icon} />
              <div className="ft-title pixel">{f.title}</div>
              <div className="ft-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* JUEGOS */}
      <Reveal className="home-section">
        <SectionHead index="02" color="cyan" title="JUEGOS DISPONIBLES AHORA" />
        <div className="mini-rail">
          {previewGames.map((g) => (
            <MiniCard key={g.id} game={g} />
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link href="/biblioteca" className="btn lg">
            VER TODOS LOS JUEGOS →
          </Link>
        </div>
      </Reveal>

      {/* ESTADÍSTICAS */}
      <Reveal className="home-stats">
        <div className="stats-inner">
          {STATS.map((st, i) => (
            <div key={st.u} className="stat-block" style={delay(i, 90)}>
              <div className="stat-n neon-yellow">{st.n}</div>
              <div className="stat-u pixel">{st.u}</div>
              <div className="stat-s">{st.s}</div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* ACTIVIDAD (Salón de la Fama mientras no exista /salon) */}
      <Reveal id="salon" className="home-section">
        <SectionHead index="03" color="yellow" title="ACTIVIDAD EN VIVO" />
        <div className="activity-grid">
          <div className="activity-card">
            <div className="ac-head">
              <div className="ac-title pixel">▸ ÚLTIMAS PUNTUACIONES</div>
            </div>
            <div className="ticker">
              {RECENT_SCORES.map((r, i) => {
                const game = GAMES_BY_ID.get(r.gameId);
                return (
                  <div key={`${r.player}-${r.gameId}`} className="tick-row" style={{ animationDelay: `${i * 60}ms` }}>
                    <span className={`tk-p neon-${game?.color ?? "cyan"}`}>{r.player}</span>
                    <span className="tk-mid">▸ {game?.title ?? r.gameId}</span>
                    <span className="tk-s">+{formatScore(r.score)}</span>
                    <span className="tk-t">{r.ago}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="activity-card">
            <div className="ac-head">
              <div className="ac-title pixel neon-magenta">▸ TOP JUGADORES · HOY</div>
            </div>
            <div className="top-list">
              {TOP_PLAYERS.map((r, i) => (
                <div key={r.player} className={`top-row ${TOP_CLASS[i] ?? ""}`}>
                  <span className="tp-rk">#{String(i + 1).padStart(2, "0")}</span>
                  <span className="tp-bar">
                    <span className="tp-fill" style={{ width: `${100 - i * 16}%` }} />
                  </span>
                  <span className="tp-p">{r.player}</span>
                  <span className="tp-s">{formatScore(r.score)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* PRECIOS */}
      <Reveal className="home-section">
        <SectionHead index="04" color="green" title="PRECIOS" />
        <div className="pricing-grid">
          <div className="price-card">
            <div className="pc-label pixel">PLAN ÚNICO</div>
            <div className="pc-name pixel">JUGADOR VAULT</div>
            <div className="pc-amount">
              <span className="pc-amount-n">$0</span>
              <span className="pc-amount-u">/ SIEMPRE</span>
            </div>
            <div className="pc-tag">SIN TRUCOS · SIN LETRA PEQUEÑA</div>
            <ul className="pc-list">
              {PRICE_PERKS.map((p) => (
                <li key={p}>✔ {p}</li>
              ))}
            </ul>
            <Link href="/auth" className="btn xl pulse" style={{ width: "100%" }}>
              EMPEZAR GRATIS →
            </Link>
            <div className="pc-foot">No pedimos tarjeta. Nunca lo haremos.</div>
            <div className="pc-stamp pixel" aria-hidden="true">
              FREE
              <br />
              PLAY
            </div>
          </div>

          <div className="pricing-faq">
            {FAQ.map((f) => (
              <div key={f.q} className="faq-item">
                <div className="faq-q pixel">{f.q}</div>
                <div className="faq-a">{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* CTA FINAL */}
      <Reveal className="home-final">
        <h2 className="final-title pixel">¿LISTO PARA JUGAR?</h2>
        <Link href="/biblioteca" className="btn xl pulse final-cta">
          INSERTAR MONEDA →
        </Link>
        <div className="final-tag">Gratis. Sin registro obligatorio. Empieza en segundos.</div>
      </Reveal>
    </div>
  );
}
