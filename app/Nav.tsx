"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Section = "biblioteca" | "salon" | "auth";

function sectionOf(pathname: string): Section | null {
  if (pathname === "/" || pathname.startsWith("/jugar/") || pathname.startsWith("/juego/")) return "biblioteca";
  if (pathname.startsWith("/salon")) return "salon";
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
        <Link href="/" className="logo" aria-label="Arcade Vault, ir a la biblioteca">
          <div className="logo-mark" />
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={cls("biblioteca")}>Biblioteca</Link>
          <Link href="/salon" className={cls("salon")}>Salón de la Fama</Link>
        </div>
        <div className="spacer" />
        <div className="coin-counter">
          <span className="coin" />
          <span>CRÉDITOS · 03</span>
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
        <Link href="/" className={cls("biblioteca")} onClick={close}>Biblioteca</Link>
        <Link href="/salon" className={cls("salon")} onClick={close}>Salón de la Fama</Link>
        <Link href="/auth" className={cls("auth")} onClick={close}>Iniciar Sesión</Link>
        <div style={{ flex: 1 }} />
        <div className="pixel" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}>
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
