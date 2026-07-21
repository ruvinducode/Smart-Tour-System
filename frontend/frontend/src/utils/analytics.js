/**
 * Google Analytics 4 (GA4) Utility
 * Lightweight implementation for SPA navigation tracking.
 */

const MEASUREMENT_ID = 'G-S6NMTSEKC7';

export const initGA = () => {
  // Only load in production to prevent skewing analytics during development
  if (import.meta.env.DEV) return;
  
  // Prevent duplicate initialization
  if (window.gtag) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = gtag;
  
  gtag('js', new Date());
  
  // Disable automatic page view tracking to avoid duplicates in our SPA
  gtag('config', MEASUREMENT_ID, {
    send_page_view: false
  });
};

export const logPageView = () => {
  if (import.meta.env.DEV || !window.gtag) return;
  
  const pagePath = window.location.pathname + window.location.search + window.location.hash;
  
  // We use setTimeout to ensure document.title has updated (via react-helmet-async)
  setTimeout(() => {
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title
    });
  }, 100);
};
