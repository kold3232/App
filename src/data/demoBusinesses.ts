import { Company } from '../types';
import { colorFromId } from '../utils/color';

/**
 * Investor-demo seed data.
 *
 * These businesses exist only in the app's memory — nothing is written to
 * Supabase. That is deliberate: `businesses.id` is a foreign key onto
 * `auth.users`, so seeding the database would mean creating a hundred real
 * auth accounts, they would be visible to actual TestFlight testers, and
 * unpicking them afterwards would be awkward. A flag costs nothing to switch
 * off and leaves no trace.
 *
 * Set DEMO_MODE to false before shipping a build to real customers — these
 * businesses cannot take bookings (their ids are not real listing rows, so a
 * request insert would be rejected by the foreign key).
 */
export const DEMO_MODE = true;

const PREFIXES = [
  'Rock',
  'Calpe',
  'Europa',
  'Straits',
  'Bayside',
  'Alameda',
  'Trafalgar',
  'Casemates',
  'Levante',
  'Windmill',
  'Catalan Bay',
  'Ocean Village',
  'Upper Town',
  'Governor’s',
  'Pillars',
];

type TradeConfig = {
  suffixes: string[];
  taglines: string[];
  description: string;
  services: { name: string; priceFrom: number | null }[];
};

const TRADES: Record<string, TradeConfig> = {
  builders: {
    suffixes: ['Construction', 'Builders', 'Building Co.', 'Contracts', 'Projects'],
    taglines: [
      'Extensions and renovations, done properly',
      'Small builds to full refurbishments',
      'Structural work across the Rock',
      'Trusted with your biggest jobs',
    ],
    description:
      'A Gibraltar building firm handling renovations, extensions and structural work. Fully insured, with references available on request.',
    services: [
      { name: 'Full renovation', priceFrom: 4500 },
      { name: 'Extension build', priceFrom: 9000 },
      { name: 'Structural repairs', priceFrom: 800 },
      { name: 'Site survey', priceFrom: null },
    ],
  },
  electricians: {
    suffixes: ['Electrical', 'Electrics', 'Power', 'Sparks', 'Electrical Services'],
    taglines: [
      'Certified wiring, boards and testing',
      'Rewires, faults and EICR reports',
      'Same-week callouts across Gibraltar',
      'Domestic and commercial electrics',
    ],
    description:
      'Qualified electricians covering rewires, consumer units, fault finding and EICR certification for homes and businesses in Gibraltar.',
    services: [
      { name: 'Fault finding callout', priceFrom: 65 },
      { name: 'Consumer unit replacement', priceFrom: 380 },
      { name: 'Full rewire', priceFrom: 2200 },
      { name: 'EICR certificate', priceFrom: 140 },
    ],
  },
  plumbers: {
    suffixes: ['Plumbing', 'Plumbers', 'Plumbing & Heating', 'Drainage', 'Pipeworks'],
    taglines: [
      'Leaks fixed fast, no mess left behind',
      'Boilers, bathrooms and blockages',
      'Emergency callouts, seven days',
      'Bathroom fit-outs start to finish',
    ],
    description:
      'Plumbing and heating across Gibraltar — from emergency leaks and blocked drains to full bathroom installations.',
    services: [
      { name: 'Emergency leak callout', priceFrom: 70 },
      { name: 'Boiler service', priceFrom: 95 },
      { name: 'Bathroom fit-out', priceFrom: 2600 },
      { name: 'Drain unblocking', priceFrom: 85 },
    ],
  },
  painters: {
    suffixes: ['Decorators', 'Painting', 'Paint Co.', 'Finishes', 'Decorating'],
    taglines: [
      'Clean lines, tidy sites',
      'Interior and exterior finishes',
      'Damp-proofing and repaints',
      'Bringing tired rooms back to life',
    ],
    description:
      'Painters and decorators covering interiors, exteriors and damp-proofing, with dust sheets down and everything left tidy.',
    services: [
      { name: 'Single room repaint', priceFrom: 220 },
      { name: 'Full flat repaint', priceFrom: 1100 },
      { name: 'Exterior facade', priceFrom: 1800 },
      { name: 'Damp-proof treatment', priceFrom: 400 },
    ],
  },
  carpenters: {
    suffixes: ['Carpentry', 'Joinery', 'Woodworks', 'Carpenters', 'Fitted Interiors'],
    taglines: [
      'Fitted wardrobes and bespoke furniture',
      'Made to measure, fitted properly',
      'Doors, floors and everything between',
      'Handmade joinery on the Rock',
    ],
    description:
      'Carpentry and joinery — fitted wardrobes, bespoke furniture, doors and general handyman work, measured and made to fit.',
    services: [
      { name: 'Fitted wardrobe', priceFrom: 1400 },
      { name: 'Door hanging', priceFrom: 90 },
      { name: 'Bespoke shelving', priceFrom: 320 },
      { name: 'Flooring installation', priceFrom: 700 },
    ],
  },
  aircon: {
    suffixes: ['Climate', 'Air Con', 'Cooling', 'Air Systems', 'Climate Control'],
    taglines: [
      'Installed, serviced and running cool',
      'Beat the Levanter, properly',
      'Split systems and full installs',
      'Servicing that keeps units efficient',
    ],
    description:
      'Air conditioning specialists — supply, installation, servicing and repair of split and multi-split systems across Gibraltar.',
    services: [
      { name: 'Split unit installation', priceFrom: 750 },
      { name: 'Annual service', priceFrom: 80 },
      { name: 'Regas and repair', priceFrom: 130 },
      { name: 'System quote visit', priceFrom: null },
    ],
  },
  gardener: {
    suffixes: ['Gardens', 'Landscaping', 'Garden Care', 'Green Spaces', 'Terraces'],
    taglines: [
      'Terraces, patios and planting',
      'Keeping Gibraltar green',
      'Maintenance on a schedule that suits you',
      'Small courtyards to roof terraces',
    ],
    description:
      'Garden and terrace maintenance, planting and patio work — regular visits or one-off tidy-ups, tailored to Gibraltar’s climate.',
    services: [
      { name: 'Monthly maintenance', priceFrom: 60 },
      { name: 'Terrace redesign', priceFrom: 900 },
      { name: 'Planting and irrigation', priceFrom: 250 },
      { name: 'One-off clearance', priceFrom: 120 },
    ],
  },
  tilers: {
    suffixes: ['Tiling', 'Tilers', 'Tile Studio', 'Surfaces', 'Tile Works'],
    taglines: [
      'Floors, walls and wet rooms',
      'Precision tiling, straight every time',
      'Bathrooms and kitchens finished right',
      'Natural stone and large format',
    ],
    description:
      'Tiling specialists for bathrooms, kitchens and terraces — floor, wall and wet-room work in ceramic, porcelain and natural stone.',
    services: [
      { name: 'Bathroom retile', priceFrom: 1300 },
      { name: 'Kitchen splashback', priceFrom: 280 },
      { name: 'Floor tiling per m²', priceFrom: 35 },
      { name: 'Wet room installation', priceFrom: 2100 },
    ],
  },
  removals: {
    suffixes: ['Removals', 'Movers', 'Logistics', 'Moving Co.', 'Transport'],
    taglines: [
      'House moves made simple',
      'Packed, moved, unpacked',
      'Local moves and cross-border',
      'Careful hands, fixed prices',
    ],
    description:
      'Removals and deliveries across Gibraltar and into Spain — full house moves, single items and packing services.',
    services: [
      { name: 'Studio or 1-bed move', priceFrom: 220 },
      { name: '3-bed house move', priceFrom: 650 },
      { name: 'Single item delivery', priceFrom: 45 },
      { name: 'Packing service', priceFrom: 150 },
    ],
  },
  'mechanic-detailers': {
    suffixes: ['Motors', 'Auto', 'Garage', 'Motor Works', 'Auto Care'],
    taglines: [
      'Servicing, repairs and MOT prep',
      'Diagnostics done same day',
      'Detailing that turns heads',
      'Honest quotes, no surprises',
    ],
    description:
      'Vehicle servicing, diagnostics and repairs, plus full valeting and detailing. Courtesy vehicle available on longer jobs.',
    services: [
      { name: 'Full service', priceFrom: 180 },
      { name: 'Diagnostics check', priceFrom: 55 },
      { name: 'Brake replacement', priceFrom: 220 },
      { name: 'Full detail and valet', priceFrom: 140 },
    ],
  },
};

const PRICE_RANGES: Company['priceRange'][] = ['£', '££', '££', '£££'];

// Deterministic so ratings and prices don't reshuffle on every re-render.
// FNV-1a plus a murmur3 finalizer: a plain `hash * 31 + char` loop leaves the
// low bits barely mixed, and since every id shares the `demo-<trade>-` prefix
// the small moduli below collapsed onto a handful of values — ten plumbers
// all priced ££, years landing only on 1, 9 and 17.
function seededValue(seed: string, salt: number, min: number, max: number) {
  let hash = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 2246822507);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 3266489909);
  hash ^= hash >>> 16;
  return min + (Math.abs(hash) % (max - min + 1));
}

export function buildDemoCompanies(): Company[] {
  const companies: Company[] = [];

  Object.entries(TRADES).forEach(([categoryId, trade]) => {
    for (let i = 0; i < 10; i += 1) {
      // Stride of 1 over 15 prefixes keeps all ten distinct within a trade.
      // A larger stride wraps and collides with the 5-suffix cycle, which
      // produced identical names for entries i and i+5.
      const prefix = PREFIXES[(i + categoryId.length) % PREFIXES.length];
      const suffix = trade.suffixes[i % trade.suffixes.length];
      const id = `demo-${categoryId}-${i}`;
      const ratingWhole = seededValue(id, i, 38, 50); // 3.8 – 5.0
      companies.push({
        id,
        businessId: id,
        name: `${prefix} ${suffix}`,
        categoryIds: [categoryId],
        tagline: trade.taglines[i % trade.taglines.length],
        description: trade.description,
        rating: ratingWhole / 10,
        reviewCount: seededValue(id, i + 7, 6, 184),
        priceRange: PRICE_RANGES[seededValue(id, i + 3, 0, PRICE_RANGES.length - 1)],
        phone: `+350 ${seededValue(id, i + 11, 54000000, 56999999)}`,
        yearsActive: seededValue(id, i + 5, 1, 24),
        services: trade.services,
        color: colorFromId(id),
        availableNow: seededValue(id, i + 13, 0, 2) === 0,
      });
    }
  });

  return companies;
}
