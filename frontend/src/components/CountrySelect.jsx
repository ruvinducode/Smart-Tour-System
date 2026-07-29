import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { COUNTRIES } from '../utils/countries.js'

// Searchable country dropdown. Emits a plain country-name string via
// onChange, matching exactly what the backend has always accepted for
// User.country — this is a presentation-layer change only.
//
// Implements the ARIA 1.2 combobox pattern: the text input owns the listbox
// via aria-controls and points at the active row via aria-activedescendant,
// so screen readers announce options during arrow-key navigation.
export default function CountrySelect({
  id,
  value,
  onChange,
  onBlur,
  placeholder = 'Select your country',
  required = false,
  invalid = false,
  describedBy,
  className = '',
}) {
  const reactId = useId()
  const inputId = id || `country-${reactId}`
  const listboxId = `${inputId}-listbox`

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef(null)
  const listRef = useRef(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COUNTRIES
    // Prefix matches first — typing "in" should surface India before Ukraine.
    const starts = []
    const contains = []
    for (const c of COUNTRIES) {
      const lower = c.toLowerCase()
      if (lower.startsWith(q)) starts.push(c)
      else if (lower.includes(q)) contains.push(c)
    }
    return starts.concat(contains)
  }, [query])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  useEffect(() => {
    if (!open) return undefined
    function handlePointerDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) close()
    }
    // pointerdown covers mouse, touch and pen in one listener.
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open, close])

  // Keep the highlighted row inside the scroll viewport during keyboard nav.
  useEffect(() => {
    if (!open || !listRef.current) return
    const node = listRef.current.children[highlighted]
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'nearest' })
    }
  }, [highlighted, open])

  // When re-opening on an existing selection, start the caret on that row.
  const handleOpen = () => {
    setQuery('')
    setHighlighted(Math.max(0, COUNTRIES.indexOf(value)))
    setOpen(true)
  }

  const selectCountry = (country) => {
    onChange(country)
    close()
  }

  const handleChange = (e) => {
    setQuery(e.target.value)
    setHighlighted(0)
    if (!open) setOpen(true)
  }

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault()
        handleOpen()
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlighted((h) => Math.min(h + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlighted((h) => Math.max(h - 1, 0))
        break
      case 'Home':
        e.preventDefault()
        setHighlighted(0)
        break
      case 'End':
        e.preventDefault()
        setHighlighted(Math.max(0, filtered.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (filtered[highlighted]) selectCountry(filtered[highlighted])
        break
      case 'Escape':
        e.preventDefault()
        close()
        break
      case 'Tab':
        // Tabbing away commits an unambiguous match so a typed-but-unpicked
        // entry isn't silently discarded.
        if (filtered.length === 1) onChange(filtered[0])
        close()
        break
      default:
        break
    }
  }

  const handleBlur = (e) => {
    // Ignore focus moving to the listbox inside this component.
    if (containerRef.current?.contains(e.relatedTarget)) return
    close()
    onBlur?.()
  }

  const activeId = open && filtered[highlighted] ? `${inputId}-opt-${highlighted}` : undefined

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        required={required && !value}
        className={`lp-input lp-input-select ${className}`}
        placeholder={open && value ? value : placeholder}
        value={open ? query : (value || '')}
        onFocus={handleOpen}
        // Selecting an option keeps focus in the input, so onFocus alone would
        // never fire again — without this, the list could not be reopened.
        onClick={() => { if (!open) handleOpen() }}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        autoComplete="country-name"
        autoCorrect="off"
        autoCapitalize="words"
        spellCheck="false"
      />
      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Country"
          className="lp-scroll"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            maxHeight: '220px',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            background: '#fff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '14px',
            boxShadow: '0 12px 32px rgba(15,45,36,0.12)',
            zIndex: 2000,
            margin: 0,
            padding: '6px',
            listStyle: 'none',
          }}
        >
          {filtered.length === 0 && (
            <li style={{ padding: '10px 12px', fontSize: '13px', color: '#94a3b8' }}>
              No matching country
            </li>
          )}
          {filtered.map((country, idx) => (
            <li
              key={country}
              id={`${inputId}-opt-${idx}`}
              role="option"
              aria-selected={country === value}
              onMouseDown={(e) => { e.preventDefault(); selectCountry(country) }}
              onMouseEnter={() => setHighlighted(idx)}
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                fontSize: '13.5px',
                lineHeight: 1.3,
                cursor: 'pointer',
                color: '#1c1917',
                background: idx === highlighted ? '#f0fdf4' : 'transparent',
                fontWeight: country === value ? 600 : 400,
              }}
            >
              {country}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
