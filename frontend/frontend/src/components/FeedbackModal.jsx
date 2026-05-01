import React, { useState } from 'react';

export default function FeedbackModal({ isOpen, onClose, onSubmit, tourId, driverName, loading }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);

  if (!isOpen) return null;

  const handleRatingClick = (r) => setRating(r);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300"></div>
      
      <div className="relative bg-white rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] w-full max-w-md overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 font-['Inter',sans-serif]">
        
        {/* Header with Driver Image placeholder or icon */}
        <div className="bg-slate-50 px-8 pt-10 pb-6 text-center border-b border-slate-100">
          <div className="h-20 w-20 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">
             <i className="bi bi-person-check-fill"></i>
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">How was your trip?</h3>
          <p className="text-slate-500 text-sm mt-1">Rate your experience with <span className="font-bold text-slate-900">{driverName || 'your driver'}</span></p>
        </div>

        <div className="p-8">
          {/* Star Rating Section */}
          <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => handleRatingClick(star)}
                className="transition-all duration-200 transform hover:scale-125 active:scale-95"
              >
                <i className={`bi text-4xl ${
                  (hoveredRating || rating) >= star ? 'bi-star-fill text-amber-400' : 'bi-star text-slate-200'
                }`}></i>
              </button>
            ))}
          </div>

          {/* Comment Section */}
          <div className="space-y-2 mb-8">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Write a review (Optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us what you liked or how we can improve..."
              className="w-full h-32 px-5 py-4 rounded-3xl bg-slate-50 border border-slate-100 text-slate-700 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all resize-none placeholder:text-slate-300"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => onSubmit(rating, comment)}
              disabled={loading}
              className="w-full py-5 rounded-3xl bg-slate-900 text-white text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Submit Feedback <i className="bi bi-arrow-right"></i></>
              )}
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl text-slate-400 text-xs font-bold hover:text-slate-600 transition-all"
            >
              Skip for now
            </button>
          </div>
        </div>

        {/* Footer Accent */}
        <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500 w-full"></div>
      </div>
    </div>
  );
}
