"use client";

import { useCallback, type ComponentPropsWithoutRef } from "react";

type RevealProps = ComponentPropsWithoutRef<"section"> & { as?: "section" | "div" };

/**
 * Bloque que aparece al entrar en pantalla: renderiza `.reveal` y añade `.in`
 * la primera vez que se vuelve visible. Sin IntersectionObserver se muestra directamente.
 */
export function Reveal({ as: Tag = "section", className, ...rest }: RevealProps) {
  const ref = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add("in");
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return <Tag ref={ref} className={className ? `${className} reveal` : "reveal"} {...rest} />;
}
