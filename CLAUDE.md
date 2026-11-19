# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Arcade Vault: plataforma para jugar online y competir por la mayor cantidad de puntos. El README indica que el proyecto sigue Spec Driven Design mediante los skills `/spec` y `/spec-impl`, instalados con `npx skills@latest add Klerith/fernando-skills`.

## Stack y advertencias

- Next.js 16.4.6, React 19.3, Tailwind 4 (`@tailwindcss/turbopack`), TypeScript. App Router en `app/`; el alias `@/*` apunta a la raíz del repositorio.
- `AGENTS.md` advierte que esta versión de Next.js tiene cambios incompatibles respecto a lo conocido previamente. Antes de escribir código de Next.js, lee la guía relevante en `node_modules/next/dist/docs/`.
- Comandos: `npm run dev`, `npm run build`, `npm run lint`. No hay tests; la verificación mínima es `npx tsc --noEmit` + `npm run lint` + `npm run build`.

## Arquitectura

- `app/page.tsx`: Biblioteca (selección de juegos). Componente servidor que calcula los juegos jugables según `GAME_REGISTRY` y los pasa a `app/GameLibrary.tsx` (cliente: búsqueda, filtro por categoría, tarjetas con portada). Los juegos sin registrar aparecen como "PRÓXIMAMENTE".
- `app/jugar/[id]/`: reproductor (`GamePlayer.tsx`), con HUD, pausa (P) y fin de partida. Devuelve 404 si el id no está en el registro.
- `app/globals.css`: tema completo portado de `references/templates/styles.css` (tokens de color, `.btn`, `.card`, portadas CSS `.cover-*`, nav, etc.). Reutiliza estas clases antes de crear estilos nuevos.
- `games/catalog.ts`: metadatos de los 8 juegos (`GameMeta`: título, textos, categoría, `cover`, color) y `GAME_CATEGORIES`. Es la fuente de datos de la UI.
- `games/registry.ts`: `GAME_REGISTRY`, juegos realmente jugables. Un juego en el catálogo pero no en el registro se muestra pero no se puede jugar.
- `games/engine/`: motor en canvas (`GameCanvas`, bucle a 60 FPS en `loop.ts`, `input.ts`, `palette.ts`). Cada juego exporta un `GameDefinition` (`id` + `create(ctx)` que devuelve `update`/`render`).
- `games/<id>/`: implementación de cada juego (bloque-buster, caida, serpentina, gloton, invasores, rocas). Ranaria y Duelo Pixel están pendientes (SPEC 04).

## Estado

- Hecho: motor y reproductor (SPEC 01), juegos de rejilla (SPEC 02), juegos de disparo (SPEC 03), pantalla Biblioteca.
- Pendiente: SPEC 04 (Ranaria, Duelo Pixel), detalle de juego, autenticación, salón de la fama, barra de navegación y persistencia de puntuaciones (la Biblioteca muestra "—" en mejor puntuación).
- Las specs viven en `specs/NN-nombre.md`. `.trees/` contiene git worktrees creados con el skill `/worktree`.

## Referencia de diseño

`references/templates/` contiene el prototipo de UI que se debe portar a la app de Next.js: `Arcade Vault.html` más pantallas `.jsx` (`auth`, `biblioteca`, `detalle`, `reproductor`, `salon`, `nav`, `app`), datos de prueba en `data.jsx` y `styles.css`. Trátalo como la especificación visual y de comportamiento, no como código para publicar tal cual. Las pantallas sugieren el dominio: autenticación, biblioteca de juegos, detalle de juego, reproductor y salón de puntuaciones.

## Idioma

La documentación y las respuestas deben estar en español. El código (nombres de variables, funciones, archivos) puede estar en inglés.

## Skills
Usa siempre el /frontend-design skills para hacer interfaces de usuarios.