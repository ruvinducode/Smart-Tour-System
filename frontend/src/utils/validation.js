// Shared client-side validation for the registration forms.
//
// The password rules mirror `password_policy_error` in
// backend/app/decorators.py exactly — if that policy changes, change it here
// too so the user never gets a surprise 400 after a "valid" client-side form.

import { COUNTRIES } from './countries.js'

// Deliberately permissive: the RFC-correct pattern is unusable, and the
// backend is the real authority. This only catches obvious typos early.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Digits, with optional leading + and common separators. 7–15 digits matches
// the E.164 range, so it accepts international travelers as well as local
// 07x numbers.
const PHONE_RE = /^\+?[\d\s\-()]{7,20}$/

export const PASSWORD_MIN_LENGTH = 8

export function passwordPolicyError(password) {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return 'Password must contain at least one letter and one number'
  }
  return null
}

// Rough 0–3 strength score used only to colour the meter — not a gate.
export function passwordStrength(password) {
  if (!password) return 0
  let score = 0
  if (password.length >= PASSWORD_MIN_LENGTH) score++
  if (password.length >= 12) score++
  if (/[a-zA-Z]/.test(password) && /\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) score++
  return score
}

function digitCount(value) {
  return (value.match(/\d/g) || []).length
}

function fullNameError(full_name, { required = true } = {}) {
  const name = (full_name || '').trim()
  if (!name) return required ? 'Full name is required' : null
  if (name.length < 2) return 'Please enter your full name'
  if (name.length > 120) return 'Full name is too long'
  return null
}

function phoneError(phone, { required = true } = {}) {
  const tel = (phone || '').trim()
  if (!tel) return required ? 'Phone number is required' : null
  if (!PHONE_RE.test(tel)) return 'Enter a valid phone number'
  const digits = digitCount(tel)
  if (digits < 7 || digits > 15) return 'Enter a valid phone number'
  return null
}

// `strict` requires the value to be one of the known COUNTRIES (used at
// registration, where the value always comes from the picker). Profile edits
// skip that check — an existing account may predate the picker's list.
function countryError(country, { required = true, strict = true } = {}) {
  const land = (country || '').trim()
  if (!land) return required ? 'Please select your country' : null
  if (strict && !COUNTRIES.includes(land)) return 'Select a country from the list'
  if (land.length > 100) return 'Country name is too long'
  return null
}

// Returns { field: message } for every invalid field; empty object means valid.
export function validateUserRegistration({ full_name, email, phone, country, password }) {
  const errors = {}

  const nameErr = fullNameError(full_name)
  if (nameErr) errors.full_name = nameErr

  const mail = (email || '').trim()
  if (!mail) errors.email = 'Email address is required'
  else if (!EMAIL_RE.test(mail)) errors.email = 'Enter a valid email address'
  else if (mail.length > 254) errors.email = 'Email address is too long'

  const telErr = phoneError(phone)
  if (telErr) errors.phone = telErr

  const countryErr = countryError(country)
  if (countryErr) errors.country = countryErr

  const pwError = passwordPolicyError(password || '')
  if (pwError) errors.password = pwError

  return errors
}

// Self-service profile edits: full name required, phone/country optional
// (matches backend/app/validators.py::profile_update_error exactly).
export function validateProfileUpdate({ full_name, phone, country }) {
  const errors = {}

  const nameErr = fullNameError(full_name)
  if (nameErr) errors.full_name = nameErr

  const telErr = phoneError(phone, { required: false })
  if (telErr) errors.phone = telErr

  const countryErr = countryError(country, { required: false, strict: false })
  if (countryErr) errors.country = countryErr

  return errors
}

// Trim every string field so we never persist stray whitespace, and normalise
// the email the same way the backend does before its uniqueness check.
export function normaliseUserRegistration(reg) {
  return {
    full_name: reg.full_name.trim(),
    email: reg.email.trim().toLowerCase(),
    phone: reg.phone.trim(),
    country: reg.country.trim(),
    password: reg.password,
  }
}

export function normaliseProfileUpdate(profile) {
  return {
    full_name: (profile.full_name || '').trim(),
    phone: (profile.phone || '').trim(),
    country: (profile.country || '').trim(),
  }
}
