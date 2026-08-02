export type BrowseStackParamList = {
  CategoryList: undefined;
  CompanyList: { categoryId: string };
  CompanyDetail: { companyId: string };
  RequestQuote: { companyId: string };
  InstantBook: { companyId: string };
  ComingSoon: { categoryId: string };
};

export type CustomerTabParamList = {
  Browse: undefined;
  MyRequests: undefined;
  Profile: undefined;
};

export type CompanyTabParamList = {
  Dashboard: undefined;
  MyListing: undefined;
  Settings: undefined;
};

export type TierSelectionMode = 'signup' | 'change';

export type CompanyStackParamList = {
  BusinessSignup: undefined;
  DocumentUpload: undefined;
  TierSelection: { mode: TierSelectionMode };
  Payment: { mode: TierSelectionMode; tier: import('../types').SubscriptionTier };
  ApplicationStatus: undefined;
  CompanyTabs: undefined;
};
