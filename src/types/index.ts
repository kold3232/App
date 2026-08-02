import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type Category = {
  id: string;
  name: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  description: string;
};

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
};

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'completed';

export type ServiceRequest = {
  id: string;
  companyId: string;
  companyName: string;
  categoryName: string;
  customerName: string;
  phone: string;
  address: string;
  jobDetails: string;
  preferredDate: string;
  status: RequestStatus;
  createdAt: string;
};

export type CompanyProfile = {
  name: string;
  categoryIds: string[];
  tagline: string;
  description: string;
  phone: string;
  priceRange: '£' | '££' | '£££';
  services: string[];
};

export type UserMode = 'customer' | 'company';
