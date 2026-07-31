import { useEffect, useRef, useState } from 'react'

// Parses "250+" -> {number: 250, decimals: 0, suffix: '+'}
// and "1.2k+" -> {number: 1.2, decimals: 1, suffix: 'k+'}.
function parseStatValue(value) {
  const match = String(value).match(/^(\d+(?:\.\d+)?)(.*)$/)
  if (!match) return { number: 0, decimals: 0, suffix: String(value) }
  const [, numeric, suffix] = match
  const decimalPart = numeric.split('.')[1]
  return {
    number: parseFloat(numeric),
    decimals: decimalPart ? decimalPart.length : 0,
    suffix,
  }
}

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

// Animated "count up to N" stat number — e.g. "0+" -> "250+" or
// "0.0k+" -> "1.2k+" — used on the stats row a traveler lands on right
// after logging in. Runs once per mount, starting after `delay` so it
// lines up with the stat card's own fade/slide-in entrance.
export default function AnimatedStat({ value, duration = 1600, delay = 0, className }) {
  const { number, decimals, suffix } = parseStatValue(value)
  const finalText = `${number.toFixed(decimals)}${suffix}`
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Skip the count-up for reduced-motion users or a literal "0" stat by
  // starting the displayed text at its final value — that way there's
  // never a synchronous setState in the effect below for those cases.
  const [display, setDisplay] = useState(
    prefersReducedMotion || number === 0
      ? finalText
      : `0${decimals ? '.' + '0'.repeat(decimals) : ''}${suffix}`
  )
  const frameRef = useRef(null)

  useEffect(() => {
    if (prefersReducedMotion || number === 0) return undefined

    let start = null
    const timeoutId = setTimeout(() => {
      const step = (timestamp) => {
        if (start === null) start = timestamp
        const progress = Math.min((timestamp - start) / duration, 1)
        const current = number * easeOutCubic(progress)
        setDisplay(`${current.toFixed(decimals)}${suffix}`)
        if (progress < 1) frameRef.current = requestAnimationFrame(step)
      }
      frameRef.current = requestAnimationFrame(step)
    }, delay)

    return () => {
      clearTimeout(timeoutId)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
    // Intentionally runs once per mount — `number`/`decimals`/`suffix` are
    // derived from `value`, which the caller doesn't change after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <span className={className}>{display}</span>
}
