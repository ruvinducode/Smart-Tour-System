import appLogo from '../../images/WhatsApp Image 2026-03-31 at 23.38.56.jpeg'

export default function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-screen__spinner">
        <img src={appLogo} alt="Air B & C Tours" className="loading-screen__logo" />
      </div>
      <p className="loading-screen__brand">Air B &amp; C Tours</p>
      <p className="loading-screen__label">Loading your journey…</p>
    </div>
  )
}
