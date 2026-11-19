"use client";

import { useState, useTransition, type FormEvent } from "react";
import { sendContactMessage } from "./actions";

const EMPTY = { name: "", email: "", msg: "" };

/** Formulario de contacto: valida, envía el mensaje con la Server Action y muestra la terminal de éxito o el error. */
export function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [sentName, setSentName] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await sendContactMessage({ ...form, website });
        if (result.ok) setSentName(form.name.trim());
        else setError(result.error);
      } catch {
        // Fallo de red o del servidor antes de obtener respuesta.
        setError("No se pudo enviar el mensaje. Inténtalo de nuevo más tarde.");
      }
    });
  };

  const reset = () => {
    setSentName(null);
    setForm(EMPTY);
    setWebsite("");
    setError(null);
  };

  return (
    <form className={"contact-form" + (shake ? " shake" : "")} onSubmit={onSubmit}>
      {sentName === null ? (
        <>
          <div className="field">
            <label htmlFor="contact-name">NOMBRE</label>
            <input
              id="contact-name"
              disabled={pending}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="px_kai"
            />
          </div>
          <div className="field">
            <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
            <input
              id="contact-email"
              disabled={pending}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label htmlFor="contact-msg">MENSAJE</label>
            <textarea
              id="contact-msg"
              disabled={pending}
              rows={5}
              value={form.msg}
              onChange={(e) => setForm({ ...form, msg: e.target.value })}
              placeholder="Cuéntanos qué tienes en mente…"
            />
          </div>
          <div className="contact-hp" aria-hidden="true">
            <label htmlFor="contact-website">WEB</label>
            <input
              id="contact-website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <button className="btn xl press" type="submit" style={{ width: "100%" }} disabled={pending}>
            {pending ? "▶ TRANSMITIENDO…" : "▶ ENVIAR MENSAJE"}
          </button>
          {error && (
            <p className="contact-error" role="alert">
              [ERROR] {error}
            </p>
          )}
        </>
      ) : (
        <div className="terminal-success" role="status">
          <div className="term-bar">
            <span className="dot r" />
            <span className="dot y" />
            <span className="dot g" />
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {sentName.toUpperCase()}.
              <span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={reset}>
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
