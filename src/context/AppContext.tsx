import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CompanyProfile, ServiceRequest, UserMode } from '../types';

const STORAGE_KEYS = {
  mode: '@lightningservice/mode',
  requests: '@lightningservice/requests',
  companyProfile: '@lightningservice/companyProfile',
};

const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  name: 'My Business',
  categoryIds: ['plumbing'],
  tagline: 'Tell customers what you do best',
  description: 'Add a description of your business so customers know what to expect.',
  areas: ['Ocean Village'],
  phone: '+350 200 00000',
  priceRange: '££',
  services: ['Add your first service'],
};

type AppContextValue = {
  isReady: boolean;
  mode: UserMode | null;
  setMode: (mode: UserMode | null) => void;
  requests: ServiceRequest[];
  addRequest: (input: Omit<ServiceRequest, 'id' | 'status' | 'createdAt'>) => void;
  updateRequestStatus: (id: string, status: ServiceRequest['status']) => void;
  companyProfile: CompanyProfile;
  updateCompanyProfile: (profile: CompanyProfile) => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [mode, setModeState] = useState<UserMode | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(DEFAULT_COMPANY_PROFILE);

  useEffect(() => {
    (async () => {
      try {
        const [storedMode, storedRequests, storedProfile] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.mode),
          AsyncStorage.getItem(STORAGE_KEYS.requests),
          AsyncStorage.getItem(STORAGE_KEYS.companyProfile),
        ]);
        if (storedMode) setModeState(JSON.parse(storedMode));
        if (storedRequests) setRequests(JSON.parse(storedRequests));
        if (storedProfile) setCompanyProfile(JSON.parse(storedProfile));
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const setMode = useCallback((next: UserMode | null) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEYS.mode, JSON.stringify(next));
  }, []);

  const addRequest = useCallback((input: Omit<ServiceRequest, 'id' | 'status' | 'createdAt'>) => {
    setRequests((prev) => {
      const next: ServiceRequest[] = [
        {
          ...input,
          id: `req-${Date.now()}-${Math.round(Math.random() * 10000)}`,
          status: 'pending',
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
    }),
    [isReady, mode, setMode, requests, addRequest, updateRequestStatus, companyProfile, updateCompanyProfile]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
