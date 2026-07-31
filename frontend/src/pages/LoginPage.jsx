import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { registerDriver, registerUser } from '../services/api.js'
import appLogo from '../../images/logo.jpeg'
import CountrySelect from '../components/CountrySelect.jsx'
import {
  PASSWORD_MIN_LENGTH,
  normaliseUserRegistration,
  passwordStrength,
  validateUserRegistration,
} from '../utils/validation.js'

import heroImg from '../assets/sri-lanka-hero.png'
import kandyImg from '../assets/kandy.png'
import galleImg from '../assets/galle.png'
import colomboImg from '../assets/colombo.png'
import teaImg from '../assets/tea-plantations.png'

const SL_DISTRICTS = ['Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha','Hambantota','Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala','Mannar','Matale','Matara','Monaragala','Mullaitivu','Nuwara Eliya','Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya']
const VEHICLE_TYPES = ['Mini car','Car','Mini van','Van','SUV','Mini bus','Bus']
// Visual order of the traveler registration fields, used to focus the first
// invalid control on submit. Keep in sync with the form markup below.
const USER_REG_FIELD_ORDER = [
  { name: 'full_name', id: 'reg-full-name' },
  { name: 'email',     id: 'reg-email' },
  { name: 'phone',     id: 'reg-phone' },
  { name: 'country',   id: 'reg-country' },
  { name: 'password',  id: 'reg-password' },
]
const EMPTY_DRIVER_REG = {
  full_name:'',phone:'',email:'',nic_number:'',date_of_birth:'',gender:'',home_district:'',home_address:'',profile_photo:null,
  license_number:'',license_expiry_date:'',license_front_image:null,license_back_image:null,
  vehicle_type:'',vehicle_brand:'',vehicle_number:'',vehicle_color:'',capacity:'',
  vehicle_reg_book_image:null,revenue_license_image:null,insurance_cert_image:null,
  vehicle_front_image:null,vehicle_rear_image:null,vehicle_side_image:null,password:''
}

// ── Inject only font + input base styles (no custom utility classes) ────────
const BASE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
.lp-font { font-family: 'Plus Jakarta Sans', sans-serif; }
.lp-serif { font-family: 'Playfair Display', serif; }
.lp-input {
  width: 100%;
  background-color: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 13px 14px 13px 42px;
  font-size: 13.5px;
  color: #1c1917;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  font-family: 'Plus Jakarta Sans', sans-serif;
}
.lp-input:focus {
  border-color: #064e3b;
  background-color: #fff;
  box-shadow: 0 0 0 3px rgba(6,78,59,0.1);
}
.lp-input::placeholder { color: #94a3b8; }
.lp-input[aria-invalid="true"], .lp-input.lp-input-error {
  border-color: #f43f5e;
  background-color: #fff5f6;
}
.lp-input[aria-invalid="true"]:focus, .lp-input.lp-input-error:focus {
  border-color: #e11d48;
  box-shadow: 0 0 0 3px rgba(225,29,72,0.12);
}
.lp-field-error {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 5px 0 0;
  font-size: 11.5px;
  font-weight: 600;
  color: #e11d48;
}
.lp-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.lp-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.lp-input-select {
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 40px !important;
}
.lp-scroll::-webkit-scrollbar { width: 4px; }
.lp-scroll::-webkit-scrollbar-thumb { background: rgba(6,78,59,0.15); border-radius: 4px; }
input[type="date"]::-webkit-calendar-picker-indicator {
  cursor: pointer;
  filter: invert(28%) sepia(72%) saturate(800%) hue-rotate(120deg) brightness(80%);
  opacity: 0.6;
}
@keyframes rp-scroll-up {
  0%   { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}
@keyframes rp-scroll-down {
  0%   { transform: translateY(-50%); }
  100% { transform: translateY(0); }
}
@keyframes rp-ken-burns {
  0%   { transform: scale(1) translate(0, 0); }
  50%  { transform: scale(1.08) translate(-1%, -1%); }
  100% { transform: scale(1) translate(0, 0); }
}
@keyframes rp-fade-bg {
  0%, 100% { opacity: 0; }
  10%, 85% { opacity: 1; }
}
@keyframes rp-badge-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes lp-shimmer-btn { 0%{background-position:-200% center} 100%{background-position:200% center} }
@keyframes lp-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }

/* ── Responsive shell ──────────────────────────────────────────────────────
   The right-hand visual panel is already dropped below lg by Tailwind, so
   these rules only need to reflow the form panel itself. */
@media (max-width: 900px) {
  .lp-shell { padding: 16px !important; }
  .lp-card  { min-height: 0 !important; border-radius: 22px !important; }
  .lp-form-panel { padding: 28px 26px !important; }
  .lp-heading { font-size: 26px !important; }
}
@media (max-width: 560px) {
  .lp-shell { padding: 0 !important; }
  .lp-card {
    border-radius: 0 !important;
    min-height: 100vh !important;
    min-height: 100dvh !important;
    box-shadow: none !important;
  }
  .lp-form-panel { padding: 22px 18px 18px !important; }
  .lp-heading { font-size: 23px !important; }
  /* 16px is the threshold below which iOS Safari zooms the viewport on
     focus — anything smaller makes the form unusable on iPhone. */
  .lp-input { font-size: 16px !important; padding-top: 14px; padding-bottom: 14px; }
  .lp-grid-2, .lp-grid-3 { grid-template-columns: 1fr; }
  .lp-footer-bar { flex-direction: column; gap: 8px; text-align: center; }
}
@media (max-width: 380px) {
  .lp-form-panel { padding: 18px 14px 14px !important; }
}
/* Respect the OS "reduce motion" setting for every decorative animation. */
@media (prefers-reduced-motion: reduce) {
  .lp-card *, .lp-card {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
/* Keyboard focus must stay visible even where we style :focus ourselves. */
.lp-card button:focus-visible, .lp-input:focus-visible {
  outline: 2px solid #064e3b;
  outline-offset: 2px;
}
`
if (typeof document !== 'undefined' && !document.getElementById('lp-base-css')) {
  const s = document.createElement('style'); s.id = 'lp-base-css'; s.textContent = BASE_CSS; document.head.appendChild(s)
}

// ── Shared style tokens ──────────────────────────────────────────────────────
const S = {
  btnGreen: {
    background: 'linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '14px',
    padding: '14px 20px',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    boxShadow: '0 4px 20px rgba(6,78,59,0.3)',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
  },
  btnAmber: {
    background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 60%, #fbbf24 100%)',
    color: '#1c1917',
    border: 'none',
    borderRadius: '14px',
    padding: '14px 20px',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    boxShadow: '0 4px 20px rgba(217,119,6,0.3)',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
  },
  tabActive: {
    background: '#064e3b',
    color: '#fff',
    border: 'none',
    borderRadius: '50px',
    padding: '8px 20px',
    fontWeight: 700,
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 10px rgba(6,78,59,0.3)',
    fontFamily: 'inherit',
    transition: 'all 0.25s',
  },
  tabInactive: {
    background: 'transparent',
    color: '#94a3b8',
    border: 'none',
    borderRadius: '50px',
    padding: '8px 20px',
    fontWeight: 600,
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: 'inherit',
    transition: 'all 0.25s',
  },
  tabAmberActive: {
    background: 'linear-gradient(135deg, #d97706, #f59e0b)',
    color: '#1c1917',
    border: 'none',
    borderRadius: '50px',
    padding: '8px 20px',
    fontWeight: 700,
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 10px rgba(217,119,6,0.25)',
    fontFamily: 'inherit',
    transition: 'all 0.25s',
  },
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ImgUpload({ label, fieldName, value, onChange, required }) {
  const ref = useRef(null)
  // createObjectURL on every render leaks one blob URL per render. Derive it
  // once per file and revoke it when the file changes or the form unmounts.
  const url = useMemo(() => (value ? URL.createObjectURL(value) : null), [value])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  return (
    <div>
      <p style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <i className="bi bi-image" style={{ color: '#059669' }} />{label}{required && <span style={{ color: '#f59e0b' }}>*</span>}
      </p>
      <div
        onClick={() => ref.current?.click()}
        style={{
          height: '88px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          borderRadius: '14px', border: '2px dashed #e2e8f0', cursor: 'pointer', overflow: 'hidden',
          background: url ? 'none' : '#f8fafc', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { if (!url) { e.currentTarget.style.borderColor = '#059669'; e.currentTarget.style.background = '#f0fdf4' }}}
        onMouseLeave={e => { if (!url) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc' }}}
      >
        {url
          ? <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`${label} preview`} />
          : <><i className="bi bi-cloud-upload" aria-hidden="true" style={{ fontSize: '22px', color: '#cbd5e1' }} /><span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', fontWeight: 500 }}>Click to upload</span></>
        }
        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onChange(fieldName, e.target.files[0] || null)} />
      </div>
      {value && <p style={{ fontSize: '10px', color: '#059669', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><i className="bi bi-check-circle-fill" aria-hidden="true" />{value.name}</p>}
    </div>
  )
}

// `htmlFor` ties the visible label to its control so screen readers announce
// it; `error` renders the inline message that aria-describedby points at.
function Field({ label, icon, htmlFor, error, errorId, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
        {icon && <i className={`bi ${icon}`} aria-hidden="true" style={{ color: '#059669' }} />}{label}
      </label>
      {children}
      {error && (
        <p className="lp-field-error" id={errorId}>
          <i className="bi bi-exclamation-circle-fill" aria-hidden="true" />{error}
        </p>
      )}
    </div>
  )
}

// Mirrors the backend policy so the requirement is visible before submitting.
function PasswordMeter({ password }) {
  const score = passwordStrength(password)
  const meta = [
    { label: 'Too short', color: '#f43f5e' },
    { label: 'Weak', color: '#f59e0b' },
    { label: 'Good', color: '#10b981' },
    { label: 'Strong', color: '#059669' },
  ][score]

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '5px' }} aria-hidden="true">
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            flex: 1, height: '3px', borderRadius: '3px',
            background: password && i < score ? meta.color : '#e2e8f0',
            transition: 'background 0.25s',
          }} />
        ))}
      </div>
      <p style={{ margin: 0, fontSize: '10.5px', fontWeight: 600, color: password ? meta.color : '#94a3b8' }}>
        {password ? meta.label : `At least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number`}
      </p>
    </div>
  )
}

function SectionHeader({ num, label, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0 4px' }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(6,78,59,0.15), transparent)' }} />
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        background: 'rgba(6,78,59,0.06)', border: '1px solid rgba(6,78,59,0.12)',
        padding: '5px 14px', borderRadius: '50px',
        fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#064e3b',
        whiteSpace: 'nowrap',
      }}>
        <span style={{
          width: '18px', height: '18px', borderRadius: '50%', background: '#064e3b',
          color: '#fff', fontSize: '9px', fontWeight: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{num}</span>
        <i className={`bi ${icon}`} />
        {label}
      </div>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(6,78,59,0.15), transparent)' }} />
    </div>
  )
}

// ── Right Visual Panel ─────────────────────────────────────────────────────────
const BG_SLIDES = [
  { image: heroImg,   name: 'Sigiriya', region: 'Cultural Triangle' },
  { image: kandyImg,  name: 'Kandy',    region: 'Central Hills' },
  { image: galleImg,  name: 'Galle',    region: 'South Coast' },
  { image: colomboImg,name: 'Colombo',  region: 'Western Province' },
  { image: teaImg,    name: 'Nuwara Eliya', region: 'Hill Country' },
]

// Duplicate for seamless infinite scroll
const COL1 = [...BG_SLIDES, ...BG_SLIDES]
const COL2 = [...[...BG_SLIDES].reverse(), ...[...BG_SLIDES].reverse()]

function RightPanel({ acct, mode }) {
  const [bgIdx, setBgIdx] = useState(0)
  const [badgeKey, setBadgeKey] = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setBgIdx(i => (i + 1) % BG_SLIDES.length)
      setBadgeKey(k => k + 1)
    }, 4000)
    return () => clearInterval(t)
  }, [])

  const chips = acct === 'driver'
    ? [
        { icon: 'bi-cash-coin',      label: 'Earn More' },
        { icon: 'bi-shield-check',   label: 'Verified Platform' },
        { icon: 'bi-graph-up-arrow', label: 'Growth Tools' },
      ]
    : [
        { icon: 'bi-geo-alt-fill',   label: '250+ Spots' },
        { icon: 'bi-shield-check',   label: 'Safe & Verified' },
        { icon: 'bi-lightning-fill', label: 'Instant Book' },
      ]

  const testimonial = acct === 'driver'
    ? { quote: '"Air B&C transformed my business. Steady bookings and incredible travelers every week."', author: 'Kamal P.', loc: 'Kandy, Sri Lanka', initials: 'KP' }
    : { quote: '"Absolutely seamless. Our driver knew every hidden gem along the southern coast."', author: 'Sarah K.', loc: 'United Kingdom', initials: 'SK' }

  const panelTitle = acct === 'driver'
    ? (mode === 'register' ? 'Join Our Driver Fleet' : 'Driver Portal')
    : (mode === 'register' ? 'Start Your Journey' : 'Discover the Island')

  const panelSub = acct === 'driver'
    ? (mode === 'register' ? 'Partner with Air B&C and earn with verified bookings across Sri Lanka.' : 'Manage your trips, track earnings, and grow your business seamlessly.')
    : (mode === 'register' ? 'Create an account and book verified local drivers across every corner of Sri Lanka.' : 'Air B&C connects you with trusted local drivers for an unforgettable adventure.')

  const currentDest = BG_SLIDES[bgIdx]

  // Image height + gap for seamless looping
  const IMG_H = 170
  const IMG_GAP = 10

  return (
    <div
      className="hidden lg:flex"
      style={{
        width: '500px', flexShrink: 0, position: 'relative',
        background: '#011a12',
        flexDirection: 'column', overflow: 'hidden',
      }}
    >
      {/* ── DUAL INFINITE SCROLL COLUMNS (background) ── */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: `${IMG_GAP}px`, padding: `${IMG_GAP}px`, overflow: 'hidden', zIndex: 1 }}>
        {/* Column 1 — scrolls UP */}
        <div style={{ flex: 1, overflow: 'hidden', borderRadius: '12px' }}>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: `${IMG_GAP}px`,
            animation: `rp-scroll-up ${BG_SLIDES.length * 4.5}s linear infinite`,
            willChange: 'transform',
          }}>
            {COL1.map((slide, i) => (
              <div key={i} style={{ height: `${IMG_H}px`, borderRadius: '12px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                <img
                  src={slide.image}
                  alt=""
                  decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Column 2 — scrolls DOWN */}
        <div style={{ flex: 1, overflow: 'hidden', borderRadius: '12px', marginTop: `${-(IMG_H / 2)}px` }}>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: `${IMG_GAP}px`,
            animation: `rp-scroll-down ${BG_SLIDES.length * 5.5}s linear infinite`,
            willChange: 'transform',
          }}>
            {COL2.map((slide, i) => (
              <div key={i} style={{ height: `${IMG_H}px`, borderRadius: '12px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                <img
                  src={slide.image}
                  alt=""
                  decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Gradient overlays for readability ── */}
      {/* Dark vignette — edges */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'linear-gradient(to right, rgba(1,26,18,0.1) 0%, rgba(1,26,18,0) 20%, rgba(1,26,18,0) 80%, rgba(1,26,18,0.1) 100%)' }} />
      {/* Top gradient — strong dark for logo */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '150px', zIndex: 3, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, rgba(1,26,18,0.85) 0%, rgba(1,26,18,0.4) 50%, rgba(1,26,18,0) 100%)' }} />
      {/* Bottom gradient — strong dark for content */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%', zIndex: 3, pointerEvents: 'none',
        background: 'linear-gradient(to top, rgba(1,26,18,0.95) 0%, rgba(1,26,18,0.8) 35%, rgba(1,26,18,0.4) 65%, rgba(1,26,18,0) 100%)' }} />

      {/* ── CONTENT LAYER ── */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', padding: '30px 32px 28px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'auto' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '11px', overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
            <img src={appLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '9px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.28em' }}>Air B&C</span>
            <span style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>Sri Lanka</span>
          </div>
          {/* Live indicator */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', padding: '5px 10px', borderRadius: '50px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', animation: 'pulse 2s ease-in-out infinite', display: 'inline-block' }} />
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', fontWeight: 600 }}>Live</span>
          </div>
        </div>

        {/* Spacer to push content to bottom */}
        <div style={{ flex: 1 }} />

        {/* ── Animated Location Badge ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={badgeKey}
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.25, 0.8, 0.25, 1] }}
            style={{ marginBottom: '20px', display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: '8px 16px', borderRadius: '50px',
              width: 'fit-content',
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 8px rgba(251,191,36,0.8)', display: 'inline-block', flexShrink: 0 }} />
            <i className="bi bi-geo-alt-fill" style={{ color: '#fbbf24', fontSize: '12px' }} />
            <span style={{ color: '#fde68a', fontSize: '12px', fontWeight: 700 }}>{currentDest.name}</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 500 }}>·</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 500 }}>{currentDest.region}</span>
          </motion.div>
        </AnimatePresence>

        {/* ── Dynamic Heading + Sub ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${acct}-${mode}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }}
            style={{ marginBottom: '20px' }}
          >
            <h3 className="lp-serif" style={{ color: '#fff', fontSize: '30px', lineHeight: 1.2, margin: '0 0 8px' }}>{panelTitle}</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: 1.7, margin: 0, maxWidth: '340px' }}>{panelSub}</p>
          </motion.div>
        </AnimatePresence>

        {/* ── Stats Row ── */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
          {[
            { val: '10k+', label: 'Travelers', icon: 'bi-people-fill' },
            { val: '250+', label: 'Spots',     icon: 'bi-geo-alt-fill' },
            { val: '4.9',  label: 'Rating',    icon: 'bi-star-fill' },
          ].map((stat, i) => (
            <div key={i} style={{
              flex: 1, padding: '14px 10px', textAlign: 'center',
              borderRight: i < 2 ? '1px solid rgba(255,255,255,0.07)' : 'none',
            }}>
              <i className={`bi ${stat.icon}`} style={{ color: '#fbbf24', fontSize: '14px', display: 'block', marginBottom: '4px' }} />
              <p style={{ color: '#fff', fontSize: '15px', fontWeight: 800, margin: 0, lineHeight: 1 }}>{stat.val}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '3px 0 0' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Feature Chips ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '18px' }}>
          {chips.map((chip, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)',
              color: 'rgba(255,255,255,0.75)', padding: '6px 13px', borderRadius: '50px',
              fontSize: '11px', fontWeight: 600,
            }}>
              <i className={`bi ${chip.icon}`} style={{ color: '#fbbf24' }} />
              {chip.label}
            </span>
          ))}
        </div>

        {/* ── Testimonial ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`t-${acct}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            style={{
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '18px', padding: '18px', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '2px' }}>
                {[...Array(5)].map((_, i) => <i key={i} className="bi bi-star-fill" style={{ color: '#fbbf24', fontSize: '12px' }} />)}
              </div>
              <i className="bi bi-quote" style={{ color: 'rgba(255,255,255,0.12)', fontSize: '28px', lineHeight: 1 }} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '12.5px', fontStyle: 'italic', lineHeight: 1.65, margin: '0 0 14px' }}>{testimonial.quote}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #065f46, #d97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '11px', fontWeight: 800, flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}>{testimonial.initials}</div>
              <div>
                <p style={{ color: '#fff', fontSize: '12px', fontWeight: 700, margin: 0 }}>{testimonial.author}</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>{testimonial.loc}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function LoginPage({
  error, info, loading, loginForm, setLoginForm, onLogin, onDriverLogin,
  initialAccountType = 'user', initialMode = 'login',
  roleLock = null
}) {
  const [acct, setAcct] = useState(roleLock || initialAccountType)
  const [mode, setMode] = useState(initialMode)
  const [showPw, setShowPw] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState('')
  const [regInfo, setRegInfo] = useState('')
  const [reg, setReg] = useState({ full_name: '', email: '', password: '', phone: '', country: '' })
  const [regFieldErrors, setRegFieldErrors] = useState({})
  const [drv, setDrv] = useState(EMPTY_DRIVER_REG)
  const [btnHover, setBtnHover] = useState(false)
  const regFormRef = useRef(null)

  useEffect(() => {
    setAcct(roleLock || initialAccountType)
    setMode(initialMode)
    setRegError('')
    setRegInfo('')
    setRegFieldErrors({})
  }, [initialAccountType, initialMode, roleLock])

  const onDriverField = (f, v) => setDrv(p => ({ ...p, [f]: v }))

  // Update a traveler field and clear its error as soon as the user edits it,
  // so stale messages don't linger while they're fixing the input.
  const onRegField = useCallback((field, value) => {
    setReg(p => ({ ...p, [field]: value }))
    setRegFieldErrors(p => (p[field] ? { ...p, [field]: undefined } : p))
  }, [])

  // Re-validate one field on blur so mistakes surface before submit.
  const validateRegField = useCallback((field) => {
    const message = validateUserRegistration(reg)[field]
    setRegFieldErrors(p => ({ ...p, [field]: message }))
  }, [reg])

  const onUserReg = async e => {
    e.preventDefault()
    setRegError(''); setRegInfo('')

    const errors = validateUserRegistration(reg)
    if (Object.keys(errors).length > 0) {
      setRegFieldErrors(errors)
      // Move focus to the first problem so keyboard and screen-reader users
      // land on it instead of hunting for the red text. Resolved from the
      // known field order rather than a DOM query, because the aria-invalid
      // attributes haven't been committed yet at this point.
      const firstInvalid = USER_REG_FIELD_ORDER.find(f => errors[f.name])
      if (firstInvalid) document.getElementById(firstInvalid.id)?.focus()
      return
    }

    setRegFieldErrors({})
    setRegLoading(true)
    const payload = normaliseUserRegistration(reg)
    try {
      const d = await registerUser(payload)
      setRegInfo(d.message || 'Account created! Please sign in.')
      setMode('login')
      setLoginForm(p => ({ ...p, email: payload.email }))
    } catch (err) {
      setRegError(err.message || 'Registration failed. Please try again.')
    } finally {
      setRegLoading(false)
    }
  }

  const onDrvReg = async e => {
    e.preventDefault(); setRegError(''); setRegInfo(''); setRegLoading(true)
    try {
      const d = await registerDriver(drv)
      setRegInfo(d.message || 'Application submitted! Await approval.')
      setMode('login')
    } catch (err) { setRegError(err.message || 'Submission failed') } finally { setRegLoading(false) }
  }

  return (
    <div className="lp-font lp-shell" style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #f0fdf4 0%, #fffbeb 35%, #ecfdf5 65%, #f0f9ff 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background ambient glows */}
      <div style={{ position: 'fixed', top: '-100px', left: '-100px', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(209,250,229,0.7), transparent)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(254,243,199,0.6), transparent)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.25, 0.8, 0.25, 1] }}
        className="lp-card"
        style={{
          width: '100%', maxWidth: '1100px', position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'row', overflow: 'hidden',
          borderRadius: '28px', background: '#fff',
          boxShadow: '0 32px 80px rgba(6,78,59,0.12), 0 8px 32px rgba(0,0,0,0.06)',
          minHeight: '780px',
        }}
      >

        {/* ── LEFT: FORM PANEL ── */}
        <div className="lp-form-panel" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '36px 40px', position: 'relative', overflow: 'hidden' }}>
          {/* Subtle top glow */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '200px', background: 'radial-gradient(ellipse 80% 100% at 20% 0%, rgba(6,78,59,0.04), transparent)', pointerEvents: 'none' }} />

          {/* Logo + Security badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', position: 'relative' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(6,78,59,0.2)', border: '2px solid #d1fae5' }}>
                  <img src={appLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '13px', height: '13px', borderRadius: '50%', background: '#10b981', border: '2px solid #fff', boxShadow: '0 0 6px rgba(16,185,129,0.4)' }} />
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.22em' }}>
                  <i className="bi bi-airplane-fill" style={{ marginRight: '3px' }} />Sri Lanka
                </span>
                <span style={{ display: 'block', fontSize: '16px', fontWeight: 800, color: '#064e3b', lineHeight: 1.1 }}>Air B&C</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', border: '1.5px solid #a7f3d0', padding: '8px 14px', borderRadius: '50px' }}>
              <i className="bi bi-shield-lock-fill" style={{ color: '#059669', fontSize: '13px' }} />
              <span style={{ color: '#065f46', fontSize: '11px', fontWeight: 700 }}>Secure Login</span>
            </div>
          </motion.div>

          {/* Mode / Role Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}
          >
            {/* Sign In / Register */}
            <div style={{ display: 'flex', background: 'rgba(6,78,59,0.06)', border: '1px solid rgba(6,78,59,0.1)', borderRadius: '50px', padding: '4px', gap: '4px' }}>
              {['login', 'register'].map(m => (
                <button key={m}
                  onClick={() => { setMode(m); setRegError(''); setRegInfo('') }}
                  style={mode === m ? S.tabActive : S.tabInactive}
                >
                  <i className={`bi ${m === 'login' ? 'bi-box-arrow-in-right' : 'bi-person-plus'}`} />
                  {m === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
            </div>

            {/* Traveler / Driver (only without roleLock) */}
            {!roleLock && (
              <div style={{ display: 'flex', background: 'rgba(6,78,59,0.06)', border: '1px solid rgba(6,78,59,0.1)', borderRadius: '50px', padding: '4px', gap: '4px' }}>
                <button onClick={() => { setAcct('user'); setRegError(''); setRegInfo('') }}
                  style={acct === 'user' ? S.tabActive : S.tabInactive}>
                  <i className="bi bi-person-fill" />Traveler
                </button>
                <button onClick={() => { setAcct('driver'); setRegError(''); setRegInfo('') }}
                  style={acct === 'driver' ? S.tabAmberActive : S.tabInactive}>
                  <i className="bi bi-truck-front-fill" />Driver
                </button>
              </div>
            )}
          </motion.div>

          {/* Dynamic Heading */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode + acct}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              style={{ marginBottom: '20px' }}
            >
              <h2 className="lp-serif lp-heading" style={{ fontSize: '32px', color: '#022c22', margin: '0 0 6px' }}>
                {mode === 'login' ? (acct === 'driver' ? 'Driver Portal' : 'Welcome Back') : (acct === 'driver' ? 'Partner Registration' : 'Create Account')}
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '13.5px', margin: 0 }}>
                {mode === 'login' ? 'Sign in to manage your journeys across the island.' : 'Join Air B&C and explore Sri Lanka like never before.'}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Alerts */}
          <AnimatePresence>
            {(error || regError) && (
              <motion.div initial={{ opacity: 0, height: 0, marginBottom: 0 }} animate={{ opacity: 1, height: 'auto', marginBottom: '16px' }} exit={{ opacity: 0, height: 0, marginBottom: 0 }} style={{ overflow: 'hidden' }}>
                <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '14px', background: '#fff1f2', border: '1.5px solid #fecaca', color: '#e11d48', fontSize: '13px', fontWeight: 600 }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '10px', background: '#ffe4e6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" style={{ color: '#f43f5e' }} />
                  </div>
                  {error || regError}
                </div>
              </motion.div>
            )}
            {(info || regInfo) && (
              <motion.div initial={{ opacity: 0, height: 0, marginBottom: 0 }} animate={{ opacity: 1, height: 'auto', marginBottom: '16px' }} exit={{ opacity: 0, height: 0, marginBottom: 0 }} style={{ overflow: 'hidden' }}>
                <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '14px', background: '#f0fdf4', border: '1.5px solid #a7f3d0', color: '#065f46', fontSize: '13px', fontWeight: 600 }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '10px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="bi bi-check-circle-fill" aria-hidden="true" style={{ color: '#059669' }} />
                  </div>
                  {info || regInfo}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Scrollable Form Area ── */}
          <div className="lp-scroll" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginRight: '-4px' }}>
            <AnimatePresence mode="wait">

              {/* LOGIN FORM */}
              {mode === 'login' && (
                <motion.form key="login"
                  initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18 }}
                  transition={{ duration: 0.28 }}
                  onSubmit={acct === 'driver' ? onDriverLogin : onLogin}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <Field label="Email Address" icon="bi-envelope-fill">
                      <div style={{ position: 'relative' }}>
                        <i className="bi bi-envelope-fill" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1', fontSize: '14px' }} />
                        <input type="email" required value={loginForm.email}
                          onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))}
                          className="lp-input" placeholder="you@example.com" />
                      </div>
                    </Field>

                    <Field label="Password" icon="bi-lock-fill">
                      <div style={{ position: 'relative' }}>
                        <i className="bi bi-lock-fill" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1', fontSize: '14px' }} />
                        <input type={showPw ? 'text' : 'password'} required value={loginForm.password}
                          onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                          className="lp-input" style={{ paddingRight: '46px' }} placeholder="••••••••" />
                        <button type="button" onClick={() => setShowPw(!showPw)}
                          style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px' }}>
                          <i className={`bi ${showPw ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`} />
                        </button>
                      </div>
                    </Field>

                    <motion.button
                      type="submit" disabled={loading}
                      whileTap={{ scale: 0.98 }}
                      onHoverStart={() => setBtnHover(true)}
                      onHoverEnd={() => setBtnHover(false)}
                      style={{
                        ...S.btnGreen,
                        marginTop: '6px',
                        opacity: loading ? 0.6 : 1,
                        boxShadow: btnHover ? '0 8px 32px rgba(6,78,59,0.4)' : '0 4px 20px rgba(6,78,59,0.25)',
                        transform: btnHover ? 'translateY(-1px)' : 'none',
                      }}
                    >
                      {loading
                        ? <><i className="bi bi-hourglass-split" style={{ animation: 'spin 1s linear infinite' }} /> Authenticating…</>
                        : <><i className="bi bi-box-arrow-in-right" style={{ fontSize: '16px' }} /> Sign In to Your Account</>
                      }
                    </motion.button>

                    <p style={{ textAlign: 'center', fontSize: '12.5px', color: '#94a3b8', marginTop: '4px' }}>
                      Don't have an account?{' '}
                      <button type="button" onClick={() => setMode('register')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#064e3b', fontWeight: 700, fontSize: '12.5px', fontFamily: 'inherit' }}>
                        Register now <i className="bi bi-arrow-right" />
                      </button>
                    </p>
                  </div>
                </motion.form>
              )}

              {/* REGISTER USER */}
              {mode === 'register' && acct === 'user' && (
                <motion.form key="reg-user"
                  initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18 }}
                  transition={{ duration: 0.28 }}
                  onSubmit={onUserReg}
                  ref={regFormRef}
                  noValidate
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '16px' }}>
                    <Field label="Full Name" icon="bi-person-fill" htmlFor="reg-full-name" error={regFieldErrors.full_name} errorId="reg-full-name-error">
                      <div style={{ position: 'relative' }}>
                        <i className="bi bi-person-fill" aria-hidden="true" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1', fontSize: '14px' }} />
                        <input
                          id="reg-full-name" type="text" required autoComplete="name" autoCapitalize="words"
                          aria-invalid={!!regFieldErrors.full_name}
                          aria-describedby={regFieldErrors.full_name ? 'reg-full-name-error' : undefined}
                          value={reg.full_name}
                          onChange={e => onRegField('full_name', e.target.value)}
                          onBlur={() => validateRegField('full_name')}
                          className="lp-input" placeholder="Your Full Name" />
                      </div>
                    </Field>
                    <Field label="Email Address" icon="bi-envelope-fill" htmlFor="reg-email" error={regFieldErrors.email} errorId="reg-email-error">
                      <div style={{ position: 'relative' }}>
                        <i className="bi bi-envelope-fill" aria-hidden="true" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1', fontSize: '14px' }} />
                        <input
                          id="reg-email" type="email" required autoComplete="email"
                          autoCapitalize="off" autoCorrect="off" spellCheck="false" inputMode="email"
                          aria-invalid={!!regFieldErrors.email}
                          aria-describedby={regFieldErrors.email ? 'reg-email-error' : undefined}
                          value={reg.email}
                          onChange={e => onRegField('email', e.target.value)}
                          onBlur={() => validateRegField('email')}
                          className="lp-input" placeholder="you@example.com" />
                      </div>
                    </Field>
                    <div className="lp-grid-2">
                      <Field label="Phone" icon="bi-telephone-fill" htmlFor="reg-phone" error={regFieldErrors.phone} errorId="reg-phone-error">
                        <div style={{ position: 'relative' }}>
                          <i className="bi bi-telephone-fill" aria-hidden="true" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1', fontSize: '14px' }} />
                          <input
                            id="reg-phone" type="tel" required autoComplete="tel" inputMode="tel"
                            aria-invalid={!!regFieldErrors.phone}
                            aria-describedby={regFieldErrors.phone ? 'reg-phone-error' : undefined}
                            value={reg.phone}
                            onChange={e => onRegField('phone', e.target.value)}
                            onBlur={() => validateRegField('phone')}
                            className="lp-input" placeholder="+94 77…" />
                        </div>
                      </Field>
                      <Field label="Country" icon="bi-globe2" htmlFor="reg-country" error={regFieldErrors.country} errorId="reg-country-error">
                        <div style={{ position: 'relative' }}>
                          <i className="bi bi-globe2" aria-hidden="true" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1', fontSize: '14px', zIndex: 1 }} />
                          <CountrySelect
                            id="reg-country"
                            value={reg.country}
                            onChange={(country) => onRegField('country', country)}
                            onBlur={() => validateRegField('country')}
                            invalid={!!regFieldErrors.country}
                            describedBy={regFieldErrors.country ? 'reg-country-error' : undefined}
                            required
                          />
                        </div>
                      </Field>
                    </div>
                    <Field label="Create Password" icon="bi-lock-fill" htmlFor="reg-password" error={regFieldErrors.password} errorId="reg-password-error">
                      <div style={{ position: 'relative' }}>
                        <i className="bi bi-lock-fill" aria-hidden="true" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1', fontSize: '14px' }} />
                        <input
                          id="reg-password" type={showPw ? 'text' : 'password'} required
                          autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH}
                          aria-invalid={!!regFieldErrors.password}
                          aria-describedby={regFieldErrors.password ? 'reg-password-error' : undefined}
                          value={reg.password}
                          onChange={e => onRegField('password', e.target.value)}
                          onBlur={() => validateRegField('password')}
                          className="lp-input" style={{ paddingRight: '46px' }} placeholder="Create a strong password" />
                        <button type="button" onClick={() => setShowPw(!showPw)}
                          aria-label={showPw ? 'Hide password' : 'Show password'} aria-pressed={showPw}
                          style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px' }}>
                          <i className={`bi ${showPw ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`} aria-hidden="true" />
                        </button>
                      </div>
                      <PasswordMeter password={reg.password} />
                    </Field>
                    <motion.button type="submit" disabled={regLoading} whileTap={{ scale: 0.98 }}
                      style={{ ...S.btnGreen, marginTop: '4px', opacity: regLoading ? 0.6 : 1 }}>
                      {regLoading ? <><i className="bi bi-hourglass-split" /> Creating account…</> : <><i className="bi bi-person-check-fill" style={{ fontSize: '16px' }} /> Create Traveler Account</>}
                    </motion.button>
                    <p style={{ textAlign: 'center', fontSize: '12.5px', color: '#94a3b8' }}>
                      Already have an account?{' '}
                      <button type="button" onClick={() => setMode('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#064e3b', fontWeight: 700, fontSize: '12.5px', fontFamily: 'inherit' }}>
                        Sign in <i className="bi bi-arrow-right" />
                      </button>
                    </p>
                  </div>
                </motion.form>
              )}

              {/* REGISTER DRIVER */}
              {mode === 'register' && acct === 'driver' && (
                <motion.form key="reg-driver"
                  initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18 }}
                  transition={{ duration: 0.28 }}
                  onSubmit={onDrvReg}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '16px' }}>
                    <SectionHeader num="1" label="Personal Info" icon="bi-person-vcard-fill" />
                    <div className="lp-grid-2">
                      <input className="lp-input" style={{ paddingLeft: '14px' }} placeholder="Full Name (as NIC)*" required value={drv.full_name} onChange={e => onDriverField('full_name', e.target.value)} />
                      <input className="lp-input" style={{ paddingLeft: '14px' }} placeholder="NIC Number*" required value={drv.nic_number} onChange={e => onDriverField('nic_number', e.target.value)} />
                    </div>
                    <div className="lp-grid-2">
                      <Field label="Date of Birth" icon="bi-calendar3">
                        <input type="date" className="lp-input" style={{ paddingLeft: '14px' }} required value={drv.date_of_birth} onChange={e => onDriverField('date_of_birth', e.target.value)} />
                      </Field>
                      <Field label="Gender" icon="bi-gender-ambiguous">
                        <select className="lp-input lp-input-select" style={{ paddingLeft: '14px' }} required value={drv.gender} onChange={e => onDriverField('gender', e.target.value)}>
                          <option value="">Select Gender*</option>
                          <option>Male</option><option>Female</option><option>Other</option>
                        </select>
                      </Field>
                    </div>
                    <div className="lp-grid-2">
                      <div style={{ position: 'relative' }}>
                        <i className="bi bi-telephone-fill" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1' }} />
                        <input className="lp-input" placeholder="Phone*" required value={drv.phone} onChange={e => onDriverField('phone', e.target.value)} />
                      </div>
                      <div style={{ position: 'relative' }}>
                        <i className="bi bi-envelope-fill" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1' }} />
                        <input type="email" className="lp-input" placeholder="Email (optional)" value={drv.email} onChange={e => onDriverField('email', e.target.value)} />
                      </div>
                    </div>
                    <select className="lp-input lp-input-select" style={{ paddingLeft: '14px' }} required value={drv.home_district} onChange={e => onDriverField('home_district', e.target.value)}>
                      <option value="">Select District*</option>
                      {SL_DISTRICTS.map(d => <option key={d}>{d}</option>)}
                    </select>
                    <ImgUpload label="Profile Photo" fieldName="profile_photo" value={drv.profile_photo} onChange={onDriverField} required />

                    <SectionHeader num="2" label="Driving License" icon="bi-card-text" />
                    <div className="lp-grid-2">
                      <Field label="License Number" icon="bi-upc">
                        <input className="lp-input" style={{ paddingLeft: '14px' }} placeholder="ABC-123456*" required value={drv.license_number} onChange={e => onDriverField('license_number', e.target.value)} />
                      </Field>
                      <Field label="Expiry Date" icon="bi-calendar-x">
                        <input type="date" className="lp-input" style={{ paddingLeft: '14px' }} required value={drv.license_expiry_date} onChange={e => onDriverField('license_expiry_date', e.target.value)} />
                      </Field>
                    </div>
                    <div className="lp-grid-2">
                      <ImgUpload label="License Front" fieldName="license_front_image" value={drv.license_front_image} onChange={onDriverField} required />
                      <ImgUpload label="License Back" fieldName="license_back_image" value={drv.license_back_image} onChange={onDriverField} required />
                    </div>

                    <SectionHeader num="3" label="Vehicle Details" icon="bi-truck-front-fill" />
                    <div className="lp-grid-2">
                      <select className="lp-input lp-input-select" style={{ paddingLeft: '14px' }} required value={drv.vehicle_type} onChange={e => onDriverField('vehicle_type', e.target.value)}>
                        <option value="">Vehicle Type*</option>
                        {VEHICLE_TYPES.map(v => <option key={v}>{v}</option>)}
                      </select>
                      <input className="lp-input" style={{ paddingLeft: '14px' }} placeholder="Brand (Toyota…)*" required value={drv.vehicle_brand} onChange={e => onDriverField('vehicle_brand', e.target.value)} />
                    </div>
                    <Field label="Vehicle Number" icon="bi-hash">
                      <input className="lp-input" style={{ paddingLeft: '14px' }} placeholder="e.g. WP-AB-1234*" required value={drv.vehicle_number} onChange={e => onDriverField('vehicle_number', e.target.value)} />
                    </Field>
                    <input type="number" min="1" max="60" className="lp-input" style={{ paddingLeft: '14px' }} placeholder="Capacity*" required value={drv.capacity} onChange={e => onDriverField('capacity', e.target.value)} />
                    <div className="lp-grid-3">
                      <ImgUpload label="Reg. Book" fieldName="vehicle_reg_book_image" value={drv.vehicle_reg_book_image} onChange={onDriverField} required />
                      <ImgUpload label="Revenue Lic." fieldName="revenue_license_image" value={drv.revenue_license_image} onChange={onDriverField} required />
                      <ImgUpload label="Insurance" fieldName="insurance_cert_image" value={drv.insurance_cert_image} onChange={onDriverField} required />
                    </div>
                    <div className="lp-grid-3" style={{ marginTop: '10px' }}>
                      <ImgUpload label="Vehicle Front" fieldName="vehicle_front_image" value={drv.vehicle_front_image} onChange={onDriverField} required />
                      <ImgUpload label="Vehicle Rear" fieldName="vehicle_rear_image" value={drv.vehicle_rear_image} onChange={onDriverField} required />
                      <ImgUpload label="Vehicle Side" fieldName="vehicle_side_image" value={drv.vehicle_side_image} onChange={onDriverField} required />
                    </div>

                    <SectionHeader num="4" label="Account Security" icon="bi-shield-lock-fill" />
                    <div style={{ position: 'relative' }}>
                      <i className="bi bi-lock-fill" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1' }} />
                      <input type={showPw ? 'text' : 'password'} required value={drv.password} onChange={e => onDriverField('password', e.target.value)} className="lp-input" style={{ paddingRight: '46px' }} placeholder="Create a strong password" />
                      <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px' }}>
                        <i className={`bi ${showPw ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`} />
                      </button>
                    </div>

                    <motion.button type="submit" disabled={regLoading} whileTap={{ scale: 0.98 }}
                      style={{ ...S.btnAmber, marginTop: '4px', opacity: regLoading ? 0.6 : 1 }}>
                      {regLoading ? <><i className="bi bi-hourglass-split" /> Submitting…</> : <><i className="bi bi-send-fill" style={{ fontSize: '15px' }} /> Submit Driver Application</>}
                    </motion.button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Footer bar */}
          <div className="lp-footer-bar" style={{ paddingTop: '20px', marginTop: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <img src={appLogo} alt="" style={{ height: '18px', width: '18px', objectFit: 'cover', borderRadius: '5px' }} />
              <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                Powered by <span style={{ color: '#d97706' }}>Air B&C</span>
              </p>
            </div>
            <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Developed by <span style={{ color: '#475569' }}>IR Fusions Pvt.</span>
            </p>
          </div>
        </div>

        {/* ── RIGHT: VISUAL PANEL ── */}
        <RightPanel acct={acct} mode={mode} />
      </motion.div>
    </div>
  )
}
