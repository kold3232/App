import { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  // Launch categories — live and bookable from day one
  { id: 'builders', name: 'Builders & Construction', icon: 'construct-outline', description: 'Renovations, extensions, general building work', status: 'live', groupId: 'home' },
  { id: 'electricians', name: 'Electricians', icon: 'flash-outline', description: 'Wiring, fuse boards, EICRs', status: 'live', groupId: 'home' },
  { id: 'plumbers', name: 'Plumbers', icon: 'water-outline', description: 'Leaks, boilers, bathroom fit-outs', status: 'live', groupId: 'home' },
  { id: 'painters', name: 'Painters', icon: 'color-palette-outline', description: 'Interior, exterior & damp-proofing', status: 'live', groupId: 'home' },
  { id: 'carpenters', name: 'Carpenters', icon: 'hammer-outline', description: 'Furniture, fitted wardrobes & handyman work', status: 'live', groupId: 'home' },
  { id: 'aircon', name: 'Air Con', icon: 'snow-outline', description: 'Install, service & repair', status: 'live', groupId: 'home' },
  { id: 'gardener', name: 'Gardener', icon: 'leaf-outline', description: 'Maintenance, patios & terraces', status: 'live', groupId: 'home' },
  { id: 'tilers', name: 'Tilers', icon: 'grid-outline', description: 'Floor, wall & bathroom tiling', status: 'live', groupId: 'home' },
  { id: 'cleaning', name: 'Cleaning', icon: 'sparkles-outline', description: 'Domestic, deep cleans & end of tenancy', status: 'live', groupId: 'home' },
  { id: 'removals', name: 'Removals', icon: 'cube-outline', description: 'House moves & deliveries', status: 'live', groupId: 'other' },
  { id: 'mechanic-detailers', name: 'Mechanic & Detailers', icon: 'car-outline', description: 'Car servicing, repairs & detailing', status: 'live', groupId: 'vehicle' },

  // Coming soon — visible but not yet bookable
  { id: 'decorators', name: 'Decorators', icon: 'color-wand-outline', description: 'Event, party & wedding decorating', status: 'coming-soon', groupId: 'events' },
  { id: 'photographers', name: 'Photographers', icon: 'camera-outline', description: 'Events, portraits & properties', status: 'coming-soon', groupId: 'events' },
  { id: 'caterers', name: 'Caterers', icon: 'restaurant-outline', description: 'Events, parties & private dining', status: 'coming-soon', groupId: 'events' },
];
