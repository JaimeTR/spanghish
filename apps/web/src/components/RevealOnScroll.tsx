"use client";

import { useEffect } from "react";

/**
 * Hace que los bloques de cada sección aparezcan suavemente al entrar en
 * pantalla. Solo se ocultan los que están por debajo del pliegue en el momento
 * de montar, así que no hay parpadeo; sin JS o con "reducir movimiento" todo
 * se ve desde el principio. La primera sección (el hero) nunca se anima aquí.
 */
export function RevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = Array.from(document.querySelectorAll<HTMLElement>("main > section:not(:first-child) > *, main > div:not(:first-child) > *"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.remove("reveal-pending");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    for (const el of targets) {
      el.setAttribute("data-reveal", "");
      if (el.getBoundingClientRect().top > window.innerHeight * 0.92) {
        el.classList.add("reveal-pending");
        io.observe(el);
      }
    }
    return () => {
      io.disconnect();
      for (const el of targets) {
        el.classList.remove("reveal-pending");
        el.removeAttribute("data-reveal");
      }
    };
  }, []);
  return null;
}
