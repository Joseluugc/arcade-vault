"use server";

import { Resend } from "resend";

export interface ContactInput {
  name: string;
  email: string;
  msg: string;
  /** Honeypot: un usuario real lo deja vacío. */
  website: string;
}

export type ContactResult = { ok: true } | { ok: false; error: string };

const MAX_NAME = 80;
const MAX_EMAIL = 254;
const MAX_MSG = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_ERROR = "No se pudo enviar el mensaje. Inténtalo de nuevo más tarde.";

function validate(name: string, email: string, msg: string): string | null {
  const problems: string[] = [];
  if (!name) problems.push("falta el nombre");
  else if (name.length > MAX_NAME) problems.push(`el nombre supera ${MAX_NAME} caracteres`);
  if (!email) problems.push("falta el correo");
  else if (email.length > MAX_EMAIL || !EMAIL_RE.test(email)) problems.push("el correo no es válido");
  if (!msg) problems.push("falta el mensaje");
  else if (msg.length > MAX_MSG) problems.push(`el mensaje supera ${MAX_MSG} caracteres`);
  return problems.length ? `Revisa los campos: ${problems.join(", ")}.` : null;
}

/** Envía el mensaje del formulario de contacto al equipo mediante Resend. */
export async function sendContactMessage(input: ContactInput): Promise<ContactResult> {
  // Los datos vienen del cliente: no se asume que respeten el tipo.
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  if (str(input?.website)) return { ok: true };

  // Sin saltos de línea en el nombre: se usa en el asunto.
  const name = str(input?.name).replace(/[\r\n]+/g, " ");
  const email = str(input?.email);
  const msg = str(input?.msg);

  const invalid = validate(name, email, msg);
  if (invalid) return { ok: false, error: invalid };

  const { RESEND_API_KEY: apiKey, CONTACT_TO_EMAIL: to, CONTACT_FROM_EMAIL: from } = process.env;
  const missing = Object.entries({ RESEND_API_KEY: apiKey, CONTACT_TO_EMAIL: to, CONTACT_FROM_EMAIL: from })
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length || !apiKey || !to || !from) {
    console.error(`[contacto] Faltan variables de entorno: ${missing.join(", ")}`);
    return { ok: false, error: GENERIC_ERROR };
  }

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to,
      replyTo: email,
      subject: `[Arcade Vault] Mensaje de contacto de ${name}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${msg}\n`,
    });
    if (error) {
      console.error("[contacto] Resend rechazó el envío:", error);
      return { ok: false, error: GENERIC_ERROR };
    }
  } catch (err) {
    console.error("[contacto] Error al llamar a Resend:", err);
    return { ok: false, error: GENERIC_ERROR };
  }

  return { ok: true };
}
