# SPEC 06 — Envío del formulario de contacto con Resend

> **Estado:** Aprobado
> **Depende de:** SPEC 05
> **Fecha:** 2026-11-19
> **Objetivo:** Hacer que el formulario de contacto de `/acerca` envíe un correo real al equipo mediante Resend.

## Por qué existe esta spec

La SPEC 05 portó la página Acerca de desde `references/templates/home-about/about.jsx` con un formulario solo visual. Esta spec no rehace la página. Solo conecta el formulario a un envío real, conservando el diseño y la terminal de éxito del prototipo.

## Alcance

**Dentro:**

- Server Action `sendContactMessage` en `app/acerca/actions.ts` que envía el correo con el SDK oficial `resend`.
- Validación en el servidor: campos obligatorios, formato de correo y longitudes máximas.
- Honeypot anti-spam en el formulario.
- Estado de envío en el botón ("▶ TRANSMITIENDO…") y error en línea estilo terminal si falla.
- Configuración por variables de entorno: `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL`.
- Documentar las variables en `CLAUDE.md`.

**Fuera de alcance (para specs futuras):**

- Correo de confirmación al usuario. Necesita un dominio verificado en Resend.
- Verificar un dominio propio en Resend. Es configuración externa; al hacerlo solo cambian las variables de entorno.
- Límite de envíos por IP. En serverless la memoria no se comparte entre instancias.
- CAPTCHA.
- Guardar los mensajes en base de datos.
- Plantilla HTML del correo.
- Cambios visuales en la página Acerca de fuera del formulario.

## Modelo de datos

```ts
// app/acerca/actions.ts
"use server";

export interface ContactInput {
  name: string;     // obligatorio, máx. 80 caracteres tras trim
  email: string;    // obligatorio, máx. 254, formato correo
  msg: string;      // obligatorio, máx. 2000
  website: string;  // honeypot: debe llegar vacío
}

export type ContactResult = { ok: true } | { ok: false; error: string };

export async function sendContactMessage(input: ContactInput): Promise<ContactResult>;
```

Variables de entorno, en `.env.local` (ya ignorado por git mediante `.env*`):

| Variable | Valor inicial | Uso |
| --- | --- | --- |
| `RESEND_API_KEY` | clave de la cuenta de Resend | Autenticación con Resend |
| `CONTACT_TO_EMAIL` | correo con el que se creó la cuenta de Resend | Destinatario del mensaje |
| `CONTACT_FROM_EMAIL` | `Arcade Vault <onboarding@resend.dev>` | Remitente |

Correo enviado:

- `from`: `CONTACT_FROM_EMAIL`.
- `to`: `CONTACT_TO_EMAIL`.
- `replyTo`: el correo del usuario.
- `subject`: `[Arcade Vault] Mensaje de contacto de {name}`.
- `text`: texto plano con nombre, correo y mensaje.

Mensajes de error que devuelve la acción (se muestran tal cual tras `[ERROR] `):

- Validación: `Revisa los campos: {detalle}.` (p. ej. `el correo no es válido`, `el mensaje supera 2000 caracteres`).
- Fallo de Resend o configuración ausente: `No se pudo enviar el mensaje. Inténtalo de nuevo más tarde.`

## Comportamiento

**Servidor (`sendContactMessage`):**

1. Si `website` no está vacío, devuelve `{ ok: true }` sin enviar nada.
2. Recorta los campos con `trim()` y los valida. Si alguno falla, devuelve `{ ok: false, error }` sin llamar a Resend.
3. Si falta alguna de las tres variables de entorno, registra con `console.error` cuál falta y devuelve el error genérico.
4. Llama a `resend.emails.send(...)`. Si devuelve `error` o lanza excepción, lo registra con `console.error` y devuelve el error genérico.
5. Si todo va bien, devuelve `{ ok: true }`.

**Cliente (`ContactForm.tsx`):**

- Se mantiene la validación de campos vacíos con `.shake` de la SPEC 05, antes de llamar al servidor.
- Durante el envío, el botón está deshabilitado y muestra "▶ TRANSMITIENDO…". Los campos también quedan deshabilitados.
- Con `{ ok: true }` se muestra la terminal de éxito con el nombre en mayúsculas, igual que ahora.
- Con `{ ok: false }` se conservan los datos y aparece bajo el botón una línea `[ERROR] {error}` con `role="alert"`. Se borra al volver a enviar.
- El honeypot es un `<input name="website">` fuera de pantalla, con `tabIndex={-1}`, `autoComplete="off"` y `aria-hidden="true"` en su contenedor.
- "ENVIAR OTRO MENSAJE" vacía los campos, el honeypot y el error.

## Archivos

- `package.json`: nueva dependencia `resend`.
- `app/acerca/actions.ts`: nuevo. Server Action, validación y envío.
- `app/acerca/ContactForm.tsx`: estado de envío, error, honeypot y llamada a la acción.
- `app/globals.css`: clases `.contact-error` (línea de error estilo terminal, en `--magenta` o el rojo del tema) y `.contact-hp` (honeypot fuera de pantalla).
- `CLAUDE.md`: variables de entorno y estado actualizado.

## Plan de implementación

1. Instalar `resend`. Crear `app/acerca/actions.ts` con `sendContactMessage`, la validación, el honeypot y las comprobaciones de entorno. El formulario aún no la usa; la app compila igual.
2. Conectar `ContactForm.tsx` a la acción: estado de envío, botón deshabilitado con "▶ TRANSMITIENDO…", terminal de éxito con `{ ok: true }` y línea de error con `{ ok: false }`.
3. Añadir el honeypot al formulario y las clases `.contact-error` y `.contact-hp` a `app/globals.css`.
4. Actualizar `CLAUDE.md`: variables de entorno necesarias, formulario de contacto real y quitarlo de "Pendiente".

## Criterios de aceptación

**Envío**

- [ ] Con las tres variables configuradas, enviar el formulario hace llegar un correo a `CONTACT_TO_EMAIL`.
- [ ] El asunto es `[Arcade Vault] Mensaje de contacto de {nombre}` y el cuerpo contiene nombre, correo y mensaje.
- [ ] Responder al correo desde el cliente de correo dirige la respuesta al correo del usuario.
- [ ] Tras el envío correcto se muestra la terminal de éxito con el nombre en mayúsculas.

**Estados del formulario**

- [ ] Durante el envío, el botón muestra "▶ TRANSMITIENDO…" y no se puede pulsar otra vez.
- [ ] Enviar con algún campo vacío aplica `.shake` y no genera ninguna petición en la pestaña Network.
- [ ] Un mensaje de más de 2000 caracteres muestra `[ERROR] Revisa los campos: …` y no envía correo.
- [ ] Con `RESEND_API_KEY` inválida o ausente se muestra `[ERROR] No se pudo enviar el mensaje. Inténtalo de nuevo más tarde.`, los datos se conservan y la consola del servidor indica la causa.
- [ ] "ENVIAR OTRO MENSAJE" vuelve al formulario vacío y sin error.

**Seguridad**

- [ ] Rellenar el honeypot (desde las DevTools) muestra la terminal de éxito y no llega ningún correo.
- [ ] El honeypot no es visible ni alcanzable con Tab.
- [ ] La clave de Resend no aparece en ningún archivo bajo `.next/static` tras `npm run build`.
- [ ] Ningún archivo versionado contiene la clave de Resend.

**General**

- [ ] La consola del navegador no muestra errores en `/acerca`.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.

## Decisiones

- **Sí:** Server Action. No expone un endpoint público y la clave nunca llega al navegador.
- **No:** Route Handler `POST /api/contact`. Solo aporta valor si otros clientes lo usan, y no los hay.
- **Sí:** SDK oficial `resend`. Tipado y mantenido por Resend; evita escribir la llamada HTTP a mano.
- **Sí:** solo un correo al equipo con `replyTo` del usuario. Sin dominio verificado, Resend solo envía al correo de la cuenta.
- **No:** correo de confirmación al usuario. Requiere dominio verificado.
- **Sí:** remitente `onboarding@resend.dev` en una variable de entorno. Al verificar un dominio solo cambia `.env.local`, no el código.
- **Sí:** honeypot y longitudes máximas como anti-spam. Sin dependencias ni estado.
- **Sí:** el honeypot finge éxito. El bot no recibe pistas de que fue detectado.
- **No:** límite por IP en memoria. Poco fiable en serverless.
- **No:** CAPTCHA. Fricción para el usuario y dependencia externa para un tráfico todavía pequeño.
- **Sí:** validar en el servidor aunque el cliente ya valide. El cliente no es de fiar.
- **Sí:** sin variables de entorno, la acción devuelve error y lo registra. Un fallo de configuración debe notarse, no simular éxito.
- **No:** modo desarrollo que simule el envío. Ocultaría configuraciones rotas.
- **Sí:** correo en texto plano. Suficiente para leer y responder; la plantilla HTML queda fuera.
- **Sí:** la clave nunca se escribe en la spec ni en el repositorio, solo en `.env.local`. Se compartió en el chat al definir esta spec; conviene rotarla antes de usarla.
- Esta spec sustituye el criterio de la SPEC 05 "Enviar el formulario no genera ninguna petición en la pestaña Network".

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La clave de Resend se filtra al repositorio | Solo en `.env.local`, ignorado por `.env*`. La spec y `CLAUDE.md` nombran la variable, nunca el valor. |
| La clave compartida en el chat queda comprometida | Rotarla en el panel de Resend antes de ponerla en `.env.local`. |
| Sin dominio verificado, Resend rechaza destinatarios distintos del correo de la cuenta | `CONTACT_TO_EMAIL` es el correo de la cuenta. El error se registra en el servidor. |
| Cuota del plan gratuito de Resend agotada por spam | Honeypot y longitudes máximas. Si no basta, CAPTCHA o rate limit en otra spec. |
| Inyección de cabeceras con el nombre en el asunto | El nombre se recorta y se eliminan los saltos de línea antes de usarlo en el asunto. |

## Lo que **no** entra en esta spec

- Correo de confirmación al usuario.
- Verificación de dominio en Resend.
- Límite por IP y CAPTCHA.
- Persistencia de los mensajes.
- Plantilla HTML del correo.
- Cambios visuales en Acerca de fuera del formulario.
