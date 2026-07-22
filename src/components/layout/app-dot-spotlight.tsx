"use client";

import { useEffect, useRef } from "react";

/**
 * Soft cursor-adjacent brightening of the page dot grid.
 * Decorative only; disabled when prefers-reduced-motion is set.
 */
export function AppDotSpotlight() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    const root = document.documentElement;
    let raf = 0;

    const onMove = (event: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        root.style.setProperty("--app-spotlight-x", `${event.clientX}px`);
        root.style.setProperty("--app-spotlight-y", `${event.clientY}px`);
        layer.classList.add("is-visible");
      });
    };

    const onLeave = () => {
      layer.classList.remove("is-visible");
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return <div ref={layerRef} aria-hidden className="app-dot-spotlight" />;
}
