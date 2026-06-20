import { useEffect } from 'react';

/**
 * Reveal-on-scroll. Adds the `.in` class to any `[data-reveal]` element inside
 * the container (or the document) once it scrolls into view, driving the CSS
 * fade-rise defined in editorial.css. This is the lightweight, dependency-free
 * counterpart to the Framer Motion `inViewSection` helper — use it for many
 * static elements at once (no per-element <motion.*> wrapper needed).
 *
 * @param deps  re-scan when these change (e.g. after async data renders).
 */
export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
