export default function Footer({ onNavigate, onSignIn }) {
  return (
    <footer className="mx-auto max-w-7xl pb-6 pt-2">
      <div className="rounded-3xl border border-white/15 bg-slate-900/35 px-6 py-6 backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-200">
            <span className="font-semibold text-white">Smart Vehicle Tour</span> · Sri Lanka Edition
            <span className="text-slate-400"> · </span>
            <span className="text-slate-300">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <button type="button" onClick={() => onNavigate('sl-features')} className="text-slate-200 hover:text-white">
              Platform
            </button>
            <button type="button" onClick={() => onNavigate('sl-gallery')} className="text-slate-200 hover:text-white">
              Destinations
            </button>
            <button type="button" onClick={() => onNavigate('sl-testimonials')} className="text-slate-200 hover:text-white">
              Reviews
            </button>
            <button type="button" onClick={onSignIn} className="text-slate-200 hover:text-white">
              Sign in
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
