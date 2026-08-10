import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ADMIN_BUSINESSES } from '../data/adminBusinesses';
import { ADMIN_PASSCODE } from '../data/adminAuth';
import { DEFAULT_CATEGORIES } from '../data/categories';
import { getTierInfo } from '../data/tiers';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  AdminBusiness,
  BusinessAccount,
  BusinessApplication,
  Category,
  ChatMessage,
  ChatMessageSender,
  CompanyProfile,
  CustomerProfile,
  NotifySignup,
  Review,
  ServiceRequest,
  SubscriptionTier,
  UserMode,
} from '../types';

const STORAGE_KEYS = {
  mode: '@sortedforyou/mode',
  requests: '@sortedforyou/requests',
  companyProfile: '@sortedforyou/companyProfile',
  notifySignups: '@sortedforyou/notifySignups',
  businessApplication: '@sortedforyou/businessApplication',
  categories: '@sortedforyou/categories',
  adminBusinesses: '@sortedforyou/adminBusinesses',
  hasAcceptedLegal: '@sortedforyou/hasAcceptedLegal',
  isAdminAuthenticated: '@sortedforyou/isAdminAuthenticated',
  reviews: '@sortedforyou/reviews',
  messages: '@sortedforyou/messages',
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
  logoutAdmin: () => void;
  reviews: Review[];
  addReview: (requestId: string, companyId: string, rating: number, comment: string) => void;
  messages: ChatMessage[];
  sendMessage: (requestId: string, sender: ChatMessageSender, text: string) => void;
  sendQuote: (requestId: string, amount: number) => void;
  sendImageMessage: (requestId: string, sender: ChatMessageSender, imageUri: string) => void;
  acceptQuote: (requestId: string, amount: number) => void;
  requests: ServiceRequest[];
  addRequest: (input: Omit<ServiceRequest, 'id' | 'createdAt'>) => string;
  updateRequestStatus: (id: string, status: ServiceRequest['status']) => void;
  completeRequest: (id: string, jobValue: number) => void;
  confirmCompletion: (id: string) => void;
  rescheduleRequest: (id: string, newSlot: string) => void;
  companyProfile: CompanyProfile;
  updateCompanyProfile: (profile: CompanyProfile) => void;
  customerProfile: CustomerProfile | null;
  businessAccount: BusinessAccount | null;
  authEmail: string | null;
  authLoading: boolean;
  signUpCustomer: (
    email: string,
    password: string,
    profile: Omit<CustomerProfile, 'email'>
  ) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
  signInCustomer: (email: string, password: string) => Promise<{ error?: string }>;
  signOutCustomer: () => Promise<void>;
  saveCustomerProfile: (profile: CustomerProfile) => Promise<{ error?: string }>;
  signUpBusiness: (
    email: string,
    password: string,
    account: Omit<BusinessAccount, 'email'>
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
  approveAdminApplication: (id: string) => void;
  rejectAdminApplication: (id: string, reason: string) => void;
  suspendBusiness: (id: string) => void;
  reinstateBusiness: (id: string) => void;
  addComplaintFlag: (id: string, note: string) => void;
  markCommissionPaid: (id: string) => void;
  runExpiryCheck: () => number;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [hasAcceptedLegal, setHasAcceptedLegal] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
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
  const [adminBusinesses, setAdminBusinesses] = useState<AdminBusiness[]>(ADMIN_BUSINESSES);

  useEffect(() => {
    (async () => {
      try {
        const [
          storedMode,
          storedRequests,
          storedProfile,
          storedSignups,
          storedApplication,
          storedCategories,
          storedAdminBusinesses,
          storedHasAcceptedLegal,
          storedIsAdminAuthenticated,
          storedReviews,
          storedMessages,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.mode),
          AsyncStorage.getItem(STORAGE_KEYS.requests),
          AsyncStorage.getItem(STORAGE_KEYS.companyProfile),
          AsyncStorage.getItem(STORAGE_KEYS.notifySignups),
          AsyncStorage.getItem(STORAGE_KEYS.businessApplication),
          AsyncStorage.getItem(STORAGE_KEYS.categories),
          AsyncStorage.getItem(STORAGE_KEYS.adminBusinesses),
          AsyncStorage.getItem(STORAGE_KEYS.hasAcceptedLegal),
          AsyncStorage.getItem(STORAGE_KEYS.isAdminAuthenticated),
          AsyncStorage.getItem(STORAGE_KEYS.reviews),
          AsyncStorage.getItem(STORAGE_KEYS.messages),
        ]);
        if (storedMode) setModeState(JSON.parse(storedMode));
        if (storedRequests) setRequests(JSON.parse(storedRequests));
        if (storedProfile) setCompanyProfile(JSON.parse(storedProfile));
        if (storedSignups) setNotifySignups(JSON.parse(storedSignups));
        if (storedApplication) setBusinessApplication(JSON.parse(storedApplication));
        if (storedCategories) setCategories(JSON.parse(storedCategories));
        if (storedAdminBusinesses) setAdminBusinesses(JSON.parse(storedAdminBusinesses));
        if (storedHasAcceptedLegal) setHasAcceptedLegal(JSON.parse(storedHasAcceptedLegal));
        if (storedIsAdminAuthenticated) setIsAdminAuthenticated(JSON.parse(storedIsAdminAuthenticated));
        if (storedReviews) setReviews(JSON.parse(storedReviews));
        if (storedMessages) setMessages(JSON.parse(storedMessages));
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const fetchCustomerProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('customers')
      .select('name, email, phone, address')
      .eq('id', userId)
      .maybeSingle();
    setCustomerProfile(!error && data ? data : null);
  }, []);

  const fetchBusinessAccount = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('businesses')
      .select('name, email, phone')
      .eq('id', userId)
      .maybeSingle();
    setBusinessAccount(!error && data ? data : null);
  }, []);

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
        await Promise.all([fetchCustomerProfile(session.user.id), fetchBusinessAccount(session.user.id)]);
      } else {
        setAuthEmail(null);
        setCustomerProfile(null);
        setBusinessAccount(null);
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
  }, [fetchCustomerProfile, fetchBusinessAccount]);

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
      setIsAdminAuthenticated(true);
      AsyncStorage.setItem(STORAGE_KEYS.isAdminAuthenticated, JSON.stringify(true));
    }
    return success;
  }, []);

  const logoutAdmin = useCallback(() => {
    setIsAdminAuthenticated(false);
    AsyncStorage.setItem(STORAGE_KEYS.isAdminAuthenticated, JSON.stringify(false));
    setModeState(null);
    AsyncStorage.setItem(STORAGE_KEYS.mode, JSON.stringify(null));
  }, []);

  const addRequest = useCallback((input: Omit<ServiceRequest, 'id' | 'createdAt'>) => {
    const id = `req-${Date.now()}-${Math.round(Math.random() * 10000)}`;
    setRequests((prev) => {
      const next: ServiceRequest[] = [
        { ...input, id, createdAt: new Date().toISOString() },
        ...prev,
      ];
      AsyncStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(next));
      return next;
    });
    return id;
  }, []);

  const updateRequestStatus = useCallback((id: string, status: ServiceRequest['status']) => {
    setRequests((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, status } : r));
      AsyncStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(next));
      return next;
    });
  }, []);

  const completeRequest = useCallback(
    (id: string, jobValue: number) => {
      const rate = getTierInfo(businessApplication.tier ?? 'standard').commissionRate;
      const commission = Math.round(jobValue * rate * 100) / 100;
      setRequests((prev) => {
        const next = prev.map((r) =>
          r.id === id ? { ...r, status: 'completed' as const, jobValue, commission, customerConfirmed: false } : r
        );
        AsyncStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(next));
        return next;
      });
    },
    [businessApplication.tier]
  );

  const confirmCompletion = useCallback((id: string) => {
    setRequests((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, customerConfirmed: true } : r));
      AsyncStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(next));
      return next;
    });
  }, []);

  const rescheduleRequest = useCallback((id: string, newSlot: string) => {
    setRequests((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, scheduledSlot: newSlot } : r));
      AsyncStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(next));
      return next;
    });
  }, []);

  const addReview = useCallback((requestId: string, companyId: string, rating: number, comment: string) => {
    setReviews((prev) => {
      const next: Review[] = [
        ...prev,
        { id: `review-${Date.now()}`, requestId, companyId, rating, comment, createdAt: new Date().toISOString() },
      ];
      AsyncStorage.setItem(STORAGE_KEYS.reviews, JSON.stringify(next));
      return next;
    });
  }, []);

  const persistMessages = useCallback((next: ChatMessage[]) => {
    setMessages(next);
    AsyncStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(next));
  }, []);

  const sendMessage = useCallback(
    (requestId: string, sender: ChatMessageSender, text: string) => {
      const next: ChatMessage = {
        id: `msg-${Date.now()}-${Math.round(Math.random() * 10000)}`,
        requestId,
        sender,
        kind: 'text',
        text,
        createdAt: new Date().toISOString(),
      };
      persistMessages([...messages, next]);
    },
    [messages, persistMessages]
  );

  const sendQuote = useCallback(
    (requestId: string, amount: number) => {
      const next: ChatMessage = {
        id: `msg-${Date.now()}-${Math.round(Math.random() * 10000)}`,
        requestId,
        sender: 'business',
        kind: 'quote',
        amount,
        createdAt: new Date().toISOString(),
      };
      persistMessages([...messages, next]);
    },
    [messages, persistMessages]
  );

  const sendImageMessage = useCallback(
    (requestId: string, sender: ChatMessageSender, imageUri: string) => {
      const next: ChatMessage = {
        id: `msg-${Date.now()}-${Math.round(Math.random() * 10000)}`,
        requestId,
        sender,
        kind: 'image',
        imageUri,
        createdAt: new Date().toISOString(),
      };
      persistMessages([...messages, next]);
    },
    [messages, persistMessages]
  );

  const acceptQuote = useCallback((requestId: string, amount: number) => {
    setRequests((prev) => {
      const next = prev.map((r) => (r.id === requestId ? { ...r, quotedAmount: amount, quoteAccepted: true } : r));
      AsyncStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateCompanyProfile = useCallback((profile: CompanyProfile) => {
    setCompanyProfile(profile);
    AsyncStorage.setItem(STORAGE_KEYS.companyProfile, JSON.stringify(profile));
  }, []);

  const signUpCustomer = useCallback(
    async (email: string, password: string, profile: Omit<CustomerProfile, 'email'>) => {
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        // Already logged in (e.g. as a business) — add a customer profile to the same account.
        const userId = existing.session.user.id;
        const sessionEmail = existing.session.user.email ?? email;
        const { error: insertError } = await supabase
          .from('customers')
          .insert({ id: userId, email: sessionEmail, ...profile });
        if (insertError) return { error: insertError.message };
        setCustomerProfile({ email: sessionEmail, ...profile });
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
      setCustomerProfile({ email, ...profile });
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

  const applyBusinessAccount = useCallback((email: string, account: Omit<BusinessAccount, 'email'>) => {
    setBusinessAccount({ email, ...account });
    setBusinessApplication((prev) => {
      const next: BusinessApplication = {
        ...prev,
        businessName: prev.businessName || account.name,
        contactEmail: prev.contactEmail || email,
        contactPhone: prev.contactPhone || account.phone,
      };
      AsyncStorage.setItem(STORAGE_KEYS.businessApplication, JSON.stringify(next));
      return next;
    });
  }, []);

  const signUpBusiness = useCallback(
    async (email: string, password: string, account: Omit<BusinessAccount, 'email'>) => {
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        // Already logged in (e.g. as a customer) — add a business profile to the same account.
        const userId = existing.session.user.id;
        const sessionEmail = existing.session.user.email ?? email;
        const { error: insertError } = await supabase
          .from('businesses')
          .insert({ id: userId, email: sessionEmail, ...account });
        if (insertError) return { error: insertError.message };
        applyBusinessAccount(sessionEmail, account);
        return {};
      }
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };
      if (!data.session) {
        return { needsEmailConfirmation: true };
      }
      const { error: insertError } = await supabase
        .from('businesses')
        .insert({ id: data.session.user.id, email, ...account });
      if (insertError) return { error: insertError.message };
      applyBusinessAccount(email, account);
      return {};
    },
    [applyBusinessAccount]
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
    setCompanyProfile((prev) => {
      const next: CompanyProfile = {
        ...prev,
        name: businessApplication.businessName || prev.name,
        categoryIds: businessApplication.categoryIds.length > 0 ? businessApplication.categoryIds : prev.categoryIds,
        phone: businessApplication.contactPhone || prev.phone,
      };
      AsyncStorage.setItem(STORAGE_KEYS.companyProfile, JSON.stringify(next));
      return next;
    });
  }, [businessApplication.businessName, businessApplication.categoryIds, businessApplication.contactPhone]);

  const changeTier = useCallback((tier: SubscriptionTier) => {
    setBusinessApplication((prev) => {
      const next: BusinessApplication = { ...prev, tier };
      AsyncStorage.setItem(STORAGE_KEYS.businessApplication, JSON.stringify(next));
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

  const persistAdminBusinesses = useCallback((next: AdminBusiness[]) => {
    setAdminBusinesses(next);
    AsyncStorage.setItem(STORAGE_KEYS.adminBusinesses, JSON.stringify(next));
  }, []);

  const approveAdminApplication = useCallback(
    (id: string) => {
      persistAdminBusinesses(
        adminBusinesses.map((b) => (b.id === id ? { ...b, applicationStatus: 'approved', businessStatus: 'active' } : b))
      );
    },
    [adminBusinesses, persistAdminBusinesses]
  );

  const rejectAdminApplication = useCallback(
    (id: string, reason: string) => {
      persistAdminBusinesses(
        adminBusinesses.map((b) => (b.id === id ? { ...b, applicationStatus: 'rejected', rejectionReason: reason } : b))
      );
    },
    [adminBusinesses, persistAdminBusinesses]
  );

  const suspendBusiness = useCallback(
    (id: string) => {
      persistAdminBusinesses(adminBusinesses.map((b) => (b.id === id ? { ...b, businessStatus: 'suspended' } : b)));
    },
    [adminBusinesses, persistAdminBusinesses]
  );

  const reinstateBusiness = useCallback(
    (id: string) => {
      persistAdminBusinesses(adminBusinesses.map((b) => (b.id === id ? { ...b, businessStatus: 'active' } : b)));
    },
    [adminBusinesses, persistAdminBusinesses]
  );

  const addComplaintFlag = useCallback(
    (id: string, note: string) => {
      persistAdminBusinesses(
        adminBusinesses.map((b) =>
          b.id === id
            ? { ...b, flags: [...b.flags, { id: `flag-${Date.now()}`, note, createdAt: new Date().toISOString() }] }
            : b
        )
      );
    },
    [adminBusinesses, persistAdminBusinesses]
  );

  const markCommissionPaid = useCallback(
    (id: string) => {
      persistAdminBusinesses(
        adminBusinesses.map((b) =>
          b.id === id ? { ...b, commissionPaid: b.commissionPaid + b.commissionOwed, commissionOwed: 0 } : b
        )
      );
    },
    [adminBusinesses, persistAdminBusinesses]
  );

  const runExpiryCheck = useCallback(() => {
    const today = new Date();
    let suspendedCount = 0;
    const next = adminBusinesses.map((b) => {
      const insurance = b.documents.find((d) => d.id === 'insurance');
      if (!insurance?.expiryDate) return b;
      const [day, month, year] = insurance.expiryDate.split('/').map(Number);
      const expiry = new Date(year, (month || 1) - 1, day || 1);
      if (expiry < today && b.businessStatus === 'active') {
        suspendedCount += 1;
        return {
          ...b,
          businessStatus: 'suspended' as const,
          flags: [
            ...b.flags,
            { id: `flag-${Date.now()}-${b.id}`, note: 'Auto-suspended — public liability insurance expired.', createdAt: new Date().toISOString() },
          ],
        };
      }
      return b;
    });
    persistAdminBusinesses(next);
    return suspendedCount;
  }, [adminBusinesses, persistAdminBusinesses]);

  const value = useMemo(
    () => ({
      isReady,
      hasAcceptedLegal,
      acceptLegal,
      mode,
      setMode,
      isAdminAuthenticated,
      authenticateAdmin,
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
      approveAdminApplication,
      rejectAdminApplication,
      suspendBusiness,
      reinstateBusiness,
      addComplaintFlag,
      markCommissionPaid,
      runExpiryCheck,
    }),
    [
      isReady,
      hasAcceptedLegal,
      acceptLegal,
      mode,
      setMode,
      isAdminAuthenticated,
      authenticateAdmin,
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
      approveAdminApplication,
      rejectAdminApplication,
      suspendBusiness,
      reinstateBusiness,
      addComplaintFlag,
      markCommissionPaid,
      runExpiryCheck,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
