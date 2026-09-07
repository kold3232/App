import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { DEFAULT_CATEGORIES } from '../data/categories';
import { DEMO_MODE, buildDemoCompanies } from '../data/demoBusinesses';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { uploadBusinessMedia } from '../lib/mediaUpload';
import { colorFromId } from '../utils/color';
import {
  AdminBusiness,
  AdminBusinessStatus,
  ApplicationStatus,
  BusinessAccount,
  BusySummaryRow,
  CalendarEntry,
  Category,
  CategoryGroupId,
  Employee,
  EmployeeAccessRequest,
  EmployeeStatus,
  ChatMessage,
  ChatMessageSender,
  Company,
  CompanyProfile,
  CustomerProfile,
  GalleryImage,
  NotifySignup,
  NewServiceRequest,
  ProposedCategory,
  RequestContact,
  Review,
  ServiceRequest,
  UserMode,
} from '../types';
import { toDisplayName } from '../utils/name';

const STORAGE_KEYS = {
  mode: '@sortedforyou/mode',
  notifySignups: '@sortedforyou/notifySignups',
  categories: '@sortedforyou/categories',
  hasAcceptedLegal: '@sortedforyou/hasAcceptedLegal',
};

// Flat commission structure: 10% on jobs of £500 or less, 5% above £500.
export const COMMISSION_RATE = (jobValue: number) => (jobValue > 500 ? 0.05 : 0.1);

function mapEmployeeRow(row: any): Employee {
  return {
    id: row.id,
    businessId: row.business_id,
    userId: row.user_id ?? null,
    name: row.name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    inviteCode: row.invite_code,
    status: row.status,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at ?? undefined,
  };
}

function mapAccessRequestRow(row: any): EmployeeAccessRequest {
  return {
    id: row.id,
    businessId: row.business_id,
    businessName: row.businesses?.name ?? '',
    businessEmail: row.businesses?.email ?? '',
    note: row.note ?? '',
    status: row.status,
    seatsApproved: row.seats_approved ?? undefined,
    adminNote: row.admin_note ?? '',
    createdAt: row.created_at,
  };
}

// Six characters, no vowels and no 0/O/1/I — these get read out over the phone
// or written on a job sheet, so ambiguity costs more than entropy does.
const INVITE_ALPHABET = 'BCDFGHJKLMNPQRSTVWXYZ23456789';
function generateInviteCode() {
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += INVITE_ALPHABET.charAt(Math.floor(Math.random() * INVITE_ALPHABET.length));
  }
  return out;
}

// Deep-linking into the Maps app is deliberately a plain URL rather than an
// embedded map: react-native-maps would mean a config plugin and per-platform
// API keys, and all a fitter actually needs is "open this in Maps".
export function googleMapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, Gibraltar`)}`;
}

type AppContextValue = {
  isReady: boolean;
  hasAcceptedLegal: boolean;
  acceptLegal: () => void;
  mode: UserMode | null;
  setMode: (mode: UserMode | null) => void;
  isAdminAuthenticated: boolean;
  signInAdmin: (email: string, password: string) => Promise<{ error?: string }>;
  logoutAdmin: () => Promise<void>;
  reviews: Review[];
  addReview: (requestId: string, companyId: string, rating: number, comment: string) => Promise<void>;
  messages: ChatMessage[];
  sendMessage: (requestId: string, sender: ChatMessageSender, text: string) => Promise<void>;
  sendQuote: (requestId: string, amount: number) => Promise<void>;
  sendImageMessage: (requestId: string, sender: ChatMessageSender, imageUri: string) => Promise<void>;
  acceptQuote: (requestId: string, amount: number) => Promise<void>;
  requests: ServiceRequest[];
  addRequest: (input: NewServiceRequest) => Promise<string>;
  updateRequestStatus: (id: string, status: ServiceRequest['status']) => Promise<void>;
  completeRequest: (id: string, jobValue: number) => Promise<void>;
  confirmCompletion: (id: string) => Promise<void>;
  payCommission: () => Promise<{ error?: string }>;
  rescheduleRequest: (id: string, newSlot: string) => Promise<void>;
  myListings: CompanyProfile[];
  refreshMyListings: () => Promise<void>;
  createListing: (profile: Omit<CompanyProfile, 'id'>) => Promise<{ error?: string; id?: string }>;
  updateListing: (id: string, profile: Omit<CompanyProfile, 'id'>) => Promise<{ error?: string }>;
  deleteListing: (id: string) => Promise<{ error?: string }>;
  uploadCoverPhoto: (listingId: string, localUri: string) => Promise<{ error?: string }>;
  fetchGalleryImages: (listingId: string) => Promise<GalleryImage[]>;
  addGalleryImage: (listingId: string, localUri: string) => Promise<{ error?: string }>;
  removeGalleryImage: (imageId: string) => Promise<void>;
  businessListings: Company[];
  refreshRequests: () => Promise<void>;
  refreshMessages: (requestId: string) => Promise<void>;
  subscribeToThread: (requestId: string, onMessage: (message: ChatMessage) => void) => () => void;
  subscribeToRequest: (requestId: string, onChange: () => void) => () => void;
  customerProfile: CustomerProfile | null;
  businessAccount: BusinessAccount | null;
  authEmail: string | null;
  authLoading: boolean;
  signUpCustomer: (
    email: string,
    password: string,
    profile: Omit<CustomerProfile, 'id' | 'email'>
  ) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
  signInCustomer: (email: string, password: string) => Promise<{ error?: string }>;
  signOutCustomer: () => Promise<void>;
  saveCustomerProfile: (profile: CustomerProfile) => Promise<{ error?: string }>;
  signUpBusiness: (
    email: string,
    password: string,
    account: Omit<BusinessAccount, 'id' | 'email'>
  ) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
  signInBusiness: (email: string, password: string) => Promise<{ error?: string }>;
  signOutBusiness: () => Promise<void>;
  notifySignups: NotifySignup[];
  addNotifySignup: (categoryId: string, contact: string) => void;
  categories: Category[];
  toggleCategoryStatus: (id: string) => void;
  addCategory: (category: Category) => void;
  proposeCategory: (name: string) => Promise<{ error?: string }>;
  myProposedCategories: ProposedCategory[];
  pendingCategories: ProposedCategory[];
  approveProposedCategory: (id: string) => Promise<void>;
  rejectProposedCategory: (id: string) => Promise<void>;
  setCategoryGroup: (slug: string, groupId: CategoryGroupId) => Promise<void>;
  moveListingInCategory: (listingId: string, categoryId: string, direction: 'up' | 'down' | 'top') => Promise<void>;
  adminBusinesses: AdminBusiness[];
  refreshAdminBusinesses: () => Promise<void>;
  approveAdminApplication: (id: string) => Promise<void>;
  rejectAdminApplication: (id: string, reason: string) => Promise<void>;
  suspendBusiness: (id: string) => Promise<void>;
  reinstateBusiness: (id: string) => Promise<void>;
  addComplaintFlag: (id: string, note: string) => Promise<void>;
  markCommissionPaid: (id: string) => Promise<void>;
  // Manager side of the multi-account system.
  employees: Employee[];
  employeeSeats: number;
  refreshEmployees: () => Promise<void>;
  inviteEmployee: (input: { name: string; email: string; phone: string }) => Promise<{ error?: string; code?: string }>;
  setEmployeeStatus: (id: string, status: EmployeeStatus) => Promise<{ error?: string }>;
  removeEmployee: (id: string) => Promise<{ error?: string }>;
  requestEmployeeAccess: (note: string) => Promise<{ error?: string }>;
  myEmployeeAccessRequest: EmployeeAccessRequest | null;
  assignRequestToEmployee: (
    requestId: string,
    employeeId: string | null,
    details: { notes: string; mapUrl: string }
  ) => Promise<{ error?: string }>;
  // Employee side.
  myEmployment: Employee | null;
  signInEmployee: (email: string, password: string) => Promise<{ error?: string }>;
  signUpEmployee: (email: string, password: string) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
  redeemEmployeeInvite: (code: string) => Promise<{ error?: string }>;
  setEmployeeJobDone: (requestId: string, done: boolean) => Promise<{ error?: string }>;
  signOutEmployee: () => Promise<void>;
  // Admin side.
  employeeAccessRequests: EmployeeAccessRequest[];
  refreshEmployeeAccessRequests: () => Promise<void>;
  reviewEmployeeAccessRequest: (
    id: string,
    decision: { approve: boolean; seats?: number; note: string }
  ) => Promise<{ error?: string }>;
  // Business calendar. Only the business's own private entries live here —
  // RockServ jobs come off service_requests and are merged for display.
  calendarEntries: CalendarEntry[];
  refreshCalendar: () => Promise<void>;
  addCalendarEntry: (entry: {
    title: string;
    notes: string;
    startsAt: string;
    endsAt: string;
  }) => Promise<{ error?: string }>;
  deleteCalendarEntry: (id: string) => Promise<{ error?: string }>;
  setRequestSchedule: (requestId: string, scheduledFor: string | null) => Promise<{ error?: string }>;
  busySummary: BusySummaryRow[];
  refreshBusySummary: () => Promise<void>;
};

type ServiceLineRow = { name: string; priceFrom: number | null };

type BusinessListingRow = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  category_ids: string[] | null;
  tagline: string | null;
  description: string | null;
  price_range: string | null;
  services: ServiceLineRow[] | null;
  available_now: boolean | null;
  cover_photo_url: string | null;
  display_priority: number | null;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const isAdminAuthenticated = isAdminUser;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [businessAccount, setBusinessAccount] = useState<BusinessAccount | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeSeats, setEmployeeSeats] = useState(0);
  const [myEmployment, setMyEmployment] = useState<Employee | null>(null);
  const [myEmployeeAccessRequest, setMyEmployeeAccessRequest] = useState<EmployeeAccessRequest | null>(null);
  const [employeeAccessRequests, setEmployeeAccessRequests] = useState<EmployeeAccessRequest[]>([]);
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
  const [busySummary, setBusySummary] = useState<BusySummaryRow[]>([]);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [mode, setModeState] = useState<UserMode | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [myListings, setMyListings] = useState<CompanyProfile[]>([]);
  const [notifySignups, setNotifySignups] = useState<NotifySignup[]>([]);
  const [baseCategories, setBaseCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [proposedCategories, setProposedCategories] = useState<ProposedCategory[]>([]);
  const [adminBusinesses, setAdminBusinesses] = useState<AdminBusiness[]>([]);
  const [rawBusinessListings, setRawBusinessListings] = useState<BusinessListingRow[]>([]);
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, { groupId?: CategoryGroupId; status?: Category['status'] }>>({});

  // Built-in categories ship with the app; approved business proposals are
  // merged on top as live entries in the "Other" group. A proposal is only
  // ever additive — it can't shadow a built-in category, since the slug
  // check on insert rejects names that already exist.
  const categories = useMemo<Category[]>(() => {
    const approved = proposedCategories
      .filter((p) => p.status === 'approved')
      .filter((p) => !baseCategories.some((c) => c.id === p.slug))
      .map<Category>((p) => ({
        id: p.slug,
        name: p.name,
        icon: 'pricetag-outline',
        description: 'Added by a Gibraltar business',
        status: 'live',
        groupId: 'other',
      }));
    // Admin moves (group, live/coming-soon) are stored server-side and
    // applied last, so they win over whatever shipped in the app bundle.
    return [...baseCategories, ...approved].map((c) => {
      const override = categoryOverrides[c.id];
      if (!override) return c;
      return {
        ...c,
        groupId: override.groupId ?? c.groupId,
        status: override.status ?? c.status,
      };
    });
  }, [baseCategories, proposedCategories, categoryOverrides]);

  const myProposedCategories = useMemo(
    () => proposedCategories.filter((p) => p.proposedBy && p.proposedBy === businessAccount?.id),
    [proposedCategories, businessAccount]
  );

  const pendingCategories = useMemo(
    () => proposedCategories.filter((p) => p.status === 'pending'),
    [proposedCategories]
  );

  const businessListings = useMemo<Company[]>(() => {
    const real = rawBusinessListings.map((l) => {
        const listingReviews = reviews.filter((r) => r.companyId === l.id);
        const reviewCount = listingReviews.length;
        const rating = reviewCount > 0 ? listingReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : 0;
        return {
          id: l.id,
          businessId: l.business_id,
          name: l.name,
          categoryIds: l.category_ids ?? [],
          tagline: l.tagline ?? '',
          description: l.description ?? '',
          rating,
          reviewCount,
          priceRange: (l.price_range ?? '££') as Company['priceRange'],
          phone: l.phone ?? '',
          yearsActive: 0,
          services: l.services ?? [],
          color: colorFromId(l.business_id),
          availableNow: !!l.available_now,
          coverPhotoUrl: l.cover_photo_url ?? undefined,
          displayPriority: l.display_priority ?? 0,
        };
      });
    // Real listings first, so a genuine business always outranks demo seed
    // data in any list. See DEMO_MODE in data/demoBusinesses.
    const all = DEMO_MODE ? [...real, ...buildDemoCompanies()] : real;
    // Admin-set priority wins; everything else falls back to rating, so an
    // untouched marketplace still surfaces well-reviewed businesses first.
    return all.sort((a, b) => b.displayPriority - a.displayPriority || b.rating - a.rating);
  }, [rawBusinessListings, reviews]);

  useEffect(() => {
    (async () => {
      try {
        const [storedMode, storedSignups, storedCategories, storedHasAcceptedLegal] =
          await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.mode),
            AsyncStorage.getItem(STORAGE_KEYS.notifySignups),
            AsyncStorage.getItem(STORAGE_KEYS.categories),
            AsyncStorage.getItem(STORAGE_KEYS.hasAcceptedLegal),
          ]);
        if (storedMode) {
          const parsedMode = JSON.parse(storedMode);
          setModeState(parsedMode === 'admin' ? null : parsedMode);
        }
        if (storedSignups) setNotifySignups(JSON.parse(storedSignups));
        if (storedCategories) setBaseCategories(JSON.parse(storedCategories));
        if (storedHasAcceptedLegal) setHasAcceptedLegal(JSON.parse(storedHasAcceptedLegal));
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const fetchCustomerProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, email, phone, address')
      .eq('id', userId)
      .maybeSingle();
    setCustomerProfile(!error && data ? data : null);
  }, []);

  const fetchIsAdmin = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('admins').select('id').eq('id', userId).maybeSingle();
    const result = !error && !!data;
    setIsAdminUser(result);
    return result;
  }, []);

  const fetchBusinessAccount = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, email, phone, employee_seats')
      .eq('id', userId)
      .maybeSingle();
    if (!error && data) {
      setBusinessAccount({ id: data.id, name: data.name, email: data.email, phone: data.phone });
      setEmployeeSeats(data.employee_seats ?? 0);
    } else {
      setBusinessAccount(null);
      setEmployeeSeats(0);
    }
  }, []);

  // An employee only ever has a row where user_id is their own auth id — the
  // policy on business_employees sees to that — so this doubles as the check
  // for "is this account staff at all".
  const fetchMyEmployment = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('business_employees')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    setMyEmployment(!error && data ? mapEmployeeRow(data) : null);
  }, []);

  const refreshMyListings = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setMyListings([]);
      return;
    }
    const { data, error } = await supabase
      .from('business_listings')
      .select('id, name, phone, category_ids, tagline, description, price_range, services, available_now, cover_photo_url')
      .eq('business_id', userId)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setMyListings(
        data.map((l) => ({
          id: l.id,
          name: l.name,
          categoryIds: l.category_ids ?? [],
          tagline: l.tagline ?? '',
          description: l.description ?? '',
          phone: l.phone ?? '',
          priceRange: (l.price_range ?? '££') as CompanyProfile['priceRange'],
          services: l.services ?? [],
          availableNow: !!l.available_now,
          coverPhotoUrl: l.cover_photo_url ?? undefined,
        }))
      );
    }
  }, []);

  const refreshBusinessListings = useCallback(async () => {
    const [{ data: listingRows, error: listingError }, { data: bizRows }] = await Promise.all([
      supabase
        .from('business_listings')
        .select('id, business_id, name, phone, category_ids, tagline, description, price_range, services, available_now, cover_photo_url, display_priority'),
      supabase.from('businesses').select('id, is_approved, business_status'),
    ]);
    if (listingError || !listingRows || !bizRows) return;
    const bizById = new Map(bizRows.map((b) => [b.id, b]));
    const visible = listingRows.filter((l) => {
      const biz = bizById.get(l.business_id);
      return !!biz && biz.is_approved && biz.business_status === 'active';
    });
    setRawBusinessListings(visible);
  }, []);

  const refreshReviews = useCallback(async () => {
    const { data, error } = await supabase.from('reviews').select('*');
    if (!error && data) {
      setReviews(
        data.map((r) => ({
          id: r.id,
          requestId: r.request_id,
          companyId: r.listing_id,
          rating: r.rating,
          comment: r.comment ?? '',
          createdAt: r.created_at,
        }))
      );
    }
  }, []);

  const mapProposedRow = useCallback(
    (row: any): ProposedCategory => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      proposedBy: row.proposed_by ?? null,
      status: row.status,
      createdAt: row.created_at,
    }),
    []
  );

  // RLS decides what comes back: the public sees approved rows, a business
  // additionally sees its own, an admin sees everything. One query covers
  // all three cases rather than branching on role here.
  const refreshCategoryOverrides = useCallback(async () => {
    const { data, error } = await supabase.from('category_overrides').select('slug, group_id, status');
    if (error || !data) return;
    const next: Record<string, { groupId?: CategoryGroupId; status?: Category['status'] }> = {};
    data.forEach((row) => {
      next[row.slug] = {
        groupId: (row.group_id as CategoryGroupId) ?? undefined,
        status: (row.status as Category['status']) ?? undefined,
      };
    });
    setCategoryOverrides(next);
  }, []);

  const refreshProposedCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('proposed_categories')
      .select('id, slug, name, proposed_by, status, created_at')
      .order('created_at', { ascending: false });
    if (!error && data) setProposedCategories(data.map(mapProposedRow));
  }, [mapProposedRow]);

  const mapRequestRow = useCallback(
    (row: any, contact?: RequestContact): ServiceRequest => ({
      id: row.id,
      caseNumber: row.case_number,
      companyId: row.listing_id,
      customerId: row.customer_id,
      companyName: row.company_name,
      categoryName: row.category_name,
      type: row.type,
      customerName: row.customer_display_name || 'Customer',
      area: row.area ?? '',
      contact,
      jobDetails: row.job_details ?? '',
      preferredDate: row.preferred_date ?? '',
      scheduledSlot: row.scheduled_slot ?? '',
      status: row.status,
      createdAt: row.created_at,
      jobValue: row.job_value ?? undefined,
      commission: row.commission ?? undefined,
      commissionPaid: !!row.commission_paid,
      customerConfirmed: !!row.customer_confirmed,
      quotedAmount: row.quoted_amount ?? undefined,
      quoteAccepted: !!row.quote_accepted,
      quoteAcceptedAt: row.quote_accepted_at ?? undefined,
      scheduledFor: row.scheduled_for ?? undefined,
      assignedEmployeeId: row.assigned_employee_id ?? undefined,
      assignmentNotes: row.assignment_notes ?? '',
      assignmentMapUrl: row.assignment_map_url ?? '',
      assignedAt: row.assigned_at ?? undefined,
      employeeDone: !!row.employee_done,
      employeeDoneAt: row.employee_done_at ?? undefined,
    }),
    []
  );

  // Contact details live in their own table and are gated by RLS, so this
  // simply asks for all of them and takes whatever comes back — rows the
  // caller isn't entitled to are filtered out by the database, not here.
  // Chunked because an admin can be asking about a thousand requests at once
  // and the id list travels in the query string.
  const fetchRequestContacts = useCallback(async (requestIds: string[]) => {
    const found = new Map<string, RequestContact>();
    for (let i = 0; i < requestIds.length; i += 200) {
      const { data } = await supabase
        .from('service_request_contacts')
        .select('request_id, customer_name, phone, address')
        .in('request_id', requestIds.slice(i, i + 200));
      (data ?? []).forEach((row: any) =>
        found.set(row.request_id, { name: row.customer_name, phone: row.phone, address: row.address })
      );
    }
    return found;
  }, []);

  // Customer/business rows are already bounded by RLS to just their own
  // requests; the 1000-row cap is really a stopgap for admins, who get every
  // request in the table back (see "Admins can view all requests"). It's not
  // a substitute for real pagination/search once admin case volume outgrows
  // this — just a floor against an unbounded fetch until that's built.
  const refreshRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from('service_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error || !data) return;
    const contacts = await fetchRequestContacts(data.map((row: any) => row.id));
    setRequests(data.map((row: any) => mapRequestRow(row, contacts.get(row.id))));
  }, [mapRequestRow, fetchRequestContacts]);

  const mapMessageRow = useCallback(
    (row: any): ChatMessage => ({
      id: row.id,
      requestId: row.request_id,
      sender: row.sender,
      kind: row.kind,
      text: row.text ?? undefined,
      amount: row.amount ?? undefined,
      imageUri: row.image_uri ?? undefined,
      createdAt: row.created_at,
    }),
    []
  );

  // Scoped to one job's thread rather than the account's entire message
  // history — a chat only ever needs to show its own conversation, and
  // fetching everything the account can see would grow unbounded as job
  // history piles up (this used to re-run on every single chat open).
  const refreshMessages = useCallback(async (requestId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });
    if (!error && data) setMessages(data.map(mapMessageRow));
  }, [mapMessageRow]);

  // A single Supabase auth session backs both roles — one account can be a
  // customer, a business, or both, so both profiles are fetched together.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return;
    }
    let isMounted = true;
    const syncSession = async (session: { user: { id: string; email?: string } } | null) => {
      if (session) {
        setAuthEmail(session.user.email ?? null);
        await Promise.all([
          fetchCustomerProfile(session.user.id),
          fetchBusinessAccount(session.user.id),
          fetchIsAdmin(session.user.id),
          fetchMyEmployment(session.user.id),
        ]);
      } else {
        setAuthEmail(null);
        setCustomerProfile(null);
        setBusinessAccount(null);
        setIsAdminUser(false);
        setMyEmployment(null);
        setEmployees([]);
        setEmployeeSeats(0);
        setRequests([]);
        setMessages([]);
      }
    };
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        await syncSession(data.session);
      })
      .catch((err) => {
        console.error('Failed to restore auth session', err);
      })
      .finally(() => {
        if (isMounted) setAuthLoading(false);
      });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session);
    });
    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [fetchCustomerProfile, fetchBusinessAccount, fetchIsAdmin, fetchMyEmployment]);

  // Business listings, reviews and approved categories are public — anyone can
  // browse them regardless of login state.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    refreshBusinessListings();
    refreshReviews();
    refreshProposedCategories();
    refreshCategoryOverrides();
  }, [refreshBusinessListings, refreshReviews, refreshProposedCategories, refreshCategoryOverrides]);

  // A business's own pending proposals only become visible to it once it is
  // signed in, and an admin only sees the full queue after signing in — so
  // re-fetch when either identity resolves.
  useEffect(() => {
    if (!isSupabaseConfigured || authLoading) return;
    if (businessAccount || isAdminUser) refreshProposedCategories();
  }, [businessAccount, isAdminUser, authLoading, refreshProposedCategories]);

  // Live updates: a saved/edited listing, or a newly-approved business, shows up
  // for browsing customers immediately without needing to reopen the app.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('public-listings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_listings' }, () => {
        refreshBusinessListings();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, () => {
        refreshBusinessListings();
      })
      // An admin approving a proposed category publishes it to every device
      // straight away, which is the point of storing them server-side.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposed_categories' }, () => {
        refreshProposedCategories();
      })
      // Admin reordering a listing or moving a category lands on browsing
      // customers without them reopening the app.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'category_overrides' }, () => {
        refreshCategoryOverrides();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshBusinessListings, refreshProposedCategories, refreshCategoryOverrides]);

  // Requests are only visible to their two participants, plus admins
  // (enforced by RLS) — fetch them once we know who's logged in. Admins get
  // every request back, not just their own, which is what powers the admin
  // case/chat viewer. Chat messages are fetched separately, per-thread, only
  // when a specific chat is opened (see refreshMessages).
  useEffect(() => {
    if (!isSupabaseConfigured || authLoading) return;
    if (customerProfile || businessAccount || isAdminUser) {
      refreshRequests();
    }
  }, [customerProfile, businessAccount, isAdminUser, authLoading, refreshRequests]);

  useEffect(() => {
    if (!isSupabaseConfigured || authLoading) return;
    if (businessAccount) refreshMyListings();
    else setMyListings([]);
  }, [businessAccount, authLoading, refreshMyListings]);

  const acceptLegal = useCallback(() => {
    setHasAcceptedLegal(true);
    AsyncStorage.setItem(STORAGE_KEYS.hasAcceptedLegal, JSON.stringify(true));
  }, []);

  const setMode = useCallback((next: UserMode | null) => {
    setModeState(next);
    // Admin is deliberately not persisted — closing the app while in admin
    // mode should land back on the mode-select screen next time, not
    // straight into (or in front of) the admin dashboard.
    if (next === 'admin') return;
    AsyncStorage.setItem(STORAGE_KEYS.mode, JSON.stringify(next));
  }, []);

  const signInAdmin = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    const userId = data.session?.user.id;
    if (!userId) return { error: 'Sign in failed.' };
    const admin = await fetchIsAdmin(userId);
    if (!admin) return { error: 'This account is not authorized as an admin.' };
    return {};
  }, [fetchIsAdmin]);

  const logoutAdmin = useCallback(async () => {
    await supabase.auth.signOut();
    setModeState(null);
    AsyncStorage.setItem(STORAGE_KEYS.mode, JSON.stringify(null));
  }, []);

  const addRequest = useCallback(
    async (input: NewServiceRequest) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const customerId = sessionData.session?.user.id;
      if (!customerId) return '';
      const { data, error } = await supabase
        .from('service_requests')
        .insert({
          listing_id: input.companyId,
          customer_id: customerId,
          company_name: input.companyName,
          category_name: input.categoryName,
          type: input.type,
          customer_display_name: toDisplayName(input.contact.name),
          area: input.area,
          job_details: input.jobDetails,
          preferred_date: input.preferredDate,
          scheduled_slot: input.scheduledSlot,
          status: input.status,
        })
        .select()
        .single();
      if (error || !data) return '';

      // Second write, deliberately: these are the fields the business must not
      // see yet, and they only exist in a table it cannot read from until the
      // customer accepts. If this insert fails the request is still real — the
      // customer can be reached through the in-app chat either way.
      await supabase.from('service_request_contacts').insert({
        request_id: data.id,
        customer_name: input.contact.name,
        phone: input.contact.phone,
        address: input.contact.address,
      });

      setRequests((prev) => [mapRequestRow(data, input.contact), ...prev]);
      return data.id as string;
    },
    [mapRequestRow]
  );

  const updateRequestStatus = useCallback(async (id: string, status: ServiceRequest['status']) => {
    const { error } = await supabase.from('service_requests').update({ status }).eq('id', id);
    if (!error) setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }, []);

  const completeRequest = useCallback(async (id: string, jobValue: number) => {
    const commission = Math.round(jobValue * COMMISSION_RATE(jobValue) * 100) / 100;
    const { error } = await supabase
      .from('service_requests')
      .update({ status: 'completed', job_value: jobValue, commission, customer_confirmed: false })
      .eq('id', id);
    if (!error) {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: 'completed' as const, jobValue, commission, customerConfirmed: false } : r
        )
      );
    }
  }, []);

  const confirmCompletion = useCallback(async (id: string) => {
    const { error } = await supabase.from('service_requests').update({ customer_confirmed: true }).eq('id', id);
    if (!error) setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, customerConfirmed: true } : r)));
  }, []);

  // Opens a Stripe Checkout page for the business's currently-owed commission.
  // The edge function snapshots which jobs the payment covers; the webhook
  // (not this call) is what actually marks them paid once Stripe confirms it.
  const payCommission = useCallback(async (): Promise<{ error?: string }> => {
    const { data, error } = await supabase.functions.invoke<{ url: string }>('create-commission-checkout');
    if (error) {
      let message = 'Could not start checkout.';
      const context = (error as { context?: Response }).context;
      if (context) {
        try {
          const body = await context.json();
          if (body?.error) message = body.error;
        } catch {
          // context wasn't JSON — fall back to the generic message
        }
      }
      return { error: message };
    }
    if (!data?.url) return { error: 'Could not start checkout.' };
    await Linking.openURL(data.url);
    return {};
  }, []);

  const rescheduleRequest = useCallback(async (id: string, newSlot: string) => {
    const { error } = await supabase.from('service_requests').update({ scheduled_slot: newSlot }).eq('id', id);
    if (!error) setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, scheduledSlot: newSlot } : r)));
  }, []);

  const addReview = useCallback(async (requestId: string, companyId: string, rating: number, comment: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const customerId = sessionData.session?.user.id;
    if (!customerId) return;
    const { data, error } = await supabase
      .from('reviews')
      .insert({ request_id: requestId, listing_id: companyId, customer_id: customerId, rating, comment })
      .select()
      .single();
    if (!error && data) {
      setReviews((prev) => [
        ...prev,
        { id: data.id, requestId: data.request_id, companyId: data.listing_id, rating: data.rating, comment: data.comment ?? '', createdAt: data.created_at },
      ]);
    }
  }, []);

  const sendMessage = useCallback(
    async (requestId: string, sender: ChatMessageSender, text: string) => {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({ request_id: requestId, sender, kind: 'text', text })
        .select()
        .single();
      if (!error && data) setMessages((prev) => [...prev, mapMessageRow(data)]);
    },
    [mapMessageRow]
  );

  const sendQuote = useCallback(
    async (requestId: string, amount: number) => {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({ request_id: requestId, sender: 'business', kind: 'quote', amount })
        .select()
        .single();
      if (!error && data) setMessages((prev) => [...prev, mapMessageRow(data)]);
    },
    [mapMessageRow]
  );

  // The picker hands back a file:// path on this device. Storing that meant
  // the other side received a URI that means nothing on their phone, which is
  // why every received image rendered as an empty box. Upload first, store the
  // public URL.
  const sendImageMessage = useCallback(
    async (requestId: string, sender: ChatMessageSender, imageUri: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return;
      const { url, error: uploadError } = await uploadBusinessMedia(
        userId,
        imageUri,
        `chat/${requestId}/${Date.now()}.jpg`
      );
      if (uploadError || !url) return;
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({ request_id: requestId, sender, kind: 'image', image_uri: url })
        .select()
        .single();
      if (!error && data) setMessages((prev) => [...prev, mapMessageRow(data)]);
    },
    [mapMessageRow]
  );

  // Live chat. Without this a message only appeared after closing and
  // reopening the thread, because the list was populated once on open.
  // Scoped to a single request so a device isn't woken by every conversation
  // on the platform — which for an admin account would be all of them.
  const subscribeToThread = useCallback(
    (requestId: string, onMessage: (message: ChatMessage) => void) => {
      if (!isSupabaseConfigured) return () => {};
      const channel = supabase
        .channel(`chat-${requestId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `request_id=eq.${requestId}` },
          (payload) => onMessage(mapMessageRow(payload.new))
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    },
    [mapMessageRow]
  );

  // Accepting a quote flips fields on the request, and the other side needs to
  // see that land — the customer's "Accepted" pill, and the business's newly
  // unlocked contact details.
  const subscribeToRequest = useCallback(
    (requestId: string, onChange: () => void) => {
      if (!isSupabaseConfigured) return () => {};
      const channel = supabase
        .channel(`request-${requestId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'service_requests', filter: `id=eq.${requestId}` },
          () => onChange()
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    },
    []
  );

  // This is the moment the business earns the customer's contact details: the
  // RLS policy on service_request_contacts keys off quote_accepted, so setting
  // it here is what unlocks them. The business picks them up on its next
  // refresh — the dashboard refreshes on focus.
  const acceptQuote = useCallback(async (requestId: string, amount: number) => {
    const acceptedAt = new Date().toISOString();
    const { error } = await supabase
      .from('service_requests')
      .update({ quoted_amount: amount, quote_accepted: true, quote_accepted_at: acceptedAt })
      .eq('id', requestId);
    if (!error) {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, quotedAmount: amount, quoteAccepted: true, quoteAcceptedAt: acceptedAt } : r
        )
      );
    }
  }, []);

  const createListing = useCallback(
    async (profile: Omit<CompanyProfile, 'id'>) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return { error: 'Not signed in.' };
      const { data, error } = await supabase
        .from('business_listings')
        .insert({
          business_id: userId,
          name: profile.name,
          category_ids: profile.categoryIds,
          tagline: profile.tagline,
          description: profile.description,
          phone: profile.phone,
          price_range: profile.priceRange,
          services: profile.services,
          available_now: !!profile.availableNow,
        })
        .select()
        .single();
      if (error || !data) return { error: error?.message ?? 'Could not create listing.' };
      await refreshMyListings();
      refreshBusinessListings();
      return { id: data.id as string };
    },
    [refreshMyListings, refreshBusinessListings]
  );

  const updateListing = useCallback(
    async (id: string, profile: Omit<CompanyProfile, 'id'>) => {
      const { error } = await supabase
        .from('business_listings')
        .update({
          name: profile.name,
          category_ids: profile.categoryIds,
          tagline: profile.tagline,
          description: profile.description,
          phone: profile.phone,
          price_range: profile.priceRange,
          services: profile.services,
          available_now: !!profile.availableNow,
        })
        .eq('id', id);
      if (error) return { error: error.message };
      await refreshMyListings();
      refreshBusinessListings();
      return {};
    },
    [refreshMyListings, refreshBusinessListings]
  );

  const deleteListing = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('business_listings').delete().eq('id', id);
      if (error) return { error: error.message };
      await refreshMyListings();
      refreshBusinessListings();
      return {};
    },
    [refreshMyListings, refreshBusinessListings]
  );

  const uploadCoverPhoto = useCallback(
    async (listingId: string, localUri: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return { error: 'Not signed in.' };
      const { url, error } = await uploadBusinessMedia(userId, localUri, `${listingId}/cover.jpg`);
      if (error || !url) return { error: error ?? 'Upload failed.' };
      const { error: updateError } = await supabase
        .from('business_listings')
        .update({ cover_photo_url: url })
        .eq('id', listingId);
      if (updateError) return { error: updateError.message };
      await refreshMyListings();
      refreshBusinessListings();
      return {};
    },
    [refreshMyListings, refreshBusinessListings]
  );

  const fetchGalleryImages = useCallback(async (listingId: string): Promise<GalleryImage[]> => {
    const { data, error } = await supabase
      .from('business_gallery_images')
      .select('id, image_url')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((row) => ({ id: row.id, url: row.image_url }));
  }, []);

  const addGalleryImage = useCallback(async (listingId: string, localUri: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return { error: 'Not signed in.' };
    const path = `${listingId}/gallery/${Date.now()}-${Math.round(Math.random() * 10000)}.jpg`;
    const { url, error } = await uploadBusinessMedia(userId, localUri, path);
    if (error || !url) return { error: error ?? 'Upload failed.' };
    const { error: insertError } = await supabase
      .from('business_gallery_images')
      .insert({ listing_id: listingId, image_url: url, storage_path: `${userId}/${path}` });
    if (insertError) return { error: insertError.message };
    return {};
  }, []);

  const removeGalleryImage = useCallback(async (imageId: string) => {
    const { data: row } = await supabase
      .from('business_gallery_images')
      .select('storage_path')
      .eq('id', imageId)
      .maybeSingle();
    await supabase.from('business_gallery_images').delete().eq('id', imageId);
    if (row?.storage_path) {
      await supabase.storage.from('business-media').remove([row.storage_path]);
    }
  }, []);

  const signUpCustomer = useCallback(
    async (email: string, password: string, profile: Omit<CustomerProfile, 'id' | 'email'>) => {
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        // Already logged in (e.g. as a business) — add a customer profile to the same account.
        const userId = existing.session.user.id;
        const sessionEmail = existing.session.user.email ?? email;
        const { error: insertError } = await supabase
          .from('customers')
          .insert({ id: userId, email: sessionEmail, ...profile });
        if (insertError) return { error: insertError.message };
        setCustomerProfile({ id: userId, email: sessionEmail, ...profile });
        return {};
      }
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        return { error: 'An account with this email already exists. Please log in instead.' };
      }
      if (!data.session) {
        return { needsEmailConfirmation: true };
      }
      const { error: insertError } = await supabase
        .from('customers')
        .insert({ id: data.session.user.id, email, ...profile });
      if (insertError) return { error: insertError.message };
      setCustomerProfile({ id: data.session.user.id, email, ...profile });
      return {};
    },
    []
  );

  const signInCustomer = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.session) await fetchCustomerProfile(data.session.user.id);
    return {};
  }, [fetchCustomerProfile]);

  const signOutCustomer = useCallback(async () => {
    await supabase.auth.signOut();
    setCustomerProfile(null);
    setBusinessAccount(null);
    setAuthEmail(null);
  }, []);

  const saveCustomerProfile = useCallback(async (profile: CustomerProfile) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return { error: 'Not signed in.' };
    const { error } = await supabase.from('customers').update(profile).eq('id', userId);
    if (error) return { error: error.message };
    setCustomerProfile(profile);
    return {};
  }, []);

  const signUpBusiness = useCallback(
    async (email: string, password: string, account: Omit<BusinessAccount, 'id' | 'email'>) => {
      const { data: existing } = await supabase.auth.getSession();
      let userId: string;
      let sessionEmail: string;
      if (existing.session) {
        // Already logged in (e.g. as a customer) — add a business profile to the same account.
        userId = existing.session.user.id;
        sessionEmail = existing.session.user.email ?? email;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return { error: error.message };
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          return { error: 'An account with this email already exists. Please log in instead.' };
        }
        if (!data.session) {
          return { needsEmailConfirmation: true };
        }
        userId = data.session.user.id;
        sessionEmail = email;
      }
      const { error: insertError } = await supabase
        .from('businesses')
        .insert({ id: userId, email: sessionEmail, name: account.name, phone: account.phone });
      if (insertError) return { error: insertError.message };
      await fetchBusinessAccount(userId);
      refreshBusinessListings();
      return {};
    },
    [fetchBusinessAccount, refreshBusinessListings]
  );

  const signInBusiness = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      if (data.session) await fetchBusinessAccount(data.session.user.id);
      return {};
    },
    [fetchBusinessAccount]
  );

  const signOutBusiness = useCallback(async () => {
    await supabase.auth.signOut();
    setBusinessAccount(null);
    setCustomerProfile(null);
    setAuthEmail(null);
  }, []);

  const addNotifySignup = useCallback((categoryId: string, contact: string) => {
    setNotifySignups((prev) => {
      const next: NotifySignup[] = [...prev, { categoryId, contact, createdAt: new Date().toISOString() }];
      AsyncStorage.setItem(STORAGE_KEYS.notifySignups, JSON.stringify(next));
      return next;
    });
  }, []);

  // Was AsyncStorage-only, which meant toggling a category live only ever
  // affected the admin's own device. Goes through the same server-side
  // override table as group moves so it reaches customers.
  const toggleCategoryStatus = useCallback(
    (id: string) => {
      const current = categories.find((c) => c.id === id);
      const nextStatus: Category['status'] = current?.status === 'live' ? 'coming-soon' : 'live';
      setCategoryOverrides((prev) => ({ ...prev, [id]: { ...prev[id], status: nextStatus } }));
      supabase
        .from('category_overrides')
        .upsert({ slug: id, status: nextStatus, updated_at: new Date().toISOString() }, { onConflict: 'slug' })
        .then(({ error }) => {
          if (error) refreshCategoryOverrides();
        });
    },
    [categories, refreshCategoryOverrides]
  );

  const addCategory = useCallback((category: Category) => {
    setBaseCategories((prev) => {
      const next = [...prev, category];
      AsyncStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(next));
      return next;
    });
  }, []);

  const proposeCategory = useCallback(
    async (name: string): Promise<{ error?: string }> => {
      const trimmed = name.trim();
      if (!trimmed) return { error: 'Enter a category name.' };
      const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (!slug) return { error: 'Enter a category name using letters or numbers.' };

      const { data: sessionData } = await supabase.auth.getSession();
      const businessId = sessionData.session?.user.id;
      if (!businessId) return { error: 'Not signed in.' };

      if (baseCategories.some((c) => c.id === slug)) {
        return { error: 'That category already exists — you can pick it from the list above.' };
      }

      const { error } = await supabase
        .from('proposed_categories')
        .insert({ slug, name: trimmed, proposed_by: businessId });
      if (error) {
        // The unique index on slug is what stops two businesses proposing
        // the same trade twice; surface that as a normal outcome, not a bug.
        if (error.code === '23505') return { error: 'That category has already been suggested.' };
        return { error: error.message };
      }
      await refreshProposedCategories();
      return {};
    },
    [baseCategories, refreshProposedCategories]
  );

  const reviewProposedCategory = useCallback(
    async (id: string, status: 'approved' | 'rejected') => {
      const { error } = await supabase
        .from('proposed_categories')
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (!error) {
        setProposedCategories((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
      }
    },
    []
  );

  const setCategoryGroup = useCallback(
    async (slug: string, groupId: CategoryGroupId) => {
      // Optimistic: the admin sees the move land immediately, and realtime
      // carries it to everyone else a moment later.
      setCategoryOverrides((prev) => ({ ...prev, [slug]: { ...prev[slug], groupId } }));
      const { error } = await supabase
        .from('category_overrides')
        .upsert({ slug, group_id: groupId, updated_at: new Date().toISOString() }, { onConflict: 'slug' });
      if (error) await refreshCategoryOverrides();
    },
    [refreshCategoryOverrides]
  );

  /**
   * Reorders one listing within a category by rewriting the priority of every
   * listing in that category.
   *
   * Priorities all start at 0, so nudging a single row is not enough to
   * establish an order — the whole category gets renumbered from its current
   * displayed sequence, which also repairs any ties left by earlier moves.
   * Demo businesses are skipped: they aren't database rows, so there is
   * nothing to write.
   */
  const moveListingInCategory = useCallback(
    async (listingId: string, categoryId: string, direction: 'up' | 'down' | 'top') => {
      const inCategory = rawBusinessListings
        .filter((l) => (l.category_ids ?? []).includes(categoryId))
        .sort((a, b) => (b.display_priority ?? 0) - (a.display_priority ?? 0));

      const from = inCategory.findIndex((l) => l.id === listingId);
      if (from === -1) return;
      const to = direction === 'top' ? 0 : direction === 'up' ? from - 1 : from + 1;
      if (to < 0 || to >= inCategory.length) return;

      const reordered = [...inCategory];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);

      const updates = reordered.map((listing, index) => ({
        id: listing.id,
        priority: reordered.length - index,
      }));

      setRawBusinessListings((prev) =>
        prev.map((l) => {
          const update = updates.find((u) => u.id === l.id);
          return update ? { ...l, display_priority: update.priority } : l;
        })
      );

      await Promise.all(
        updates.map((u) =>
          supabase.from('business_listings').update({ display_priority: u.priority }).eq('id', u.id)
        )
      );
      await refreshBusinessListings();
    },
    [rawBusinessListings, refreshBusinessListings]
  );

  const approveProposedCategory = useCallback(
    (id: string) => reviewProposedCategory(id, 'approved'),
    [reviewProposedCategory]
  );

  const rejectProposedCategory = useCallback(
    (id: string) => reviewProposedCategory(id, 'rejected'),
    [reviewProposedCategory]
  );

  const refreshAdminBusinesses = useCallback(async () => {
    const [{ data: bizRows, error: bizError }, { data: listingRows }, { data: reqRows }, { data: flagRows }] =
      await Promise.all([
        supabase
          .from('businesses')
          .select('id, name, email, phone, application_status, business_status, rejection_reason, created_at')
          .order('created_at', { ascending: false }),
        supabase.from('business_listings').select('id, business_id, category_ids'),
        supabase.from('service_requests').select('listing_id, status, commission, commission_paid'),
        supabase.from('business_flags').select('id, business_id, note, created_at'),
      ]);
    if (bizError || !bizRows) return;
    const listings = listingRows ?? [];
    const requestsByListing = reqRows ?? [];
    const flagsByBusiness = flagRows ?? [];
    setAdminBusinesses(
      bizRows.map((b) => {
        const theirListings = listings.filter((l) => l.business_id === b.id);
        const theirListingIds = new Set(theirListings.map((l) => l.id));
        const categoryIds = Array.from(new Set(theirListings.flatMap((l) => l.category_ids ?? [])));
        const completed = requestsByListing.filter((r) => theirListingIds.has(r.listing_id) && r.status === 'completed');
        const jobsCompleted = completed.length;
        const commissionOwed = completed
          .filter((r) => !r.commission_paid)
          .reduce((sum, r) => sum + (r.commission ?? 0), 0);
        const commissionPaid = completed
          .filter((r) => r.commission_paid)
          .reduce((sum, r) => sum + (r.commission ?? 0), 0);
        return {
          id: b.id,
          businessName: b.name,
          contactEmail: b.email,
          contactPhone: b.phone,
          categoryIds,
          applicationStatus: b.application_status as ApplicationStatus,
          businessStatus: b.business_status as AdminBusinessStatus,
          rejectionReason: b.rejection_reason ?? '',
          submittedAt: b.created_at,
          jobsCompleted,
          commissionOwed,
          commissionPaid,
          flags: flagsByBusiness
            .filter((f) => f.business_id === b.id)
            .map((f) => ({ id: f.id, note: f.note, createdAt: f.created_at })),
        };
      })
    );
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !isAdminAuthenticated) return;
    refreshAdminBusinesses();
  }, [isAdminAuthenticated, refreshAdminBusinesses]);

  const approveAdminApplication = useCallback(
    async (id: string) => {
      await supabase
        .from('businesses')
        .update({ application_status: 'approved', business_status: 'active', is_approved: true })
        .eq('id', id);
      refreshAdminBusinesses();
    },
    [refreshAdminBusinesses]
  );

  const rejectAdminApplication = useCallback(
    async (id: string, reason: string) => {
      await supabase
        .from('businesses')
        .update({ application_status: 'rejected', rejection_reason: reason })
        .eq('id', id);
      refreshAdminBusinesses();
    },
    [refreshAdminBusinesses]
  );

  const suspendBusiness = useCallback(
    async (id: string) => {
      await supabase.from('businesses').update({ business_status: 'suspended' }).eq('id', id);
      refreshAdminBusinesses();
    },
    [refreshAdminBusinesses]
  );

  const reinstateBusiness = useCallback(
    async (id: string) => {
      await supabase.from('businesses').update({ business_status: 'active' }).eq('id', id);
      refreshAdminBusinesses();
    },
    [refreshAdminBusinesses]
  );

  const addComplaintFlag = useCallback(
    async (id: string, note: string) => {
      await supabase.from('business_flags').insert({ business_id: id, note });
      refreshAdminBusinesses();
    },
    [refreshAdminBusinesses]
  );

  const markCommissionPaid = useCallback(
    async (id: string) => {
      const { data: listingRows } = await supabase.from('business_listings').select('id').eq('business_id', id);
      const listingIds = (listingRows ?? []).map((l) => l.id);
      if (listingIds.length > 0) {
        await supabase
          .from('service_requests')
          .update({ commission_paid: true })
          .in('listing_id', listingIds)
          .eq('status', 'completed')
          .eq('commission_paid', false);
      }
      refreshAdminBusinesses();
    },
    [refreshAdminBusinesses]
  );

  // --- Multi-account: manager side -----------------------------------------

  const refreshEmployees = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setEmployees([]);
      return;
    }
    const [{ data: staff }, { data: seatRow }, { data: reqRows }] = await Promise.all([
      supabase.from('business_employees').select('*').eq('business_id', userId).order('created_at'),
      supabase.from('businesses').select('employee_seats').eq('id', userId).maybeSingle(),
      supabase
        .from('employee_access_requests')
        .select('*')
        .eq('business_id', userId)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);
    setEmployees((staff ?? []).map(mapEmployeeRow));
    setEmployeeSeats(seatRow?.employee_seats ?? 0);
    setMyEmployeeAccessRequest(reqRows && reqRows.length > 0 ? mapAccessRequestRow(reqRows[0]) : null);
  }, []);

  const inviteEmployee = useCallback(
    async (input: { name: string; email: string; phone: string }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return { error: 'Not signed in.' };
      const code = generateInviteCode();
      const { error } = await supabase.from('business_employees').insert({
        business_id: userId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        invite_code: code,
      });
      // The seat limit is a database trigger, so hitting it surfaces here
      // rather than being something the UI has to predict.
      if (error) return { error: error.message };
      await refreshEmployees();
      return { code };
    },
    [refreshEmployees]
  );

  const setEmployeeStatus = useCallback(
    async (id: string, status: EmployeeStatus) => {
      const { error } = await supabase.from('business_employees').update({ status }).eq('id', id);
      if (error) return { error: error.message };
      await refreshEmployees();
      return {};
    },
    [refreshEmployees]
  );

  const removeEmployee = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('business_employees').delete().eq('id', id);
      if (error) return { error: error.message };
      await refreshEmployees();
      return {};
    },
    [refreshEmployees]
  );

  const requestEmployeeAccess = useCallback(
    async (note: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return { error: 'Not signed in.' };
      const { error } = await supabase.from('employee_access_requests').insert({ business_id: userId, note });
      if (error) return { error: error.message };
      await refreshEmployees();
      return {};
    },
    [refreshEmployees]
  );

  const assignRequestToEmployee = useCallback(
    async (requestId: string, employeeId: string | null, details: { notes: string; mapUrl: string }) => {
      const patch = employeeId
        ? {
            assigned_employee_id: employeeId,
            assignment_notes: details.notes,
            assignment_map_url: details.mapUrl,
            assigned_at: new Date().toISOString(),
          }
        : {
            assigned_employee_id: null,
            assignment_notes: '',
            assignment_map_url: '',
            assigned_at: null,
            employee_done: false,
            employee_done_at: null,
          };
      const { error } = await supabase.from('service_requests').update(patch).eq('id', requestId);
      if (error) return { error: error.message };
      await refreshRequests();
      return {};
    },
    [refreshRequests]
  );

  // --- Multi-account: employee side ----------------------------------------

  const signInEmployee = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      if (data.session) await fetchMyEmployment(data.session.user.id);
      return {};
    },
    [fetchMyEmployment]
  );

  const signUpEmployee = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return { error: 'An account with this email already exists. Log in instead.' };
    }
    if (!data.session) return { needsEmailConfirmation: true };
    return {};
  }, []);

  // Goes through an RPC because a freshly signed-up employee cannot see any
  // row in business_employees yet — there is nothing to match them on until
  // this claims the invite for them.
  const redeemEmployeeInvite = useCallback(
    async (code: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return { error: 'Sign in first, then enter your code.' };
      const { error } = await supabase.rpc('redeem_employee_invite', { code });
      if (error) return { error: error.message };
      await fetchMyEmployment(userId);
      return {};
    },
    [fetchMyEmployment]
  );

  // Purely an internal flag for the manager. Completing the job — and with it
  // customer confirmation and commission — stays with the manager, and the
  // database enforces that rather than trusting this screen.
  const setEmployeeJobDone = useCallback(
    async (requestId: string, done: boolean) => {
      const { error } = await supabase.from('service_requests').update({ employee_done: done }).eq('id', requestId);
      if (error) return { error: error.message };
      await refreshRequests();
      return {};
    },
    [refreshRequests]
  );

  const signOutEmployee = useCallback(async () => {
    await supabase.auth.signOut();
    setMyEmployment(null);
    setAuthEmail(null);
    setModeState(null);
    AsyncStorage.setItem(STORAGE_KEYS.mode, JSON.stringify(null));
  }, []);

  // --- Multi-account: admin side -------------------------------------------

  const refreshEmployeeAccessRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from('employee_access_requests')
      .select('*, businesses (name, email)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) setEmployeeAccessRequests(data.map(mapAccessRequestRow));
  }, []);

  const reviewEmployeeAccessRequest = useCallback(
    async (id: string, decision: { approve: boolean; seats?: number; note: string }) => {
      const target = employeeAccessRequests.find((r) => r.id === id);
      const { error } = await supabase
        .from('employee_access_requests')
        .update({
          status: decision.approve ? 'approved' : 'rejected',
          seats_approved: decision.approve ? decision.seats ?? 0 : null,
          admin_note: decision.note,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) return { error: error.message };
      // Approving is what actually grants the seats; the request row is only
      // the paper trail.
      if (decision.approve && target) {
        const { error: seatError } = await supabase
          .from('businesses')
          .update({ employee_seats: decision.seats ?? 0 })
          .eq('id', target.businessId);
        if (seatError) return { error: seatError.message };
      }
      await refreshEmployeeAccessRequests();
      return {};
    },
    [employeeAccessRequests, refreshEmployeeAccessRequests]
  );

  // --- Business calendar ----------------------------------------------------

  const refreshCalendar = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setCalendarEntries([]);
      return;
    }
    const { data, error } = await supabase
      .from('calendar_entries')
      .select('*')
      .eq('business_id', userId)
      .order('starts_at');
    if (!error && data) {
      setCalendarEntries(
        data.map((row: any) => ({
          id: row.id,
          businessId: row.business_id,
          title: row.title ?? '',
          notes: row.notes ?? '',
          startsAt: row.starts_at,
          endsAt: row.ends_at,
        }))
      );
    }
  }, []);

  const addCalendarEntry = useCallback(
    async (entry: { title: string; notes: string; startsAt: string; endsAt: string }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return { error: 'Not signed in.' };
      const { error } = await supabase.from('calendar_entries').insert({
        business_id: userId,
        title: entry.title,
        notes: entry.notes,
        starts_at: entry.startsAt,
        ends_at: entry.endsAt,
      });
      if (error) return { error: error.message };
      await refreshCalendar();
      return {};
    },
    [refreshCalendar]
  );

  const deleteCalendarEntry = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('calendar_entries').delete().eq('id', id);
      if (error) return { error: error.message };
      await refreshCalendar();
      return {};
    },
    [refreshCalendar]
  );

  const setRequestSchedule = useCallback(
    async (requestId: string, scheduledFor: string | null) => {
      const { error } = await supabase
        .from('service_requests')
        .update({ scheduled_for: scheduledFor })
        .eq('id', requestId);
      if (error) return { error: error.message };
      await refreshRequests();
      return {};
    },
    [refreshRequests]
  );

  // Deliberately an RPC rather than a table read: admins have no select policy
  // on calendar_entries at all, so this is the only thing they can learn about
  // a business's diary — how full it is, never what is in it.
  const refreshBusySummary = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_busy_summary', { window_days: 90 });
    if (!error && data) {
      setBusySummary(
        (data as any[]).map((row) => ({
          businessId: row.business_id,
          busyHours: Number(row.busy_hours ?? 0),
          entryCount: Number(row.entry_count ?? 0),
        }))
      );
    }
  }, []);

  const value = useMemo(
    () => ({
      isReady,
      hasAcceptedLegal,
      acceptLegal,
      mode,
      setMode,
      isAdminAuthenticated,
      signInAdmin,
      logoutAdmin,
      reviews,
      addReview,
      messages,
      sendMessage,
      sendQuote,
      sendImageMessage,
      acceptQuote,
      requests,
      addRequest,
      updateRequestStatus,
      completeRequest,
      confirmCompletion,
      payCommission,
      rescheduleRequest,
      myListings,
      refreshMyListings,
      createListing,
      updateListing,
      deleteListing,
      uploadCoverPhoto,
      fetchGalleryImages,
      addGalleryImage,
      removeGalleryImage,
      businessListings,
      refreshRequests,
      refreshMessages,
      subscribeToThread,
      subscribeToRequest,
      customerProfile,
      businessAccount,
      authEmail,
      authLoading,
      signUpCustomer,
      signInCustomer,
      signOutCustomer,
      saveCustomerProfile,
      signUpBusiness,
      signInBusiness,
      signOutBusiness,
      notifySignups,
      addNotifySignup,
      categories,
      toggleCategoryStatus,
      addCategory,
      proposeCategory,
      myProposedCategories,
      pendingCategories,
      approveProposedCategory,
      rejectProposedCategory,
      setCategoryGroup,
      moveListingInCategory,
      adminBusinesses,
      refreshAdminBusinesses,
      approveAdminApplication,
      rejectAdminApplication,
      suspendBusiness,
      reinstateBusiness,
      addComplaintFlag,
      markCommissionPaid,
      employees,
      employeeSeats,
      refreshEmployees,
      inviteEmployee,
      setEmployeeStatus,
      removeEmployee,
      requestEmployeeAccess,
      myEmployeeAccessRequest,
      assignRequestToEmployee,
      myEmployment,
      signInEmployee,
      signUpEmployee,
      redeemEmployeeInvite,
      setEmployeeJobDone,
      signOutEmployee,
      employeeAccessRequests,
      refreshEmployeeAccessRequests,
      reviewEmployeeAccessRequest,
      calendarEntries,
      refreshCalendar,
      addCalendarEntry,
      deleteCalendarEntry,
      setRequestSchedule,
      busySummary,
      refreshBusySummary,
    }),
    [
      isReady,
      hasAcceptedLegal,
      acceptLegal,
      mode,
      setMode,
      isAdminUser,
      signInAdmin,
      logoutAdmin,
      reviews,
      addReview,
      messages,
      sendMessage,
      sendQuote,
      sendImageMessage,
      acceptQuote,
      requests,
      addRequest,
      updateRequestStatus,
      completeRequest,
      confirmCompletion,
      payCommission,
      rescheduleRequest,
      myListings,
      refreshMyListings,
      createListing,
      updateListing,
      deleteListing,
      uploadCoverPhoto,
      fetchGalleryImages,
      addGalleryImage,
      removeGalleryImage,
      businessListings,
      refreshRequests,
      refreshMessages,
      subscribeToThread,
      subscribeToRequest,
      customerProfile,
      businessAccount,
      authEmail,
      authLoading,
      signUpCustomer,
      signInCustomer,
      signOutCustomer,
      saveCustomerProfile,
      signUpBusiness,
      signInBusiness,
      signOutBusiness,
      notifySignups,
      addNotifySignup,
      categories,
      toggleCategoryStatus,
      addCategory,
      proposeCategory,
      myProposedCategories,
      pendingCategories,
      approveProposedCategory,
      rejectProposedCategory,
      setCategoryGroup,
      moveListingInCategory,
      adminBusinesses,
      refreshAdminBusinesses,
      approveAdminApplication,
      rejectAdminApplication,
      suspendBusiness,
      reinstateBusiness,
      addComplaintFlag,
      markCommissionPaid,
      employees,
      employeeSeats,
      refreshEmployees,
      inviteEmployee,
      setEmployeeStatus,
      removeEmployee,
      requestEmployeeAccess,
      myEmployeeAccessRequest,
      assignRequestToEmployee,
      myEmployment,
      signInEmployee,
      signUpEmployee,
      redeemEmployeeInvite,
      setEmployeeJobDone,
      signOutEmployee,
      employeeAccessRequests,
      refreshEmployeeAccessRequests,
      reviewEmployeeAccessRequest,
      calendarEntries,
      refreshCalendar,
      addCalendarEntry,
      deleteCalendarEntry,
      setRequestSchedule,
      busySummary,
      refreshBusySummary,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
