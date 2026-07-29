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

// Returns { field: message } for every invalid field; empty object means valid.
export function validateUserRegistration({ full_name, email, phone, country, password }) {
  const errors = {}

  const name = (full_name || '').trim()
  if (!name) errors.full_name = 'Full name is required'
  else if (name.length < 2) errors.full_name = 'Please enter your full name'
  else if (name.length > 120) errors.full_name = 'Full name is too long'

  const mail = (email || '').trim()
  if (!mail) errors.email = 'Email address is required'
  else if (!EMAIL_RE.test(mail)) errors.email = 'Enter a valid email address'
  else if (mail.length > 254) errors.email = 'Email address is too long'

  const tel = (phone || '').trim()
  if (!tel) errors.phone = 'Phone number is required'
  else if (!PHONE_RE.test(tel)) errors.phone = 'Enter a valid phone number'
  else {
    const digits = digitCount(tel)
    if (digits < 7 || digits > 15) errors.phone = 'Enter a valid phone number'
  }

  const land = (country || '').trim()
  if (!land) errors.country = 'Please select your country'
  else if (!COUNTRIES.includes(land)) errors.country = 'Select a country from the list'

  const pwError = passwordPolicyError(password || '')
  if (pwError) errors.password = pwError

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
