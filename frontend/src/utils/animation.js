// Plain animation-timing helpers — kept out of components/motion/Reveal.jsx
// because mixing component exports with plain function exports in the same
// file breaks Vite's fast-refresh guarantee for that file.

/**
 * Stagger helper — returns the delay to hand to the Nth item in a grid/list
 * so cards cascade in rather than popping together. Deliberately just
 * arithmetic, not its own component: a stagger is a delay schedule, not a
 * different animation, so wrapping it in a component would only add
 * indirection.
 */
export function staggerDelay(index, { step = 0.12, base = 0, max = 0.6 } = {}) {
  return base + Math.min(index * step, max)
}
