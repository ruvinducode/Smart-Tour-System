// Shared destination content for the "Handpicked Destinations" explorer on
// HomePage.jsx — used for both the destination cards and their detail modal
// (gallery, attractions, itineraries, map, video). Kept as one module so the
// card grid, the map markers, and the details modal all read from the same
// source instead of three copies drifting apart.
//
// Images: every gallery photo was viewed and confirmed to genuinely depict
// its destination before being added here (see conversation history) —
// nothing here is a placeholder or a mismatched stock photo.
// Videos: every video ID was verified live via YouTube's oEmbed endpoint
// before being added — see YouTubeVideoCard.jsx for how it's embedded.

import heroImg from '../assets/sri-lanka-hero.png'
import colomboImg from '../assets/colombo.png'
import teaImg from '../assets/tea-plantations.png'
import kandyImg from '../assets/kandy.png'
import galleImg from '../assets/galle.png'
import anuradhapuraImg from '../assets/anuradhapura-ruwanwelisaya.png'
import cultureImg from '../assets/culture.png'

import kandyImg2 from '../../images/kandy.png'
import galleImg2 from '../../images/galle.png'
import mirissaImg from '../../images/mirissa.png'
import sigiriyaImg2 from '../../images/sigiriya.png'
import anuradhapuraImg2 from '../../images/anuradhapura.png'
import nineArchImg from '../../images/nine_arch.png'

export const DESTINATIONS = [
  {
    id: 1,
    name: 'Colombo',
    region: 'West Coast',
    lat: 6.9271,
    lng: 79.8612,
    detail: 'Contemporary city life, colonial streets.',
    tagline: 'Best as a 1-day arrival or departure stop',
    image: colomboImg,
    gallery: [colomboImg],
    description: [
      'Sri Lanka\'s commercial capital mixes colonial-era streets around Fort and Pettah with a modern skyline anchored by the Lotus Tower, the tallest structure in South Asia.',
      'It\'s an easy, walkable introduction to the island — a kilometre-long oceanfront promenade at Galle Face Green, colourful markets, and some of the country\'s best food, all close to the airport.',
    ],
    highlights: [
      'Galle Face Green oceanfront promenade at sunset',
      'Lotus Tower observation deck',
      'Gangaramaya Temple and Beira Lake',
      'Pettah Market\'s colourful old-town streets',
    ],
    itineraries: [
      { title: 'Arrival day in Colombo', duration: '1 day', description: 'A relaxed half-day city loop (Fort, Gangaramaya, Galle Face) before heading out to the rest of the island the next morning.' },
      { title: 'Colombo + Galle coastal run', duration: '3 days', description: 'One day in the city, then south along the coast to Galle Fort and the beaches beyond — a popular first-week combination.' },
    ],
    video: { id: '_97u8WQ5ICY', title: 'Colombo, Sri Lanka — Walking Tour [4K]' },
  },
  {
    id: 2,
    name: 'Kandy',
    region: 'Central Hills',
    lat: 7.2906,
    lng: 80.6337,
    detail: 'Sacred temples, highland culture.',
    tagline: 'Best as a 2–3 day hill-country add-on',
    image: kandyImg,
    gallery: [kandyImg, kandyImg2, cultureImg, teaImg],
    description: [
      'Kandy is Sri Lanka\'s cultural heart — home to the Sri Dalada Maligawa (Temple of the Sacred Tooth Relic), a UNESCO World Heritage site, and a launchpad into the misty tea country beyond it.',
      'Pair the temple and the lakeside old town with an evening cultural dance performance, then climb into the surrounding hills toward Nuwara Eliya\'s tea estates.',
    ],
    highlights: [
      'Sri Dalada Maligawa (Temple of the Sacred Tooth Relic)',
      'Traditional Kandyan dance performance',
      'Kandy Lake walk at golden hour',
      'Royal Botanical Gardens, Peradeniya',
    ],
    itineraries: [
      { title: 'Kandy heritage day', duration: '1–2 days', description: 'Temple visit, lake walk, and an evening cultural show — an easy add-on from Colombo or Sigiriya.' },
      { title: 'Kandy to Nuwara Eliya hill loop', duration: '3 days', description: 'Combine Kandy\'s temples with the scenic train ride up to Nuwara Eliya\'s tea estates — one of the island\'s most scenic rail routes.' },
    ],
    video: { id: '6mQL8KGexe4', title: 'Sri Dalada Maligawa — The Sacred Temple of the Tooth Relic, Kandy' },
  },
  {
    id: 3,
    name: 'Galle',
    region: 'South Coast',
    lat: 6.0535,
    lng: 80.22,
    detail: 'Fort walls, boutique coastal charm.',
    tagline: 'Best as a relaxed 1–2 day coastal stop',
    image: galleImg,
    gallery: [galleImg, galleImg2, mirissaImg],
    description: [
      'Galle Fort is a UNESCO World Heritage site — a 16th-century Dutch-colonial fortress town of ramparts, a working lighthouse, and narrow streets lined with boutique cafes and galleries, wrapped by the Indian Ocean.',
      'The coast continues to Mirissa\'s palm-lined beaches, a favourite for sunset swims and, in season, whale watching.',
    ],
    highlights: [
      'Galle Fort ramparts walk & lighthouse',
      'Dutch-colonial old town streets and boutique shops',
      'Sunset at Mirissa Beach',
      'Seasonal whale watching nearby (Nov–Apr)',
    ],
    itineraries: [
      { title: 'Galle Fort day trip', duration: '1 day', description: 'Ramparts, old town, lighthouse — comfortably done in a day from Colombo or as a stop en route further south.' },
      { title: 'South coast beach loop', duration: '2–3 days', description: 'Galle Fort plus Mirissa or Unawatuna beaches — a relaxed coastal finish to a longer itinerary.' },
    ],
    video: { id: '6p65SRDrWZw', title: 'Galle Fort, Sri Lanka — Essential Travel Guide' },
  },
  {
    id: 4,
    name: 'Sigiriya',
    region: 'Cultural Triangle',
    lat: 7.9574,
    lng: 80.757,
    detail: 'Legendary rock citadel.',
    tagline: 'Best as an early-morning half-day climb',
    image: heroImg,
    gallery: [heroImg, sigiriyaImg2],
    description: [
      'Sigiriya — the "Lion Rock" — is a 5th-century rock fortress rising nearly 200 metres above the jungle, with frescoes, mirror-wall inscriptions, and royal water gardens still intact at its base.',
      'Start the climb early to beat both the heat and the crowds; the surrounding Cultural Triangle also holds Anuradhapura and Polonnaruwa, both within easy reach.',
    ],
    highlights: [
      'Sigiriya rock fortress climb & summit views',
      'Ancient frescoes and the mirror wall',
      'Royal water gardens at the base',
      'Nearby village experience: bullock cart & traditional lunch',
    ],
    itineraries: [
      { title: 'Sigiriya sunrise climb', duration: 'Half day', description: 'An early start beats the heat and the crowds — done by mid-morning, leaving the afternoon free.' },
      { title: 'Cultural Triangle circuit', duration: '2–3 days', description: 'Sigiriya paired with Anuradhapura and/or Polonnaruwa — the island\'s three great ancient-capital sites in one loop.' },
    ],
    video: { id: 'hX5mgHnRtFc', title: 'Sigiriya Rock, Sri Lanka — Ultimate Guide to the Lion Rock Fortress' },
  },
  {
    id: 5,
    name: 'Anuradhapura',
    region: 'North Central',
    lat: 8.3114,
    lng: 80.4037,
    detail: 'Grand stupas, sacred ruins.',
    tagline: 'Best as a full-day sacred-city visit',
    image: anuradhapuraImg,
    gallery: [anuradhapuraImg, anuradhapuraImg2],
    description: [
      'Sri Lanka\'s first ancient capital and one of the oldest continuously inhabited sacred cities in the world, Anuradhapura\'s dagobas (stupas) — including the Ruwanwelisaya\'s vast white dome — still draw pilgrims dressed in white each day.',
      'The sacred city spreads across a wide, shaded archaeological park, best explored slowly by bicycle or tuk-tuk between temple complexes.',
    ],
    highlights: [
      'Ruwanwelisaya stupa',
      'Sri Maha Bodhi — the sacred fig tree',
      'Jetavanaramaya, once one of the tallest structures in the ancient world',
      'Cycling the sacred city\'s shaded avenues',
    ],
    itineraries: [
      { title: 'Sacred city day trip', duration: '1 day', description: 'The major stupas and the Sri Maha Bodhi, paced comfortably from morning to late afternoon.' },
      { title: 'Ancient capitals loop', duration: '2–3 days', description: 'Anuradhapura combined with Sigiriya and/or Polonnaruwa for the full Cultural Triangle story.' },
    ],
    video: { id: 'qCwRECoEOpg', title: 'Ruwanwelisaya — Discovering Sri Lanka\'s Sacred Stupa, Anuradhapura' },
  },
  {
    id: 6,
    name: 'Nuwara Eliya',
    region: 'Hill Country',
    lat: 6.9478,
    lng: 80.7957,
    detail: 'Cool-climate tea valleys.',
    tagline: 'Best as a cool 1–2 day hill-country stop',
    image: teaImg,
    gallery: [teaImg, nineArchImg],
    description: [
      'Known as "Little England" for its cool climate and colonial-era architecture, Nuwara Eliya sits at 1,800m surrounded by rolling tea estates — a complete change of pace and temperature from the coast.',
      'The hill-country train line onward toward Ella is one of the world\'s most scenic rail journeys, passing the iconic Nine Arch Bridge along the way.',
    ],
    highlights: [
      'Tea estate tour & tasting (e.g. Pedro Tea Estate)',
      'Cool-climate colonial architecture and gardens',
      'Gregory Lake',
      'Scenic hill-country train toward Ella & the Nine Arch Bridge',
    ],
    itineraries: [
      { title: 'Tea country stop', duration: '1–2 days', description: 'A tea estate tour and a walk around town and Gregory Lake — a cool break from the coast or Cultural Triangle heat.' },
      { title: 'Hill-country rail loop', duration: '3 days', description: 'Nuwara Eliya combined with Kandy and the scenic train onward to Ella — one of the island\'s most popular multi-day routes.' },
    ],
    video: { id: 'BOr9NWyyPrk', title: 'Ella & Nuwara Eliya — Waterfalls, Tea Plantations & Panoramas' },
  },
]
