import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ADMIN_PASSCODE } from '../data/adminAuth';
import { DEFAULT_CATEGORIES } from '../data/categories';
import { getTierInfo } from '../data/tiers';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { uploadBusinessMedia } from '../lib/mediaUpload';
import { colorFromId } from '../utils/color';
import {
  AdminBusiness,
  AdminBusinessStatus,
  ApplicationStatus,
  BusinessAccount,
  BusinessApplication,
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
  SubscriptionTier,
  UserMode,
} from '../types';

const STORAGE_KEYS = {
  mode: '@sortedforyou/mode',
  notifySignups: '@sortedforyou/notifySignups',
  businessApplication: '@sortedforyou/businessApplication',
  categories: '@sortedforyou/categories',
  hasAcceptedLegal: '@sortedforyou/hasAcceptedLegal',
  adminPasscodeVerified: '@sortedforyou/isAdminAuthenticated',
};

const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  name: 'My Business',
  categoryIds: ['plumbers'],
  tagline: 'Tell customers what you do best',
  description: 'Add a description of your business so customers know what to expect.',
  phone: '+350 200 00000',
  priceRange: '££',
  services: ['Add your first service'],
};

const DEFAULT_BUSINESS_APPLICATION: BusinessApplication = {
  status: 'not_started',
  businessName: '',
  contactEmail: '',
  contactPhone: '',
  categoryIds: [],
  documents: [
    { id: 'id-proof', label: 'ID / proof of address', uploaded: false },
    { id: 'trade-licence', label: 'Trade Licence', uploaded: false },
    { id: 'insurance', label: 'Public liability insurance', uploaded: false, expiryDate: '' },
    { id: 'business-registration', label: 'Business registration proof', uploaded: false },
  ],
  tier: null,
  promoCode: '',
  submittedAt: '',
  rejectionReason: '',
  unlicensedExplanation: '',
};

type AppContextValue = {
  isReady: boolean;
  hasAcceptedLegal: boolean;
  acceptLegal: () => void;
  mode: UserMode | null;
  setMode: (mode: UserMode | null) => void;
  isAdminAuthenticated: boolean;
  authenticateAdmin: (passcode: string) => boolean;
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
  addRequest: (input: Omit<ServiceRequest, 'id' | 'createdAt' | 'customerId'>) => Promise<string>;
  updateRequestStatus: (id: string, status: ServiceRequest['status']) => Promise<void>;
  completeRequest: (id: string, jobValue: number) => Promise<void>;
  confirmCompletion: (id: string) => Promise<void>;
  rescheduleRequest: (id: string, newSlot: string) => Promise<void>;
  companyProfile: CompanyProfile;
  updateCompanyProfile: (profile: CompanyProfile) => Promise<{ error?: string }>;
  uploadCoverPhoto: (localUri: string) => Promise<{ error?: string }>;
  fetchGalleryImages: (businessId: string) => Promise<GalleryImage[]>;
  addGalleryImage: (localUri: string) => Promise<{ error?: string }>;
  removeGalleryImage: (imageId: string) => Promise<void>;
  businessListings: Company[];
  refreshRequests: () => Promise<void>;
  refreshMessages: () => Promise<void>;
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
  businessApplication: BusinessApplication;
  updateApplicationDraft: (patch: Partial<BusinessApplication>) => void;
  submitApplication: () => void;
  approveApplication: () => void;
  changeTier: (tier: SubscriptionTier) => void;
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

type BusinessListingRow = {
  id: string;
  name: string;
  phone: string;
  category_ids: string[] | null;
  tagline: string | null;
  description: string | null;
  price_range: string | null;
  services: string[] | null;
  available_now: boolean | null;
  tier: string | null;
  cover_photo_url: string | null;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(false);
  const [adminPasscodeVerified, setAdminPasscodeVerified] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const isAdminAuthenticated = adminPasscodeVerified && isAdminUser;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [businessAccount, setBusinessAccount] = useState<BusinessAccount | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [mode, setModeState] = useState<UserMode | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(DEFAULT_COMPANY_PROFILE);
  const [notifySignups, setNotifySignups] = useState<NotifySignup[]>([]);
  const [businessApplication, setBusinessApplication] = useState<BusinessApplication>(DEFAULT_BUSINESS_APPLICATION);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [adminBusinesses, setAdminBusinesses] = useState<AdminBusiness[]>([]);
  const [rawBusinessListings, setRawBusinessListings] = useState<BusinessListingRow[]>([]);

  const businessListings = useMemo<Company[]>(
    () =>
      rawBusinessListings.map((b) => {
        const businessReviews = reviews.filter((r) => r.companyId === b.id);
        const reviewCount = businessReviews.length;
        const rating = reviewCount > 0 ? businessReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : 0;
        return {
          id: b.id,
          name: b.name,
          categoryIds: b.category_ids ?? [],
          tagline: b.tagline ?? '',
          description: b.description ?? '',
          rating,
          reviewCount,
          priceRange: (b.price_range ?? '££') as Company['priceRange'],
          phone: b.phone,
          yearsActive: 0,
          services: b.services ?? [],
          color: colorFromId(b.id),
          tier: (b.tier ?? 'standard') as SubscriptionTier,
          availableNow: !!b.available_now,
          coverPhotoUrl: b.cover_photo_url ?? undefined,
        };
      }),
    [rawBusinessListings, reviews]
  );

  useEffect(() => {
    (async () => {
      try {
        const [
          storedMode,
          storedSignups,
          storedApplication,
          storedCategories,
          storedHasAcceptedLegal,
          storedAdminPasscodeVerified,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.mode),
          AsyncStorage.getItem(STORAGE_KEYS.notifySignups),
          AsyncStorage.getItem(STORAGE_KEYS.businessApplication),
          AsyncStorage.getItem(STORAGE_KEYS.categories),
          AsyncStorage.getItem(STORAGE_KEYS.hasAcceptedLegal),
          AsyncStorage.getItem(STORAGE_KEYS.adminPasscodeVerified),
        ]);
        if (storedMode) setModeState(JSON.parse(storedMode));
        if (storedSignups) setNotifySignups(JSON.parse(storedSignups));
        if (storedApplication) setBusinessApplication(JSON.parse(storedApplication));
        if (storedCategories) setCategories(JSON.parse(storedCategories));
        if (storedHasAcceptedLegal) setHasAcceptedLegal(JSON.parse(storedHasAcceptedLegal));
        if (storedAdminPasscodeVerified) setAdminPasscodeVerified(JSON.parse(storedAdminPasscodeVerified));
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
      .select('id, name, email, phone, category_ids, tagline, description, price_range, services, available_now, cover_photo_url')
      .eq('id', userId)
      .maybeSingle();
    if (!error && data) {
      setBusinessAccount({ id: data.id, name: data.name, email: data.email, phone: data.phone });
      setCompanyProfile({
        name: data.name,
        categoryIds: data.category_ids ?? [],
        tagline: data.tagline ?? '',
        description: data.description ?? '',
        phone: data.phone,
        priceRange: (data.price_range ?? '££') as CompanyProfile['priceRange'],
        services: data.services ?? [],
        availableNow: !!data.available_now,
        coverPhotoUrl: data.cover_photo_url ?? undefined,
      });
    } else {
      setBusinessAccount(null);
    }
  }, []);

  const refreshBusinessListings = useCallback(async () => {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, phone, category_ids, tagline, description, price_range, services, available_now, tier, cover_photo_url')
      .eq('is_approved', true);
    if (!error && data) setRawBusinessListings(data);
  }, []);

  const refreshReviews = useCallback(async () => {
    const { data, error } = await supabase.from('reviews').select('*');
    if (!error && data) {
      setReviews(
        data.map((r) => ({
          id: r.id,
          requestId: r.request_id,
          companyId: r.business_id,
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
      companyId: row.business_id,
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
      customerConfirmed: !!row.customer_confirmed,
      quotedAmount: row.quoted_amount ?? undefined,
      quoteAccepted: !!row.quote_accepted,
    }),
    []
  );

  const refreshRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from('service_requests')
      .select('*')
      .order('created_at', { ascending: false });
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

  const refreshMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
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
    supabase.auth.getSession().then(async ({ data }) => {
      await syncSession(data.session);
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

  // Requests/messages are only visible to their two participants (enforced by RLS),
  // so fetch them once we know who's logged in.
  useEffect(() => {
    if (!isSupabaseConfigured || authLoading) return;
    if (customerProfile || businessAccount) {
      refreshRequests();
      refreshMessages();
    }
  }, [customerProfile, businessAccount, authLoading, refreshRequests, refreshMessages]);

  const acceptLegal = useCallback(() => {
    setHasAcceptedLegal(true);
    AsyncStorage.setItem(STORAGE_KEYS.hasAcceptedLegal, JSON.stringify(true));
  }, []);

  const setMode = useCallback((next: UserMode | null) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEYS.mode, JSON.stringify(next));
  }, []);

  const authenticateAdmin = useCallback((passcode: string) => {
    const success = passcode.trim() === ADMIN_PASSCODE;
    if (success) {
      setAdminPasscodeVerified(true);
      AsyncStorage.setItem(STORAGE_KEYS.adminPasscodeVerified, JSON.stringify(true));
    }
    return success;
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
    setAdminPasscodeVerified(false);
    AsyncStorage.setItem(STORAGE_KEYS.adminPasscodeVerified, JSON.stringify(false));
    setModeState(null);
    AsyncStorage.setItem(STORAGE_KEYS.mode, JSON.stringify(null));
  }, []);

  const addRequest = useCallback(
    async (input: Omit<ServiceRequest, 'id' | 'createdAt' | 'customerId'>) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const customerId = sessionData.session?.user.id;
      if (!customerId) return '';
      const { data, error } = await supabase
        .from('service_requests')
        .insert({
          business_id: input.companyId,
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

  const completeRequest = useCallback(
    async (id: string, jobValue: number) => {
      const rate = getTierInfo(businessApplication.tier ?? 'standard').commissionRate;
      const commission = Math.round(jobValue * rate * 100) / 100;
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
    },
    [businessApplication.tier]
  );

  const confirmCompletion = useCallback(async (id: string) => {
    const { error } = await supabase.from('service_requests').update({ customer_confirmed: true }).eq('id', id);
    if (!error) setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, customerConfirmed: true } : r)));
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
      .insert({ request_id: requestId, business_id: companyId, customer_id: customerId, rating, comment })
      .select()
      .single();
    if (!error && data) {
      setReviews((prev) => [
        ...prev,
        { id: data.id, requestId: data.request_id, companyId: data.business_id, rating: data.rating, comment: data.comment ?? '', createdAt: data.created_at },
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

  const updateCompanyProfile = useCallback(
    async (profile: CompanyProfile) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return { error: 'Not signed in.' };
      const { error } = await supabase
        .from('businesses')
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
        .eq('id', userId);
      if (error) return { error: error.message };
      setCompanyProfile(profile);
      setBusinessAccount((prev) => (prev ? { ...prev, name: profile.name, phone: profile.phone } : prev));
      refreshBusinessListings();
      return {};
    },
    [refreshBusinessListings]
  );

  const uploadCoverPhoto = useCallback(
    async (localUri: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return { error: 'Not signed in.' };
      const { url, error } = await uploadBusinessMedia(userId, localUri, 'cover.jpg');
      if (error || !url) return { error: error ?? 'Upload failed.' };
      const { error: updateError } = await supabase
        .from('businesses')
        .update({ cover_photo_url: url })
        .eq('id', userId);
      if (updateError) return { error: updateError.message };
      setCompanyProfile((prev) => ({ ...prev, coverPhotoUrl: url }));
      refreshBusinessListings();
      return {};
    },
    [refreshBusinessListings]
  );

  const fetchGalleryImages = useCallback(async (businessId: string): Promise<GalleryImage[]> => {
    const { data, error } = await supabase
      .from('business_gallery_images')
      .select('id, image_url')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((row) => ({ id: row.id, url: row.image_url }));
  }, []);

  const addGalleryImage = useCallback(async (localUri: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return { error: 'Not signed in.' };
    const path = `gallery/${Date.now()}-${Math.round(Math.random() * 10000)}.jpg`;
    const { url, error } = await uploadBusinessMedia(userId, localUri, path);
    if (error || !url) return { error: error ?? 'Upload failed.' };
    const { error: insertError } = await supabase
      .from('business_gallery_images')
      .insert({ business_id: userId, image_url: url, storage_path: `${userId}/${path}` });
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
      setBusinessApplication((prev) => {
        const next: BusinessApplication = {
          ...prev,
          businessName: prev.businessName || account.name,
          contactEmail: prev.contactEmail || sessionEmail,
          contactPhone: prev.contactPhone || account.phone,
        };
        AsyncStorage.setItem(STORAGE_KEYS.businessApplication, JSON.stringify(next));
        return next;
      });
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

  const updateApplicationDraft = useCallback(
    (patch: Partial<BusinessApplication>) => {
      setBusinessApplication((prev) => {
        const next = { ...prev, ...patch };
        AsyncStorage.setItem(STORAGE_KEYS.businessApplication, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const submitApplication = useCallback(() => {
    setBusinessApplication((prev) => {
      const next: BusinessApplication = { ...prev, status: 'pending', submittedAt: new Date().toISOString() };
      AsyncStorage.setItem(STORAGE_KEYS.businessApplication, JSON.stringify(next));
      return next;
    });
  }, []);

  const approveApplication = useCallback(() => {
    setBusinessApplication((prev) => {
      const next: BusinessApplication = { ...prev, status: 'approved' };
      AsyncStorage.setItem(STORAGE_KEYS.businessApplication, JSON.stringify(next));
      return next;
    });
    const next: CompanyProfile = {
      ...companyProfile,
      name: businessApplication.businessName || companyProfile.name,
      categoryIds: businessApplication.categoryIds.length > 0 ? businessApplication.categoryIds : companyProfile.categoryIds,
      phone: businessApplication.contactPhone || companyProfile.phone,
    };
    updateCompanyProfile(next);
  }, [businessApplication.businessName, businessApplication.categoryIds, businessApplication.contactPhone, companyProfile, updateCompanyProfile]);

  const changeTier = useCallback(
    async (tier: SubscriptionTier) => {
      setBusinessApplication((prev) => {
        const next: BusinessApplication = { ...prev, tier };
        AsyncStorage.setItem(STORAGE_KEYS.businessApplication, JSON.stringify(next));
        return next;
      });
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (userId) {
        await supabase.from('businesses').update({ tier }).eq('id', userId);
        refreshBusinessListings();
      }
    },
    [refreshBusinessListings]
  );

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
    const [{ data: bizRows, error: bizError }, { data: reqRows }, { data: flagRows }] = await Promise.all([
      supabase
        .from('businesses')
        .select('id, name, email, phone, category_ids, tier, application_status, business_status, rejection_reason, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('service_requests').select('business_id, status, commission, commission_paid'),
      supabase.from('business_flags').select('id, business_id, note, created_at'),
    ]);
    if (bizError || !bizRows) return;
    const requestsByBusiness = reqRows ?? [];
    const flagsByBusiness = flagRows ?? [];
    setAdminBusinesses(
      bizRows.map((b) => {
        const completed = requestsByBusiness.filter((r) => r.business_id === b.id && r.status === 'completed');
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
          categoryIds: b.category_ids ?? [],
          tier: (b.tier ?? 'standard') as SubscriptionTier,
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
      await supabase
        .from('service_requests')
        .update({ commission_paid: true })
        .eq('business_id', id)
        .eq('status', 'completed')
        .eq('commission_paid', false);
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
      authenticateAdmin,
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
      rescheduleRequest,
      companyProfile,
      updateCompanyProfile,
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
      businessApplication,
      updateApplicationDraft,
      submitApplication,
      approveApplication,
      changeTier,
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
      adminPasscodeVerified,
      isAdminUser,
      authenticateAdmin,
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
      rescheduleRequest,
      companyProfile,
      updateCompanyProfile,
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
      businessApplication,
      updateApplicationDraft,
      submitApplication,
      approveApplication,
      changeTier,
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
