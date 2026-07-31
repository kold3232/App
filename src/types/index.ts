export type Category = {
  id: string;
  name: string;
  icon: string;
  description: string;
};

export type Company = {
  id: string;
  name: string;
  categoryIds: string[];
  tagline: string;
  description: string;
  areas: string[];
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
  area: string;
  addressDetails: string;
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
  areas: string[];
  phone: string;
  priceRange: '£' | '££' | '£££';
  services: string[];
};

export type UserMode = 'customer' | 'company';
