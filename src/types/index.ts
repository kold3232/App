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

// The customer's real contact details. Held in their own table so the
// database — not the app — decides who may read them; a business only gets
// this back once the customer has accepted a quote in-app.
export type RequestContact = {
  name: string;
  phone: string;
  address: string;
};

export type ServiceRequest = {
  id: string;
  caseNumber: number;
  companyId: string;
  customerId: string;
  companyName: string;
  categoryName: string;
  type: BookingType;
  // Safe to show to anyone: "John S.", not the full name.
  customerName: string;
  // General neighbourhood — what the business sees before acceptance.
  area: string;
  // Present only when the viewer is allowed the real details: the customer
  // themselves, an admin, or a business whose quote has been accepted.
  contact?: RequestContact;
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
  quoteAcceptedAt?: string;
  // When the business has actually put this job in the diary. Distinct from
  // preferredDate (what the customer asked for) and scheduledSlot (the label
  // an instant booking was made against).
  scheduledFor?: string;
  // Set by the manager when the job is handed to a member of staff.
  assignedEmployeeId?: string;
  assignmentNotes: string;
  assignmentMapUrl: string;
  assignedAt?: string;
  // The employee's own "I've finished" flag. Internal to the business — it is
  // the manager who marks the job complete, which is what starts customer
  // confirmation and commission.
  employeeDone: boolean;
  employeeDoneAt?: string;
};

// What a customer fills in to raise a request. Separate from ServiceRequest
// because the contact details go to a different table than the rest.
export type NewServiceRequest = {
  companyId: string;
  companyName: string;
  categoryName: string;
  type: BookingType;
  area: string;
  jobDetails: string;
  preferredDate: string;
  scheduledSlot: string;
  status: RequestStatus;
  contact: RequestContact;
};

// A job the business does that has nothing to do with RockServ. Their own
// diary — we store it so it syncs across their devices, and no admin can read
// it. RockServ jobs are not duplicated in here; they come off the request
// itself, so rescheduling one can't leave a stale copy behind.
export type CalendarEntry = {
  id: string;
  businessId: string;
  title: string;
  notes: string;
  startsAt: string;
  endsAt: string;
};

// What an admin is allowed to know about a business's diary: how full it is,
// never what is in it.
export type BusySummaryRow = {
  businessId: string;
  busyHours: number;
  entryCount: number;
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

export type UserMode = 'customer' | 'company' | 'admin' | 'employee';

export type EmployeeStatus = 'invited' | 'active' | 'disabled';

export type Employee = {
  id: string;
  businessId: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string;
  inviteCode: string;
  status: EmployeeStatus;
  createdAt: string;
  acceptedAt?: string;
};

// A business asking to be allowed staff accounts. Seats are granted by hand,
// so there is no plan or price attached — an admin decides the number.
export type EmployeeAccessRequest = {
  id: string;
  businessId: string;
  businessName: string;
  businessEmail: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  seatsApproved?: number;
  adminNote: string;
  createdAt: string;
};

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
