import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type CategoryStatus = 'live' | 'coming-soon';

export type CategoryGroupId = 'home' | 'vehicle' | 'other' | 'events';

export type CategoryGroup = {
  id: CategoryGroupId;
  name: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  description: string;
};

export type Category = {
  id: string;
  name: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  description: string;
  status: CategoryStatus;
  groupId: CategoryGroupId;
};

export type ProposedCategory = {
  id: string;
  slug: string;
  name: string;
  proposedBy: string | null;
  proposedByName?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

export type ServiceLine = {
  name: string;
  priceFrom: number | null;
};

export type Company = {
  id: string;
  businessId: string;
  name: string;
  categoryIds: string[];
  tagline: string;
  description: string;
  rating: number;
  reviewCount: number;
  priceRange: '£' | '££' | '£££';
  phone: string;
  yearsActive: number;
  services: ServiceLine[];
  color: string;
  availableNow?: boolean;
  coverPhotoUrl?: string;
  // Admin-curated position; higher sorts first, ties fall back to rating.
  displayPriority: number;
};

export type GalleryImage = {
  id: string;
  url: string;
};

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'completed';
export type BookingType = 'quote' | 'instant';

export type ServiceRequest = {
  id: string;
  caseNumber: number;
  companyId: string;
  customerId: string;
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
  commissionPaid?: boolean;
  customerConfirmed?: boolean;
  quotedAmount?: number;
  quoteAccepted?: boolean;
};

export type CustomerProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
};

export type BusinessAccount = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export type ChatMessageSender = 'customer' | 'business';

export type ChatMessage = {
  id: string;
  requestId: string;
  sender: ChatMessageSender;
  kind: 'text' | 'quote' | 'image';
  text?: string;
  amount?: number;
  imageUri?: string;
  createdAt: string;
};

export type CompanyProfile = {
  id?: string;
  name: string;
  categoryIds: string[];
  tagline: string;
  description: string;
  phone: string;
  priceRange: '£' | '££' | '£££';
  services: ServiceLine[];
  availableNow?: boolean;
  coverPhotoUrl?: string;
};

export type UserMode = 'customer' | 'company' | 'admin';

export type NotifySignup = {
  categoryId: string;
  contact: string;
  createdAt: string;
};

export type ApplicationStatus = 'not_started' | 'pending' | 'approved' | 'rejected';

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
  applicationStatus: ApplicationStatus;
  businessStatus: AdminBusinessStatus;
  submittedAt: string;
  rejectionReason: string;
  jobsCompleted: number;
  commissionOwed: number;
  commissionPaid: number;
  flags: ComplaintFlag[];
};
