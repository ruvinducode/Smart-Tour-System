import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function SEO({
  title,
  description,
  keywords,
  canonicalUrl,
  ogImage,
  ogType = 'website',
  structuredData,
}) {
  const siteName = 'Air B & C Tours';
  const fullTitle = title ? `${title} | ${siteName}` : `${siteName} | Private Tours & Smart Trip Planning`;
  const defaultDescription = 'Discover Sri Lanka with Air B & C Tours. Plan personalized trips, book trusted local drivers, explore destinations, and enjoy unforgettable travel experiences.';
  const desc = description || defaultDescription;
  const defaultKeywords = 'Sri Lanka tours, Sri Lanka travel, Private tours Sri Lanka, Tour packages Sri Lanka, Holiday Sri Lanka, Travel agency Sri Lanka, Airport transfers Sri Lanka, Tour guide Sri Lanka, Vacation Sri Lanka, Smart tour planning';
  const kw = keywords || defaultKeywords;
  
  const siteUrl = 'https://airbnctours.com';
  const url = canonicalUrl ? `${siteUrl}${canonicalUrl}` : siteUrl;
  const image = ogImage ? `${siteUrl}${ogImage}` : `${siteUrl}/images/WhatsApp Image 2026-03-31 at 23.38.56.jpeg`;

  // Default structured data for all pages
  const defaultStructuredData = {
    '@context': 'https://schema.org',
    '@type': ['TravelAgency', 'Organization', 'LocalBusiness'],
    'name': siteName,
    'url': siteUrl,
    'logo': `${siteUrl}/images/WhatsApp Image 2026-03-31 at 23.38.56.jpeg`,
    'image': image,
    'description': desc,
    'address': {
      '@type': 'PostalAddress',
      'addressCountry': 'Sri Lanka'
    },
    'priceRange': '$$',
    'contactPoint': {
      '@type': 'ContactPoint',
      'contactType': 'customer support',
      'availableLanguage': ['English', 'Sinhalese', 'Tamil']
    }
  };

  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'Home',
        'item': siteUrl
      }
    ]
  };

  const finalStructuredData = structuredData || defaultStructuredData;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta name="keywords" content={kw} />
      <meta name="author" content="Air B & C Tours" />
      <meta name="language" content="English" />

      {/* Canonical URL */}
      <link rel="canonical" href={url} />

      {/* Open Graph Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data (JSON-LD) */}
      <script type="application/ld+json">
        {JSON.stringify(finalStructuredData)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbData)}
      </script>
    </Helmet>
  );
}
