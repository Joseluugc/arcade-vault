"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Créditos del invitado. Valor fijo hasta que exista la autenticación. */
const GUEST_CREDITS = 3;
const CREDITS_LABEL = `CRÉDITOS · ${String(GUEST_CREDITS).padStart(2, "0")}`;

type Section = "inicio" | "biblioteca" | "salon" | "acerca" | "auth";

const LINKS: { section: Section; href: string; label: string }[] = [
  { section: "inicio", href: "/", label: "Inicio" },
  { section: "biblioteca", href: "/biblioteca", label: "Biblioteca" },
  // Ancla a la sección Actividad de la home mientras no exista /salon.
  { section: "salon", href: "/#salon", label: "Salón de la Fama" },
  { section: "acerca", href: "/acerca", label: "Acerca de" },
];

function sectionOf(pathname: string): Section | null {
  if (pathname === "/") return "inicio";
  if (pathname.startsWith("/biblioteca") || pathname.startsWith("/jugar/")) return "biblioteca";
  if (pathname.startsWith("/acerca")) return "acerca";
  if (pathname.startsWith("/auth")) return "auth";
  return null;
}

export function Nav() {
  const pathname = usePathname();
  const active = sectionOf(pathname);
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  // Cierra el panel móvil al pulsar Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const cls = (s: Section) => (active === s ? "active" : undefined);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" aria-label="Arcade Vault, ir al inicio">
          <div className="logo-mark" />
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          {LINKS.map((l) => (
            <Link key={l.section} href={l.href} className={cls(l.section)}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="spacer" />
        <div className="coin-counter">
          <span className="coin" />
          <span>{CREDITS_LABEL}</span>
        </div>
        <Link href="/auth" className="btn auth-btn">Iniciar Sesión</Link>
        <button
          type="button"
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
          aria-expanded={open}
          aria-controls="av-mobile-panel"
        >
          ≡
        </button>
      </nav>

      <div className={"av-mobile-backdrop" + (open ? " open" : "")} onClick={close} />
      <aside id="av-mobile-panel" className={"av-mobile-panel" + (open ? " open" : "")} inert={!open}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>MENÚ</div>
        {LINKS.map((l) => (
          <Link key={l.section} href={l.href} className={cls(l.section)} onClick={close}>
            {l.label}
          </Link>
        ))}
        <Link href="/auth" className={cls("auth")} onClick={close}>Iniciar Sesión</Link>
        <div style={{ flex: 1 }} />
        <div className="pixel" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}>
          {CREDITS_LABEL}
        </div>
      </aside>
    </>
  );
}
