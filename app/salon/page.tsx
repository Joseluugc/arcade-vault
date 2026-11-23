import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GAMES, type GameMeta } from "@/games/catalog";
import { GAME_REGISTRY } from "@/games/registry";
import { LEADERBOARD_SIZE, type ScoreRow } from "@/lib/scores";
import { createClient } from "@/lib/supabase/server";
export const metadata: Metadata = {
  title: "Salón de la Fama · Arcade Vault",
  description: "Las 10 mejores puntuaciones de cada juego de Arcade Vault.",
};
/** Juegos jugables en el orden del catálogo: son las pestañas del salón. */
const PLAYABLE_GAMES = GAMES.filter((g) => Object.hasOwn(GAME_REGISTRY, g.id));
// El servidor renderiza en UTC: se fija la zona para no desplazar la fecha un día.
const DATE_FORMAT = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const formatScore = (score: number) => score.toLocaleString("es-ES");
const formatDate = (iso: string) => DATE_FORMAT.format(new Date(iso));
const formatRank = (index: number) => String(index + 1).padStart(2, "0");
export default function SalonPage({ searchParams }: PageProps<"/salon">) {
  return (
    <div className="av-hall">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>
      {/* searchParams y la consulta son datos de la petición: sin caché, dentro de Suspense. */}
      <Suspense fallback={<p className="hall-msg">CARGANDO…</p>}>
        <Hall searchParams={searchParams} />
      </Suspense>
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/biblioteca" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
async function Hall({
  searchParams,
}: {
  searchParams: PageProps<"/salon">["searchParams"];
}) {
  const { juego } = await searchParams;
  const game = PLAYABLE_GAMES.find((g) => g.id === juego) ?? PLAYABLE_GAMES[0];
  const rows = await fetchTopScores(game.id);
  return (
    <>
      <nav className="hall-tabs" aria-label="Juegos">
        {PLAYABLE_GAMES.map((g) => (
          <Link
            key={g.id}
            href={`/salon?juego=${g.id}`}
            className={"chip" + (g.id === game.id ? " active" : "")}
            aria-current={g.id === game.id ? "page" : undefined}
            scroll={false}
          >
            {g.title}
          </Link>
        ))}
      </nav>
      {rows === null ? (
        <p className="contact-error hall-error" role="alert">
          NO SE PUDO CARGAR EL SALÓN. INTÉNTALO MÁS TARDE.
        </p>
      ) : rows.length === 0 ? (
        <EmptyHall game={game} />
      ) : (
        <>
          <Podium rows={rows} />
          <ScoreTable rows={rows} />
        </>
      )}
    </>
  );
}
/** Top de un juego, o `null` si la consulta falla. En empate gana la partida más antigua. */
async function fetchTopScores(gameId: string): Promise<ScoreRow[] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("scores")
      .select("id, game_id, player_name, score, created_at")
      .eq("game_id", gameId)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(LEADERBOARD_SIZE);
    if (error) {
      console.error("[salon] Supabase select failed:", error);
      return null;
    }
    return data as ScoreRow[];
  } catch (err) {
    console.error("[salon] Unexpected error:", err);
    return null;
  }
}
const PODIUM_SLOTS = [
  { index: 1, className: "silver" },
  { index: 0, className: "gold" },
  { index: 2, className: "bronze" },
] as const;
/** Podio en orden visual plata, oro, bronce; solo los puestos que existen. */
function Podium({ rows }: { rows: ScoreRow[] }) {
  return (
    <div className="podium">
      {PODIUM_SLOTS.map(({ index, className }) => {
        const row = rows[index];
        if (!row) return null;
        const gold = index === 0;
        return (
          <div key={row.id} className={`podium-slot ${className}`}>
            {gold && (
              <div
                className="pixel"
                style={{
                  fontSize: 9,
                  color: "var(--gold)",
                  letterSpacing: "0.18em",
                }}
              >
                CAMPEÓN
              </div>
            )}
            <div
              className="rank-num"
              style={gold ? { fontSize: 36, marginTop: 4 } : undefined}
            >
              {formatRank(index)}
            </div>
            <div className="name">{row.player_name}</div>
            <div className="score" style={gold ? { fontSize: 20 } : undefined}>
              {formatScore(row.score)}
            </div>
            <div className="date">{formatDate(row.created_at)}</div>
          </div>
        );
      })}
    </div>
  );
}
const TOP_CLASS = ["top1", "top2", "top3"];
function ScoreTable({ rows }: { rows: ScoreRow[] }) {
  return (
    <div className="hall-table" role="table" aria-label="Mejores puntuaciones">
      <div className="th" role="row">
        <div role="columnheader">RANGO</div>
        <div role="columnheader">JUGADOR</div>
        <div role="columnheader">PUNTUACIÓN</div>
        <div role="columnheader">FECHA</div>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.id}
          className={"tr" + (TOP_CLASS[i] ? ` ${TOP_CLASS[i]}` : "")}
          style={{ animationDelay: `${i * 50}ms` }}
          role="row"
        >
          <div className="rk" role="cell">
            #{formatRank(i)}
          </div>
          <div className="pl" role="cell">
            {r.player_name}
          </div>
          <div className="sc" role="cell">
            {formatScore(r.score)}
          </div>
          <div className="dt" role="cell">
            {formatDate(r.created_at)}
          </div>
        </div>
      ))}
    </div>
  );
}
function EmptyHall({ game }: { game: GameMeta }) {
  return (
    <div className="hall-empty">
      <p className="pixel">AÚN NO HAY PUNTUACIONES</p>
      <Link href={`/jugar/${game.id}`} className="btn yellow">
        JUGAR {game.title}
      </Link>
    </div>
  );
}
