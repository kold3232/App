import { SubscriptionTier } from '../types';

export type TierInfo = {
  id: SubscriptionTier;
  name: string;
  price: string;
  priceNote: string;
  features: string[];
};

export const TIERS: TierInfo[] = [
  {
    id: 'standard',
    name: 'Standard',
    price: '£40–60',
    priceNote: 'per month',
    features: ['Business listing', 'Photo gallery', 'Category tags', 'Contact button', 'Customer reviews'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '£70',
    priceNote: 'per month',
    features: ['Everything in Standard', 'Visible "available now" indicator'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '£150',
    priceNote: 'per month',
    features: ['Everything in Premium', 'Live shared calendar', 'Instant in-app booking', 'Rescheduling'],
  },
];

export function getTierInfo(tier: SubscriptionTier): TierInfo {
  return TIERS.find((t) => t.id === tier)!;
}
