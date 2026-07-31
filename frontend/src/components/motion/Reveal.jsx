import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'

// Shared scroll-animation primitives for the marketing pages — built once
// here so every section reaches for the same three building blocks instead
// of hand-rolling `initial`/`whileInView`/`viewport` on every element.
//
// All three respect prefers-reduced-motion: reduced-motion users get the
// final, settled layout immediately (via `initial={false}`) rather than a
// stripped-down version of the same animation — per WCAG, motion should be
// removed, not just made smaller.
//
// Only `opacity`, `transform` (x/y/scale) and `clipPath`/`scaleX` are ever
// animated here — no `width`/`height`/`top`/`margin` — so every animation in
// this file runs on the compositor thread and never triggers layout or
// paint, which is what keeps this smooth at 60fps even on low-end phones.

const DIRECTION_OFFSETS = {
  up: { y: 36 },
  down: { y: -36 },
  left: { x: 48 },
  right: { x: -48 },
  fade: {},
  scale: { scale: 0.94 },
  rotate: { rotate: -6, scale: 0.96 },
}

const EASE = [0.25, 0.8, 0.25, 1]

/**
 * Fade/slide/scale/rotate an element in as it scrolls into the viewport —
 * and, by default, back out again as it scrolls past, so the page feels
 * equally alive scrolling up as it does scrolling down. Pass `once` to pin
 * it revealed after the first entry instead (used by ImageReveal below,
 * where a repeating effect would read as gimmicky rather than premium).
 *
 * @param {'up'|'down'|'left'|'right'|'fade'|'scale'|'rotate'} direction
 * @param {number} delay seconds
 * @param {number} amount fraction of the element that must be visible to trigger (0–1)
 * @param {boolean} once false = replay every time it re-enters the viewport (default)
 */
export function Reveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.7,
  amount = 0.2,
  once = false,
  className,
  ...rest
}) {
  const prefersReducedMotion = useReducedMotion()
  const offset = DIRECTION_OFFSETS[direction] || DIRECTION_OFFSETS.up

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
      viewport={{ once, amount }}
      transition={{ delay, duration, ease: EASE }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/**
 * Premium "curtain wipe" image reveal: a solid panel covers the image and
 * slides away on scroll-into-view while the image itself settles from a
 * slight zoom — the signature reveal on high-end travel sites, and more
 * distinctive than a plain fade for hero-weight photography.
 *
 * Defaults to `once: true`, unlike Reveal above — a curtain that wipes open
 * every time the same photo re-enters the viewport reads as a glitch, not
 * polish. Pass `once={false}` to opt into the repeat if a given photo
 * genuinely wants it.
 */
export function ImageReveal({
  src,
  alt,
  curtainColor = 'var(--reveal-curtain, #022c22)',
  delay = 0,
  duration = 1,
  amount = 0.3,
  once = true,
  // `fill`: absolutely-fills its nearest positioned ancestor (for cards
  // where a sibling already sets the box's size/position). Default is a
  // normal-flow block sized by `className` — pick one, don't pass a
  // conflicting `absolute`/`relative` via className on top of this.
  fill = false,
  className = '',
  imgClassName = '',
  // Cards commonly want a hover-zoom affordance too. Framer Motion owns the
  // `scale` transform via inline style once it animates it, so a CSS
  // `:hover` class on the same element would silently lose that fight —
  // this routes the hover state through Motion's own `whileHover` instead.
  hoverZoom = false,
  children,
}) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className={`${fill ? 'absolute inset-0' : 'relative'} overflow-hidden ${className}`}>
      <motion.img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        initial={prefersReducedMotion ? false : { scale: 1.18 }}
        whileInView={{ scale: 1 }}
        whileHover={hoverZoom ? { scale: 1.08 } : undefined}
        viewport={{ once, amount }}
        transition={{ delay, duration: duration + 0.3, ease: EASE }}
        className={`w-full h-full object-cover ${imgClassName}`}
      />
      {!prefersReducedMotion && (
        <motion.div
          aria-hidden="true"
          initial={{ scaleX: 1 }}
          whileInView={{ scaleX: 0 }}
          viewport={{ once, amount }}
          transition={{ delay, duration, ease: EASE }}
          style={{ transformOrigin: 'right', background: curtainColor }}
          className="absolute inset-0"
        />
      )}
      {children}
    </div>
  )
}

/**
 * Continuous scroll-linked drift for purely decorative background elements
 * (blurred glow blobs, ambient shapes) — not a viewport-entry animation like
 * the two above, but a value tied directly to scroll position for as long as
 * the element is near the viewport. `speed` is how far it drifts in pixels
 * across the element's scroll traversal; positive drifts down, negative up.
 */
export function ParallaxLayer({ speed = 60, className, style, children }) {
  const ref = useRef(null)
  const prefersReducedMotion = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [-speed, speed])

  return (
    <div ref={ref} className={className} style={style}>
      <motion.div style={prefersReducedMotion ? undefined : { y }}>
        {children}
      </motion.div>
    </div>
  )
}
