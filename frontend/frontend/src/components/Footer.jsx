import React from 'react';
import appLogo from '../../images/WhatsApp Image 2026-03-31 at 23.38.56.jpeg';

const Footer = ({ minimal = false }) => {
  const currentYear = new Date().getFullYear();

  if (minimal) {
    return (
      <footer className="bg-white border-t border-slate-100 py-6 px-8 mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img src={appLogo} alt="Logo" className="h-6 w-6 object-cover rounded-lg" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              Powered by <span className="text-orange-500">Air B&C</span>
            </p>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Developed by <span className="text-slate-900">IR Mate Pvt</span> &copy; {currentYear}
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-slate-950 text-white pt-24 pb-12 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-white/20 to-green-600"></div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px]"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-green-600/10 rounded-full blur-[100px]"></div>

      <div className="max-w-7xl mx-auto px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          {/* Brand section */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white p-1 shadow-2xl">
                <img src={appLogo} alt="Air B&C Logo" className="h-full w-full object-cover rounded-xl" />
              </div>
              <h2 className="text-3xl font-black tracking-tighter">Air<span className="text-orange-500">B&C</span></h2>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed font-medium">
              Revolutionizing Sri Lankan tourism with premium vehicle rentals and expert-guided tours. Experience the island like never before.
            </p>
            <div className="flex gap-4">
              {['facebook', 'twitter', 'instagram', 'linkedin'].map(social => (
                <a key={social} href="#" className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all">
                  <i className={`bi bi-${social} text-lg`}></i>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-orange-500">Quick Links</h4>
            <ul className="space-y-4">
              {['Home', 'Our Fleet', 'Tour Packages', 'About Sri Lanka'].map(link => (
                <li key={link}>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-bold flex items-center gap-2 group">
                    <span className="h-1 w-1 rounded-full bg-slate-700 group-hover:bg-orange-500 transition-colors"></span>
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-6">
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-orange-500">Support</h4>
            <ul className="space-y-4">
              {['Help Center', 'Safety Center', 'Terms of Service', 'Privacy Policy'].map(link => (
                <li key={link}>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm font-bold flex items-center gap-2 group">
                    <span className="h-1 w-1 rounded-full bg-slate-700 group-hover:bg-orange-500 transition-colors"></span>
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-6">
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-orange-500">Get in Touch</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-orange-500 flex-shrink-0">
                  <i className="bi bi-geo-alt-fill"></i>
                </div>
                <p className="text-slate-400 text-sm font-medium">123 Tourism Way,<br />Colombo 07, Sri Lanka</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-orange-500 flex-shrink-0">
                  <i className="bi bi-telephone-fill"></i>
                </div>
                <p className="text-slate-400 text-sm font-medium">+94 11 234 5678</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">
              Powered by <span className="text-white">Air B&C</span>
            </p>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">
              Developed by <span className="text-orange-500">IR Mate Pvt</span>
            </p>
          </div>
          <div className="text-center md:text-right">
             <p className="text-slate-500 text-xs font-bold">&copy; {currentYear} IR Mate Pvt. All rights reserved.</p>
             <p className="text-[10px] text-slate-600 mt-2 font-medium">Licensed under Sri Lanka Tourism Development Authority (SLTDA)</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
