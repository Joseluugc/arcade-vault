# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Arcade Vault: plataforma para jugar online y competir por la mayor cantidad de puntos. El README indica que el proyecto sigue Spec Driven Design mediante los skills `/spec` y `/spec-impl`, instalados con `npx skills@latest add Klerith/fernando-skills`.

## Comandos

- `npm run dev`: servidor de desarrollo (http://localhost:3000)
- `npm run build` / `npm run start`: compilar para producción / servir la compilación
- `npm run lint`: ESLint (configuración flat en `eslint.config.mjs`)

No hay ningún framework de pruebas configurado.

## Stack y advertencias

- Next.js 16.4.6, React 19.3, Tailwind 4 (`@tailwindcss/turbopack`), TypeScript. App Router en `app/`; el alias `@/*` apunta a la raíz del repositorio.
- `AGENTS.md` advierte que esta versión de Next.js tiene cambios incompatibles respecto a lo conocido previamente. Antes de escribir código de Next.js, lee la guía relevante en `node_modules/next/dist/docs/`.
- `app/` sigue siendo el esqueleto de create-next-app (`layout.tsx`, `page.tsx`, `globals.css`). La aplicación real aún no está construida.

## Referencia de diseño

`resources/templates/` contiene el prototipo de UI que se debe portar a la app de Next.js: `Arcade Vault.html` más pantallas `.jsx` (`auth`, `biblioteca`, `detalle`, `reproductor`, `salon`, `nav`, `app`), datos de prueba en `data.jsx` y `styles.css`. Trátalo como la especificación visual y de comportamiento, no como código para publicar tal cual. Las pantallas sugieren el dominio: autenticación, biblioteca de juegos, detalle de juego, reproductor y salón de puntuaciones.

## Idioma

La documentación y las respuestas deben estar en español. El código (nombres de variables, funciones, archivos) puede estar en inglés.
