# SPEC 07 — Conexión con Supabase

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-23
> **Objetivo:** Conectar la app de Next.js con el proyecto de Supabase mediante `@supabase/ssr`, sin crear tablas ni cambiar la interfaz.

## Por qué existe esta spec

Las funcionalidades pendientes (autenticación, puntuaciones, salón de la fama) necesitan Supabase. Esta spec solo deja la conexión preparada y verificada. Cada funcionalidad llegará después en su propia spec, con sus tablas y su UI.

## Alcance

**Dentro:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- Cliente de Supabase para el servidor (componentes servidor, Server Actions y Route Handlers).
- Cliente de Supabase para el navegador (componentes cliente).
- `proxy.ts` en la raíz que refresca la sesión de Supabase en las cookies en cada petición. En Next 16 sustituye a `middleware.ts`.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, documentadas en `.env.example`.
- Documentar la conexión en `CLAUDE.md`.

**Fuera de alcance (para specs futuras):**

- Crear tablas, funciones, triggers o políticas RLS en la base de datos.
- Migraciones y CLI de Supabase.
- Autenticación y pantalla `/auth`.
- Persistencia de puntuaciones, `/salon` y actividad real.
- Tipos de TypeScript generados a partir del esquema. No hay esquema propio todavía.
- Cualquier cambio visual o de comportamiento en la app.
- Endpoint o página de comprobación de estado.

## Modelo de datos

Esta spec no introduce estructuras de datos ni tablas.

Variables de entorno, en `.env.local` (ya ignorado por git mediante `.env*`):

| Variable                               | Uso                                                          |
| -------------------------------------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL del proyecto de Supabase                                 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publicable (`sb_publishable_…`). Es pública por diseño |

Los valores se obtienen del panel de Supabase (Project Settings → API) o con el MCP (`get_project_url`, `get_publishable_keys`). Nunca se escriben en el repositorio.

No se usa la clave secreta / `service_role`.

API interna que queda disponible para las próximas specs:

```ts
// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient>; // usa cookies() de next/headers

// lib/supabase/client.ts
export function createClient(): SupabaseClient; // createBrowserClient

// lib/supabase/proxy.ts
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse>;
```

## Comportamiento

- `proxy.ts` llama a `updateSession` en cada petición, salvo estáticos (`_next/static`, `_next/image`, `favicon.ico` e imágenes) excluidos en el `matcher`.
- `updateSession` crea un cliente de servidor ligado a la petición, llama a `supabase.auth.getClaims()` para refrescar la sesión si existe y devuelve la respuesta con las cookies actualizadas. No redirige nunca.
- Sin sesión (todos los visitantes, de momento), el proxy deja pasar la petición sin cambios.
- Si falta alguna de las dos variables, los clientes lanzan un error que nombra la variable que falta.
- Ninguna página ni componente existente usa los clientes todavía. La app se ve y se comporta igual que antes.

## Archivos

- `package.json`: dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- `lib/supabase/server.ts`: nuevo.
- `lib/supabase/client.ts`: nuevo.
- `lib/supabase/proxy.ts`: nuevo.
- `proxy.ts`: nuevo, en la raíz del repositorio.
- `.env.example`: las dos variables nuevas, sin valores, con un comentario sobre dónde obtenerlas.
- `CLAUDE.md`: Supabase en stack, variables de entorno y arquitectura.

## Plan de implementación

1. Instalar `@supabase/supabase-js` y `@supabase/ssr`. Añadir las dos variables a `.env.example`. Obtener sus valores con el MCP y escribirlos solo en `.env.local`.
2. Crear `lib/supabase/server.ts` y `lib/supabase/client.ts` siguiendo la guía de `@supabase/ssr` para Next.js. La app compila igual; nadie los usa todavía.
3. Crear `lib/supabase/proxy.ts` y `proxy.ts` en la raíz, consultando antes `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`. Todas las páginas siguen cargando.
4. Actualizar `CLAUDE.md`: Supabase en stack, variables de entorno, carpeta `lib/supabase/` y `proxy.ts` en arquitectura.

## Criterios de aceptación

**Conexión**

- [ ] `curl -s -o /dev/null -w "%{http_code}" "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/health" -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"` devuelve `200` con los valores de `.env.local`.
- [ ] Con `npm run dev`, cargar `/` no muestra errores de Supabase en la consola del servidor.
- [ ] Quitar `NEXT_PUBLIC_SUPABASE_URL` de `.env.local` y cargar `/` produce un error que nombra esa variable.

**Sin regresiones**

- [ ] `/`, `/biblioteca`, `/acerca` y `/jugar/serpentina` se ven y funcionan igual que antes.
- [ ] Los recursos de `_next/static` no pasan por el proxy.
- [ ] La base de datos no tiene tablas nuevas en el esquema `public` (comprobado con `list_tables` del MCP).

**Seguridad**

- [ ] Ningún archivo versionado contiene los valores de las variables de Supabase.
- [ ] La clave secreta / `service_role` no aparece en el código ni en `.next/static` tras `npm run build`.

**General**

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.

## Decisiones

- **Sí:** spec solo de conexión. Sin tablas ni UI; cada funcionalidad tendrá su spec.
- **Sí:** `@supabase/ssr`. Es la integración oficial para Next.js con App Router y guarda la sesión en cookies, lo que necesitará la futura autenticación.
- **Sí:** `proxy.ts` ya en esta spec. Es parte de la integración estándar de `@supabase/ssr`. Sin sesiones todavía no hace nada visible, pero evita rehacer la base al añadir auth.
- **Sí:** `proxy.ts` en lugar de `middleware.ts`. En Next 16 `middleware` está obsoleto y renombrado.
- **Sí:** `getClaims()` en el proxy. Valida el JWT, a diferencia de `getSession()`.
- **Sí:** clave publicable (`sb_publishable_…`) en lugar de la `anon` heredada. Es el formato actual de Supabase.
- **No:** clave secreta. Nada en esta spec la necesita.
- **Sí:** verificar la conexión con `curl` al endpoint de salud de Auth. Comprueba URL y clave sin tablas ni código de prueba en la app.
- **No:** página o endpoint `/api/health`. Sería código sin uso real.
- **No:** tipos generados del esquema. No hay tablas propias que tipar.
- **Sí:** error explícito si falta una variable. Un fallo de configuración debe notarse, igual que en SPEC 06.

## Riesgos

| Riesgo                                               | Mitigación                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| El proxy añade latencia a cada petición              | Sin sesión, `getClaims()` no hace llamadas de red. El `matcher` excluye estáticos.    |
| Sin variables, todas las páginas fallan por el proxy | El error nombra la variable. `.env.example` las documenta.                            |
| Los valores se filtran al repositorio                | Solo en `.env.local`. La spec y `CLAUDE.md` nombran las variables, nunca los valores. |

## Lo que **no** entra en esta spec

- Tablas, funciones, triggers y RLS.
- Migraciones y CLI de Supabase.
- Autenticación y `/auth`.
- Puntuaciones, `/salon` y actividad real.
- Cambios visuales o de comportamiento.
