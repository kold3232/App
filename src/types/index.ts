import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type CategoryStatus = 'live' | 'coming-soon';

export type Category = {
  id: string;
  name: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  description: string;
  status: CategoryStatus;
};

export type SubscriptionTier = 'standard' | 'premium' | 'pro';

export type Company = {
  id: string;
  name: string;
  categoryIds: string[];
  tagline: string;
  description: string;
  rating: number;
  reviewCount: number;
  priceRange: '£' | '££' | '£££';
  phone: string;
  yearsActive: number;
  services: string[];
  color: string;
  tier: SubscriptionTier;
  availableNow?: boolean;
};

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'completed';
export type BookingType = 'quote' | 'instant';

export type ServiceRequest = {
  id: string;
  companyId: string;
  companyName: string;
  categoryName: string;
  type: BookingType;
  customerName: string;
  phone: string;
  address: string;
  jobDetails: string;
  preferredDate: string;
  scheduledSlot: string;
  status: RequestStatus;
  createdAt: string;
  jobValue?: number;
  commission?: number;
};

export type CompanyProfile = {
  name: string;
  categoryIds: string[];
  tagline: string;
  description: string;
  phone: string;
  priceRange: '£' | '££' | '£££';
  services: string[];
  availableNow?: boolean;
};

export type UserMode = 'customer' | 'company' | 'admin';

export type NotifySignup = {
  categoryId: string;
  contact: string;
  createdAt: string;
};

export type ApplicationStatus = 'not_started' | 'pending' | 'approved' | 'rejected';

export type BusinessDocument = {
  id: string;
  label: string;
  uploaded: boolean;
  fileName?: string;
  expiryDate?: string;
};

export type BusinessApplication = {
  status: ApplicationStatus;
  businessName: string;
  contactEmail: string;
  contactPhone: string;
  categoryIds: string[];
  documents: BusinessDocument[];
  tier: SubscriptionTier | null;
  promoCode: string;
  submittedAt: string;
  rejectionReason: string;
};

export type AdminBusinessStatus = 'active' | 'suspended';

export type ComplaintFlag = {
  id: string;
  note: string;
  createdAt: string;
};

export type Review = {
  id: string;
  requestId: string;
  companyId: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type AdminBusiness = {
  id: string;
  businessName: string;
  contactEmail: string;
  contactPhone: string;
  categoryIds: string[];
  tier: SubscriptionTier;
  applicationStatus: ApplicationStatus;
  businessStatus: AdminBusinessStatus;
  documents: BusinessDocument[];
  submittedAt: string;
  rejectionReason: string;
  jobsCompleted: number;
  commissionOwed: number;
  commissionPaid: number;
  flags: ComplaintFlag[];
};
