import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  BusinessApplication,
  CompanyProfile,
  NotifySignup,
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
};

type AppContextValue = {
  isReady: boolean;
  mode: UserMode | null;
  setMode: (mode: UserMode | null) => void;
  requests: ServiceRequest[];
  addRequest: (input: Omit<ServiceRequest, 'id' | 'createdAt'>) => void;
  updateRequestStatus: (id: string, status: ServiceRequest['status']) => void;
  companyProfile: CompanyProfile;
  updateCompanyProfile: (profile: CompanyProfile) => void;
  notifySignups: NotifySignup[];
  addNotifySignup: (categoryId: string, contact: string) => void;
  businessApplication: BusinessApplication;
  updateApplicationDraft: (patch: Partial<BusinessApplication>) => void;
  submitApplication: () => void;
  approveApplication: () => void;
  changeTier: (tier: SubscriptionTier) => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [mode, setModeState] = useState<UserMode | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(DEFAULT_COMPANY_PROFILE);
  const [notifySignups, setNotifySignups] = useState<NotifySignup[]>([]);
  const [businessApplication, setBusinessApplication] = useState<BusinessApplication>(DEFAULT_BUSINESS_APPLICATION);

  useEffect(() => {
    (async () => {
      try {
        const [storedMode, storedRequests, storedProfile, storedSignups, storedApplication] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.mode),
          AsyncStorage.getItem(STORAGE_KEYS.requests),
          AsyncStorage.getItem(STORAGE_KEYS.companyProfile),
          AsyncStorage.getItem(STORAGE_KEYS.notifySignups),
          AsyncStorage.getItem(STORAGE_KEYS.businessApplication),
        ]);
        if (storedMode) setModeState(JSON.parse(storedMode));
        if (storedRequests) setRequests(JSON.parse(storedRequests));
        if (storedProfile) setCompanyProfile(JSON.parse(storedProfile));
        if (storedSignups) setNotifySignups(JSON.parse(storedSignups));
        if (storedApplication) setBusinessApplication(JSON.parse(storedApplication));
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const setMode = useCallback((next: UserMode | null) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEYS.mode, JSON.stringify(next));
  }, []);

  const addRequest = useCallback((input: Omit<ServiceRequest, 'id' | 'createdAt'>) => {
    setRequests((prev) => {
      const next: ServiceRequest[] = [
        {
          ...input,
          id: `req-${Date.now()}-${Math.round(Math.random() * 10000)}`,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ];
      AsyncStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateRequestStatus = useCallback((id: string, status: ServiceRequest['status']) => {
    setRequests((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, status } : r));
      AsyncStorage.setItem(STORAGE_KEYS.requests, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateCompanyProfile = useCallback((profile: CompanyProfile) => {
    setCompanyProfile(profile);
    AsyncStorage.setItem(STORAGE_KEYS.companyProfile, JSON.stringify(profile));
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

  const value = useMemo(
    () => ({
      isReady,
      mode,
      setMode,
      requests,
      addRequest,
      updateRequestStatus,
      companyProfile,
      updateCompanyProfile,
      notifySignups,
      addNotifySignup,
      businessApplication,
      updateApplicationDraft,
      submitApplication,
      approveApplication,
      changeTier,
    }),
    [
      isReady,
      mode,
      setMode,
      requests,
      addRequest,
      updateRequestStatus,
      companyProfile,
      updateCompanyProfile,
      notifySignups,
      addNotifySignup,
      businessApplication,
      updateApplicationDraft,
      submitApplication,
      approveApplication,
      changeTier,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
