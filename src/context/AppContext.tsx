import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { DEFAULT_CATEGORIES } from '../data/categories';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { uploadBusinessMedia } from '../lib/mediaUpload';
import { colorFromId } from '../utils/color';
import {
  AdminBusiness,
  AdminBusinessStatus,
  ApplicationStatus,
  BusinessAccount,
  Category,
  ChatMessage,
  ChatMessageSender,
  Company,
  CompanyProfile,
  CustomerProfile,
  GalleryImage,
  NotifySignup,
  Review,
  ServiceRequest,
  UserMode,
} from '../types';

const STORAGE_KEYS = {
  mode: '@sortedforyou/mode',
  notifySignups: '@sortedforyou/notifySignups',
  categories: '@sortedforyou/categories',
  hasAcceptedLegal: '@sortedforyou/hasAcceptedLegal',
};

// Flat commission structure: 10% on jobs of £500 or less, 5% above £500.
export const COMMISSION_RATE = (jobValue: number) => (jobValue > 500 ? 0.05 : 0.1);

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
  addRequest: (input: Omit<ServiceRequest, 'id' | 'caseNumber' | 'createdAt' | 'customerId'>) => Promise<string>;
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
  adminBusinesses: AdminBusiness[];
  refreshAdminBusinesses: () => Promise<void>;
  approveAdminApplication: (id: string) => Promise<void>;
  rejectAdminApplication: (id: string, reason: string) => Promise<void>;
  suspendBusiness: (id: string) => Promise<void>;
  reinstateBusiness: (id: string) => Promise<void>;
  addComplaintFlag: (id: string, note: string) => Promise<void>;
  markCommissionPaid: (id: string) => Promise<void>;
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
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [mode, setModeState] = useState<UserMode | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [myListings, setMyListings] = useState<CompanyProfile[]>([]);
  const [notifySignups, setNotifySignups] = useState<NotifySignup[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [adminBusinesses, setAdminBusinesses] = useState<AdminBusiness[]>([]);
  const [rawBusinessListings, setRawBusinessListings] = useState<BusinessListingRow[]>([]);

  const businessListings = useMemo<Company[]>(
    () =>
      rawBusinessListings.map((l) => {
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
        };
      }),
    [rawBusinessListings, reviews]
  );

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
        if (storedCategories) setCategories(JSON.parse(storedCategories));
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
      .select('id, name, email, phone')
      .eq('id', userId)
      .maybeSingle();
    if (!error && data) {
      setBusinessAccount({ id: data.id, name: data.name, email: data.email, phone: data.phone });
    } else {
      setBusinessAccount(null);
    }
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
        .select('id, business_id, name, phone, category_ids, tagline, description, price_range, services, available_now, cover_photo_url'),
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

  const mapRequestRow = useCallback(
    (row: any): ServiceRequest => ({
      id: row.id,
      caseNumber: row.case_number,
      companyId: row.listing_id,
      customerId: row.customer_id,
      companyName: row.company_name,
      categoryName: row.category_name,
      type: row.type,
      customerName: row.customer_name,
      phone: row.phone,
      address: row.address,
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
    }),
    []
  );

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
    if (!error && data) setRequests(data.map(mapRequestRow));
  }, [mapRequestRow]);

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
        ]);
      } else {
        setAuthEmail(null);
        setCustomerProfile(null);
        setBusinessAccount(null);
        setIsAdminUser(false);
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
  }, [fetchCustomerProfile, fetchBusinessAccount, fetchIsAdmin]);

  // Business listings and reviews are public — anyone can browse them regardless of login state.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    refreshBusinessListings();
    refreshReviews();
  }, [refreshBusinessListings, refreshReviews]);

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
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshBusinessListings]);

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
    async (input: Omit<ServiceRequest, 'id' | 'caseNumber' | 'createdAt' | 'customerId'>) => {
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
          customer_name: input.customerName,
          phone: input.phone,
          address: input.address,
          job_details: input.jobDetails,
          preferred_date: input.preferredDate,
          scheduled_slot: input.scheduledSlot,
          status: input.status,
        })
        .select()
        .single();
      if (error || !data) return '';
      setRequests((prev) => [mapRequestRow(data), ...prev]);
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

  const sendImageMessage = useCallback(
    async (requestId: string, sender: ChatMessageSender, imageUri: string) => {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({ request_id: requestId, sender, kind: 'image', image_uri: imageUri })
        .select()
        .single();
      if (!error && data) setMessages((prev) => [...prev, mapMessageRow(data)]);
    },
    [mapMessageRow]
  );

  const acceptQuote = useCallback(async (requestId: string, amount: number) => {
    const { error } = await supabase
      .from('service_requests')
      .update({ quoted_amount: amount, quote_accepted: true })
      .eq('id', requestId);
    if (!error) {
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, quotedAmount: amount, quoteAccepted: true } : r))
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

  const toggleCategoryStatus = useCallback((id: string) => {
    setCategories((prev) => {
      const next = prev.map((c) =>
        c.id === id ? { ...c, status: (c.status === 'live' ? 'coming-soon' : 'live') as Category['status'] } : c
      );
      AsyncStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(next));
      return next;
    });
  }, []);

  const addCategory = useCallback((category: Category) => {
    setCategories((prev) => {
      const next = [...prev, category];
      AsyncStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(next));
      return next;
    });
  }, []);

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
      adminBusinesses,
      refreshAdminBusinesses,
      approveAdminApplication,
      rejectAdminApplication,
      suspendBusiness,
      reinstateBusiness,
      addComplaintFlag,
      markCommissionPaid,
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
      adminBusinesses,
      refreshAdminBusinesses,
      approveAdminApplication,
      rejectAdminApplication,
      suspendBusiness,
      reinstateBusiness,
      addComplaintFlag,
      markCommissionPaid,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
