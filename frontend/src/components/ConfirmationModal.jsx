import React from 'react'

export default function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmLabel = "Confirm", 
  cancelLabel = "Cancel",
  type = "warning", // warning, danger, info, success
  isLoading = false
}) {
  if (!isOpen) return null

  const typeStyles = {
    warning: {
      icon: "bi bi-exclamation-triangle-fill",
      iconBg: "bg-amber-100 text-amber-600",
      btnBg: "bg-amber-500 hover:bg-amber-600 shadow-amber-200"
    },
    danger: {
      icon: "bi bi-exclamation-circle-fill",
      iconBg: "bg-rose-100 text-rose-600",
      btnBg: "bg-rose-500 hover:bg-rose-600 shadow-rose-200"
    },
    info: {
      icon: "bi bi-info-circle-fill",
      iconBg: "bg-sky-100 text-sky-600",
      btnBg: "bg-sky-500 hover:bg-sky-600 shadow-sky-200"
    },
    success: {
      icon: "bi bi-check-circle-fill",
      iconBg: "bg-emerald-100 text-emerald-600",
      btnBg: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200"
    }
  }

  const style = typeStyles[type] || typeStyles.info

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={!isLoading ? onClose : undefined}
      ></div>
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-8">
          <div className="flex flex-col items-center text-center">
            {/* Icon */}
            <div className={`h-16 w-16 ${style.iconBg} rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-sm`}>
              <i className={style.icon}></i>
            </div>
            
            {/* Content */}
            <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {message}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 px-6 py-3 rounded-xl ${style.btnBg} text-white text-sm font-bold shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2`}
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
        
        {/* Subtle decorative bottom bar */}
        <div className={`h-1.5 w-full ${style.btnBg.split(' ')[0]}`}></div>
      </div>
    </div>
  )
}
