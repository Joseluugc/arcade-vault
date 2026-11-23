# SPEC 09 — Leaderboard: guardar puntuaciones y Salón de la Fama

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 05, SPEC 07
> **Fecha:** 2026-11-23
> **Objetivo:** Guardar en Supabase la puntuación de una partida con las iniciales del jugador y mostrar el top 10 de cada juego en una página `/salon`.

## Por qué existe esta spec

Las puntuaciones se pierden al cerrar el reproductor. La SPEC 07 dejó Supabase conectado sin tablas. Esta spec crea la primera tabla, `scores`, y las dos piezas mínimas de un leaderboard: guardar desde el fin de partida y consultar el ranking en el Salón de la Fama. Aún no hay autenticación, así que el jugador se identifica con sus iniciales.

## Alcance

**Dentro:**

- Tabla `public.scores` en Supabase con restricciones `CHECK`, índice y RLS. Se aplica con `apply_migration` del MCP y el SQL se versiona en `supabase/migrations/`.
- Validación compartida de nombre y puntuación en `lib/scores.ts`.
- Server Action `saveScore` que valida e inserta con el cliente de servidor de `lib/supabase/server.ts`.
- En el modal FIN DEL JUEGO de `GamePlayer.tsx`: campo de iniciales, botón GUARDAR PUNTUACIÓN, estados de guardado, error y éxito, y enlace al Salón.
- Página `app/salon/page.tsx` (Salón de la Fama) portada de `references/templates/salon.jsx`: pestañas por juego jugable, podio y tabla del top 10.
- `app/Nav.tsx`: "Salón de la Fama" apunta a `/salon` en lugar de `/#salon`.
- `CLAUDE.md`: tabla, página y Server Action nuevas en Arquitectura y Estado.

**Fuera de alcance (para specs futuras):**

- Autenticación, `/auth` y asociar puntuaciones a usuarios.
- Fila "TU MEJOR MARCA" del prototipo (requiere usuario).
- Mejor puntuación real en la Biblioteca (sigue mostrando "—").
- Actividad real en la home (sigue usando `games/activity.ts`; la sección conserva `id="salon"`).
- Detalle de juego.
- Antitrampas más allá de las restricciones de la tabla (firmas, validación de partida en servidor, límite de peticiones).
- Moderación, borrado o edición de puntuaciones.
- Tipos generados con `generate_typescript_types`.
- CLI de Supabase.
- Paginación o más de 10 filas por juego.
- Cambios en el motor (`games/engine/`) o en los juegos.

## Modelo de datos

### Tabla `public.scores`

```sql
create table public.scores (
  id bigint generated always as identity primary key,
  game_id text not null check (game_id ~ '^[a-z0-9-]{1,32}$'),
  player_name text not null check (player_name ~ '^[A-Z0-9_]{1,10}$'),
  score integer not null check (score between 1 and 9999999),
  created_at timestamptz not null default now()
);

create index scores_game_rank_idx
  on public.scores (game_id, score desc, created_at);

alter table public.scores enable row level security;

create policy "scores_select_public" on public.scores
  for select to anon, authenticated using (true);

create policy "scores_insert_public" on public.scores
  for insert to anon, authenticated with check (true);
-- Sin políticas de update ni delete: nadie puede modificar ni borrar desde la API.
```

- `game_id` solo valida el formato. Que el juego exista y sea jugable lo comprueba `saveScore` contra `GAME_REGISTRY`, para no necesitar migración cuando se añadan juegos.
- Las restricciones `CHECK` repiten las reglas de `lib/scores.ts`: si alguien inserta saltándose la Server Action con la clave publicable, la base de datos rechaza datos con formato inválido.
- Archivo: `supabase/migrations/<version>_create_scores.sql`, donde `<version>` es la que devuelve `list_migrations` tras aplicarla.

### `lib/scores.ts`

```ts
export const PLAYER_NAME_MAX = 10;
export const PLAYER_NAME_RE = /^[A-Z0-9_]{1,10}$/;
export const SCORE_MIN = 1;
export const SCORE_MAX = 9_999_999;
export const LEADERBOARD_SIZE = 10;

/** Mayúsculas y solo A-Z, 0-9 y _, recortado a 10. Se usa al escribir en el input. */
export function normalizePlayerName(raw: string): string;

export function isValidPlayerName(name: string): boolean;
export function isValidScore(score: number): boolean; // entero entre SCORE_MIN y SCORE_MAX

export interface ScoreRow {
  id: number;
  game_id: string;
  player_name: string;
  score: number;
  created_at: string; // ISO
}
```

Tipo escrito a mano: no se generan tipos del esquema en esta spec.

### Server Action (`app/jugar/[id]/actions.ts`)

```ts
export type SaveScoreResult = { ok: true } | { ok: false; error: string };

export async function saveScore(input: {
  gameId: string;
  playerName: string;
  score: number;
}): Promise<SaveScoreResult>;
```

## Comportamiento

### Guardar puntuación (modal FIN DEL JUEGO)

- Si la puntuación final es `0`, el modal se ve como ahora, sin campo ni botón de guardar.
- Si es mayor que `0`: campo con placeholder `TUS INICIALES` y botón `GUARDAR PUNTUACIÓN` (estilo `.input-row` / `.btn yellow` del prototipo).
- Al escribir, el texto pasa por `normalizePlayerName`: minúsculas a mayúsculas, se descartan caracteres no permitidos y se corta a 10.
- El botón está deshabilitado si el nombre está vacío.
- Estados:
  - **Guardando:** el botón muestra `GUARDANDO…` y está deshabilitado, igual que el campo.
  - **Éxito:** desaparecen campo y botón. Se muestra `▸ PUNTUACIÓN GUARDADA_` (`.toast-saved`) y un enlace `VER EN EL SALÓN` a `/salon?juego=<id>`. La misma partida no se puede volver a guardar.
  - **Error:** campo y botón siguen activos y aparece `NO SE PUDO GUARDAR. INTÉNTALO DE NUEVO.` debajo. El servidor registra la causa con `console.error`.
- `JUGAR DE NUEVO` reinicia también el estado de guardado.
- Pulsar `FIN` también termina la partida y permite guardar.
- Las teclas escritas en el campo no deben pausar el juego (la `P` del reproductor) ni llegar al motor; el juego ya está parado al mostrarse el modal.

### `saveScore`

1. Comprueba que `gameId` es una clave de `GAME_REGISTRY`.
2. Normaliza `playerName` con `normalizePlayerName` y comprueba `isValidPlayerName`.
3. Comprueba `isValidScore(score)`.
4. Si algo falla, devuelve `{ ok: false, error }` sin tocar la base de datos.
5. Inserta `{ game_id, player_name, score }` con `createClient()` de `lib/supabase/server.ts` (clave publicable, nunca `service_role`).
6. Si Supabase devuelve error, lo registra y devuelve `{ ok: false, error }`.
7. Si todo va bien, devuelve `{ ok: true }`.

### Página `/salon`

- Lee `?juego=<id>`. Si falta o no es un juego jugable, usa el primer juego jugable en el orden de `games/catalog.ts`.
- Cabecera "SALÓN DE LA FAMA" con el subtítulo del prototipo.
- Pestañas (`.hall-tabs` + `.chip`): un enlace por juego jugable (los 6 de `GAME_REGISTRY`) a `/salon?juego=<id>`. La pestaña activa lleva `.active`.
- Consulta: `select id, game_id, player_name, score, created_at from scores where game_id = <id> order by score desc, created_at asc limit 10`. En caso de empate gana la partida más antigua.
- Podio (`.podium`, orden visual plata, oro, bronce como en el prototipo): solo los puestos que existen. Con 1 puntuación solo hay oro; con 2, oro y plata.
- Tabla (`.hall-table`): las hasta 10 filas con rango `#01`, jugador, puntuación en formato `es-ES` y fecha `dd/mm/aaaa` en zona `Europe/Madrid`. Las tres primeras llevan `.top1`, `.top2` y `.top3`.
- Sin puntuaciones: no hay podio ni tabla; se muestra `AÚN NO HAY PUNTUACIONES` y un enlace `JUGAR <TÍTULO>` a `/jugar/<id>`.
- Si la consulta falla: se muestra `NO SE PUDO CARGAR EL SALÓN. INTÉNTALO MÁS TARDE.` y el servidor registra el error. Las pestañas siguen visibles.
- Botón final `VOLVER A LA BIBLIOTECA` a `/biblioteca`.
- La app tiene `cacheComponents: true`: la parte que lee `searchParams` y consulta Supabase va dentro de `<Suspense>`, como en `app/jugar/[id]/page.tsx`, y siempre muestra datos frescos (sin caché).
- La barra global marca "Salón de la Fama" como activa en `/salon`.

## Archivos

- `supabase/migrations/<version>_create_scores.sql`: nuevo.
- `lib/scores.ts`: nuevo.
- `app/jugar/[id]/actions.ts`: nuevo.
- `app/jugar/[id]/GamePlayer.tsx`: modal de fin de partida con guardado.
- `app/salon/page.tsx`: nuevo (y componentes auxiliares en `app/salon/` si hacen falta).
- `app/Nav.tsx`: enlace a `/salon`.
- `app/globals.css`: solo si falta algún estilo del prototipo (`.input-row`, mensajes de error o vacío). Las clases `.av-hall`, `.podium`, `.hall-table` y `.toast-saved` ya existen.
- `CLAUDE.md`: arquitectura y estado.

## Plan de implementación

1. Crear la tabla: escribir el SQL, aplicarlo con `apply_migration`, guardarlo en `supabase/migrations/<version>_create_scores.sql` y revisar `get_advisors` (seguridad). La app no cambia.
2. Crear `lib/scores.ts` y la Server Action `saveScore` en `app/jugar/[id]/actions.ts`. Nadie la llama todavía; la app compila igual.
3. Añadir al modal FIN DEL JUEGO de `GamePlayer.tsx` el campo de iniciales, el botón y los estados de guardado, error y éxito. El enlace del éxito apunta a `/salon?juego=<id>` aunque la página aún no exista.
4. Crear `app/salon/page.tsx` con pestañas, podio, tabla, estado vacío y estado de error, consultando antes en `node_modules/next/dist/docs/` cómo se leen `searchParams` y cómo funciona `cacheComponents` en Next 16. Usar el skill `/frontend-design`.
5. Cambiar el enlace de la barra a `/salon` y actualizar `CLAUDE.md`.

## Criterios de aceptación

**Base de datos**

- [ ] `list_tables` muestra `public.scores` con RLS activado.
- [ ] `get_advisors` (seguridad) no muestra avisos sobre `scores`.
- [ ] Insertar con la clave publicable `player_name = 'abc'`, `score = 0` o `score = 10000000` falla por las restricciones.
- [ ] Un `update` o `delete` sobre `scores` con la clave publicable no modifica filas.
- [ ] El SQL aplicado está en `supabase/migrations/`.

**Guardar**

- [ ] Al acabar una partida con más de 0 puntos, el modal muestra `TUS INICIALES` y `GUARDAR PUNTUACIÓN`.
- [ ] Con 0 puntos, el modal no ofrece guardar.
- [ ] Escribir `neon fox!` en el campo deja `NEONFOX`; no se pueden escribir más de 10 caracteres.
- [ ] Con el campo vacío, el botón está deshabilitado.
- [ ] Al guardar se ve `GUARDANDO…` y después `▸ PUNTUACIÓN GUARDADA_` con el enlace `VER EN EL SALÓN`; la fila aparece en `scores`.
- [ ] Tras guardar no se puede guardar otra vez la misma partida; `JUGAR DE NUEVO` permite guardar la siguiente.
- [ ] Con Supabase inaccesible (p. ej. URL incorrecta en `.env.local`), guardar muestra `NO SE PUDO GUARDAR. INTÉNTALO DE NUEVO.` y deja reintentar.
- [ ] Escribir `P` en el campo no pausa ni reanuda nada.

**Salón de la Fama**

- [ ] La barra lleva a `/salon` y marca "Salón de la Fama" como activa.
- [ ] `/salon` sin parámetro y `/salon?juego=noexiste` muestran el primer juego jugable.
- [ ] Hay 6 pestañas, una por juego jugable; Ranaria y Duelo Pixel no aparecen.
- [ ] Con 12 puntuaciones guardadas en un juego, la tabla muestra las 10 mayores en orden descendente y el podio las 3 primeras.
- [ ] Con 2 puntuaciones, el podio solo muestra oro y plata.
- [ ] Un juego sin puntuaciones muestra `AÚN NO HAY PUNTUACIONES` y un enlace a `/jugar/<id>`.
- [ ] Una puntuación recién guardada aparece en `/salon` al recargar, sin reiniciar el servidor.
- [ ] Las fechas se ven como `dd/mm/aaaa`.

**General**

- [ ] `/`, `/biblioteca`, `/acerca` y `/jugar/rocas` funcionan igual que antes, salvo el enlace de la barra.
- [ ] La clave secreta / `service_role` no aparece en el código ni en `.next/static`.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.

## Decisiones

- **Sí:** Supabase en lugar de localStorage. Un leaderboard tiene que ser compartido entre jugadores y dispositivos.
- **Sí:** iniciales al acabar la partida, como el prototipo. Sin autenticación es la forma de distinguir jugadores; guardar es opcional.
- **Sí:** nombre `A-Z`, `0-9` y `_`, de 1 a 10 caracteres. Estilo arcade; evita espacios, emojis y texto largo.
- **Sí:** puntuaciones enteras de 1 a 9.999.999. Una partida de 0 no merece ranking; el tope frena valores absurdos enviados a mano.
- **Sí:** Server Action con validación más restricciones `CHECK` y RLS. La Server Action da errores claros y comprueba el juego contra `GAME_REGISTRY`; la base de datos protege si alguien inserta directamente con la clave publicable.
- **No:** clave secreta / `service_role`. La inserción anónima con RLS basta y la clave no sale del navegador ni del servidor.
- **No:** antitrampas real. Sin autenticación ni validación de la partida en el servidor, cualquiera puede enviar una puntuación válida falsa. Se acepta para esta versión.
- **Sí:** solo `select` e `insert` en RLS. Nadie puede modificar ni borrar puntuaciones desde la API.
- **Sí:** `game_id` validado por formato en la tabla y contra `GAME_REGISTRY` en la Server Action. Añadir juegos no exige migración.
- **Sí:** migración con el MCP y SQL versionado en `supabase/migrations/`. Historial en git sin introducir la CLI.
- **Sí:** top 10 por juego con todas las partidas. Un mismo nombre puede aparecer varias veces, como en un arcade clásico. Empates: gana la partida más antigua.
- **Sí:** `/salon?juego=<id>` en un componente servidor. La URL se puede compartir y solo se consulta el juego visible.
- **Sí:** solo juegos jugables como pestañas. Los no jugables no pueden tener puntuaciones.
- **Sí:** podio parcial y mensaje de vacío. No inventa puestos.
- **Sí:** aviso y enlace al Salón tras guardar. Cierra el ciclo jugar → guardar → ver ranking.
- **Sí:** fechas en `Europe/Madrid`. El servidor renderiza en UTC; fijar la zona evita fechas desplazadas un día.
- **No:** Biblioteca y actividad de la home con datos reales. Se dejan para otra spec para mantener esta acotada.
- **No:** tipos generados del esquema. Con una tabla y un tipo escrito a mano es suficiente.

## Riesgos

| Riesgo                                                | Mitigación                                                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Puntuaciones falsas enviadas con la clave publicable  | Restricciones `CHECK` y tope de 9.999.999. Se asume para esta versión; el antitrampas real queda fuera de alcance.       |
| Spam de inserciones                                   | Sin límite en esta spec. Solo afecta a ruido en la tabla; se puede limpiar desde el panel de Supabase.                   |
| `cacheComponents` deja `/salon` con datos antiguos    | Consulta dentro de `<Suspense>` y dependiente de `searchParams`; criterio de aceptación de recargar y ver la nueva fila. |
| Sin variables de Supabase, `/salon` y guardar fallan  | Ya pasa en toda la app por el proxy (SPEC 07); además, los estados de error muestran un mensaje en lugar de romper.      |
| Las teclas del campo llegan al reproductor o al motor | El juego está parado con el modal abierto; el atajo `P` ignora eventos cuyo destino es un campo de texto.                |

## Lo que **no** entra en esta spec

- Autenticación y puntuaciones ligadas a usuarios.
- Mejor puntuación en la Biblioteca y actividad real en la home.
- Antitrampas, límite de peticiones y moderación.
- Edición o borrado de puntuaciones.
- Tipos generados y CLI de Supabase.
- Más de 10 filas o paginación.
