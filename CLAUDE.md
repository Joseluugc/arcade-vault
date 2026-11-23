# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Arcade Vault: plataforma para jugar online y competir por la mayor cantidad de puntos. El README indica que el proyecto sigue Spec Driven Design mediante los skills `/spec` y `/spec-impl`, instalados con `npx skills@latest add Klerith/fernando-skills`.

## Stack y advertencias

- Next.js 16.4.6, React 19.3, Tailwind 4 (`@tailwindcss/turbopack`), TypeScript. App Router en `app/`; el alias `@/*` apunta a la raíz del repositorio.
- `AGENTS.md` advierte que esta versión de Next.js tiene cambios incompatibles respecto a lo conocido previamente. Antes de escribir código de Next.js, lee la guía relevante en `node_modules/next/dist/docs/`.
- Supabase vía `@supabase/ssr` + `@supabase/supabase-js` (SPEC 07). Solo conexión: aún no hay tablas propias, ni auth, ni tipos generados. Se usa la clave publicable; nunca la secreta / `service_role`.
- Comandos: `npm run dev`, `npm run build`, `npm run lint`. No hay tests; la verificación mínima es `npx tsc --noEmit` + `npm run lint` + `npm run build`.
- Variables de entorno en `.env.local` (ignorado por git; nunca escribas sus valores en el repositorio): `RESEND_API_KEY`, `CONTACT_TO_EMAIL` (destinatario; sin dominio verificado en Resend debe ser el correo de la cuenta) y `CONTACT_FROM_EMAIL` (p. ej. `Arcade Vault <onboarding@resend.dev>`). Sin ellas, el formulario de contacto muestra un error y el servidor registra cuál falta.
- Supabase en `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`), documentadas en `.env.example`. Se obtienen en Project Settings → API o con el MCP (`get_project_url`, `get_publishable_keys`). Si falta alguna, los clientes lanzan un error que la nombra y, como el proxy corre en cada petición, falla toda la app.

## Arquitectura

- `app/page.tsx`: home (SPEC 05). Hero, "¿Por qué?", 6 juegos jugables, estadísticas, actividad (`id="salon"`, datos de prueba de `games/activity.ts`), precios/FAQ y CTA final. Las secciones usan `app/Reveal.tsx` (aparición al hacer scroll) y el arte SVG de `app/PixelArt.tsx`.
- `app/biblioteca/`: Biblioteca (selección de juegos). `page.tsx` es un componente servidor que calcula los juegos jugables según `GAME_REGISTRY` y los pasa a `GameLibrary.tsx` (cliente: búsqueda, filtro por categoría, tarjetas con portada). Los juegos sin registrar aparecen como "PRÓXIMAMENTE".
- `app/acerca/`: página Acerca de con misión y formulario de contacto (`ContactForm.tsx`). Envía con la Server Action `sendContactMessage` de `actions.ts` (SPEC 06): validación en servidor, honeypot `website` y correo al equipo vía Resend con `replyTo` del usuario.
- `app/Nav.tsx`: barra global con Inicio, Biblioteca, Salón de la Fama (ancla `/#salon` hasta que exista `/salon`) y Acerca de. Créditos fijos (`GUEST_CREDITS`) y "Iniciar Sesión" hacia `/auth`, que aún no existe.
- `app/jugar/[id]/`: reproductor (`GamePlayer.tsx`), con HUD, pausa (P) y fin de partida. Devuelve 404 si el id no está en el registro.
- `app/globals.css`: tema completo portado de `references/templates/styles.css` y de `references/templates/home-about/styles.css` (tokens de color, `.btn`, `.card`, portadas CSS `.cover-*`, nav, etc.). Reutiliza estas clases antes de crear estilos nuevos.
- `lib/supabase/`: `server.ts` (`createClient()` async para componentes servidor, Server Actions y Route Handlers; crear uno por petición), `client.ts` (`createClient()` para componentes cliente), `proxy.ts` (`updateSession`) y `env.ts` (lee y valida las variables con acceso estático a `process.env`). Ninguna página los usa todavía.
- `proxy.ts` (raíz): convención de Next 16 que sustituye a `middleware.ts`. Llama a `updateSession`, que refresca la sesión de Supabase en cookies con `auth.getClaims()` y nunca redirige. El `matcher` excluye `_next/static`, `_next/image`, `favicon.ico` e imágenes.
- `games/catalog.ts`: metadatos de los 8 juegos (`GameMeta`: título, textos, categoría, `cover`, color) y `GAME_CATEGORIES`. Es la fuente de datos de la UI.
- `games/registry.ts`: `GAME_REGISTRY`, juegos realmente jugables. Un juego en el catálogo pero no en el registro se muestra pero no se puede jugar.
- `games/engine/`: motor en canvas (`GameCanvas`, bucle a 60 FPS en `loop.ts`, `input.ts`, `palette.ts`). Cada juego exporta un `GameDefinition` (`id` + `create(ctx)` que devuelve `update`/`render`).
- `games/<id>/`: implementación de cada juego (bloque-buster, caida, serpentina, gloton, invasores, rocas). Ranaria y Duelo Pixel están pendientes (SPEC 04).

## Estado

- Hecho: motor y reproductor (SPEC 01), juegos de rejilla (SPEC 02), juegos de disparo (SPEC 03), pantalla Biblioteca, home, Acerca de y barra de navegación (SPEC 05), envío del formulario de contacto con Resend (SPEC 06).
- Pendiente: SPEC 04 (Ranaria, Duelo Pixel), detalle de juego, autenticación (`/auth`), página del salón de la fama (`/salon`), y persistencia de puntuaciones (la Biblioteca muestra "—" en mejor puntuación y la actividad de la home usa datos de prueba).
- Las specs viven en `specs/NN-nombre.md`. `.trees/` contiene git worktrees creados con el skill `/worktree`.

## Referencia de diseño

`references/templates/` contiene el prototipo de UI que se debe portar a la app de Next.js: `Arcade Vault.html` más pantallas `.jsx` (`auth`, `biblioteca`, `detalle`, `reproductor`, `salon`, `nav`, `app`), datos de prueba en `data.jsx` y `styles.css`. Trátalo como la especificación visual y de comportamiento, no como código para publicar tal cual. Las pantallas sugieren el dominio: autenticación, biblioteca de juegos, detalle de juego, reproductor y salón de puntuaciones.

## Idioma

La documentación y las respuestas deben estar en español. El código (nombres de variables, funciones, archivos) puede estar en inglés.

## Skills
Usa siempre el /frontend-design skills para hacer interfaces de usuarios.