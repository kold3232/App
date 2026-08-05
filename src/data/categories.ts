import { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  // Launch categories — live and bookable from day one
  { id: 'builders', name: 'Builders & Construction', icon: 'construct-outline', description: 'Renovations, extensions, general building work', status: 'live' },
  { id: 'electricians', name: 'Electricians', icon: 'flash-outline', description: 'Wiring, fuse boards, EICRs', status: 'live' },
  { id: 'plumbers', name: 'Plumbers', icon: 'water-outline', description: 'Leaks, boilers, bathroom fit-outs', status: 'live' },
  { id: 'painters', name: 'Painters', icon: 'color-palette-outline', description: 'Interior, exterior & damp-proofing', status: 'live' },
  { id: 'carpenters', name: 'Carpenters', icon: 'hammer-outline', description: 'Furniture, fitted wardrobes & handyman work', status: 'live' },
  { id: 'aircon', name: 'Air Con', icon: 'snow-outline', description: 'Install, service & repair', status: 'live' },
  { id: 'gardener', name: 'Gardener', icon: 'leaf-outline', description: 'Maintenance, patios & terraces', status: 'live' },
  { id: 'tilers', name: 'Tilers', icon: 'grid-outline', description: 'Floor, wall & bathroom tiling', status: 'live' },
  { id: 'removals', name: 'Removals', icon: 'cube-outline', description: 'House moves & deliveries', status: 'live' },
  { id: 'mechanic-detailers', name: 'Mechanic & Detailers', icon: 'car-outline', description: 'Car servicing, repairs & detailing', status: 'live' },

  // Coming soon — visible but not yet bookable
  { id: 'decorators', name: 'Decorators', icon: 'color-wand-outline', description: 'Event, party & wedding decorating', status: 'coming-soon' },
  { id: 'photographers', name: 'Photographers', icon: 'camera-outline', description: 'Events, portraits & properties', status: 'coming-soon' },
  { id: 'caterers', name: 'Caterers', icon: 'restaurant-outline', description: 'Events, parties & private dining', status: 'coming-soon' },
];
