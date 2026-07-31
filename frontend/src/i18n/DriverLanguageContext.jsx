import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { DRIVER_TRANSLATIONS } from './driverTranslations.js'

const DriverLanguageContext = createContext(null)

export function DriverLanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('driverLang') || 'en' } catch { return 'en' }
  })

  useEffect(() => {
    try { localStorage.setItem('driverLang', lang) } catch { /* ignore */ }
  }, [lang])

  const t = useCallback((key, vars) => {
    const dict = DRIVER_TRANSLATIONS[lang] || DRIVER_TRANSLATIONS.en
    let str = dict[key] ?? DRIVER_TRANSLATIONS.en[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replaceAll(`{${k}}`, v)
      }
    }
    return str
  }, [lang])

  return (
    <DriverLanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </DriverLanguageContext.Provider>
  )
}

export function useDriverLang() {
  const ctx = useContext(DriverLanguageContext)
  if (!ctx) throw new Error('useDriverLang must be used within a DriverLanguageProvider')
  return ctx
}
