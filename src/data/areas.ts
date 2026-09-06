// Rough neighbourhoods, not postcodes. This is what a business is shown
// before a quote is accepted, so it has to be specific enough to price a
// callout and vague enough not to be an address.
export const GIBRALTAR_AREAS = [
  'Town Centre',
  'Upper Town',
  'South District',
  'Rosia & Camp Bay',
  'Europa Point',
  'Sandpits & Alameda',
  'Glacis & Laguna',
  'Varyl Begg & Mid-Harbours',
  'Waterport & Westside',
  'Ocean Village & Marina Bay',
  'Queensway Quay',
  'Devil’s Tower Road',
  'Catalan Bay & Both Worlds',
  'Europort & Eurotowers',
  'Elsewhere in Gibraltar',
] as const;

export type GibraltarArea = (typeof GIBRALTAR_AREAS)[number];
