export type BrowseStackParamList = {
  CategoryList: undefined;
  CategoryGroup: { groupId: import('../types').CategoryGroupId };
  CompanyList: { categoryId: string };
  CompanyDetail: { companyId: string };
  RequestQuote: { companyId: string };
  InstantBook: { companyId: string };
  ComingSoon: { categoryId: string };
};

export type CustomerTabParamList = {
  Browse: undefined;
  MyRequests: { openRequestId?: string } | undefined;
  Profile: undefined;
};

export type CompanyTabParamList = {
  Dashboard: undefined;
  Invoices: undefined;
  MyListing: undefined;
  Settings: undefined;
};

export type CompanyStackParamList = {
  CompanyTabs: undefined;
  ListingEditor: { listingId?: string } | undefined;
};

export type AdminTabParamList = {
  Queue: undefined;
  Businesses: undefined;
  Categories: undefined;
  Insights: undefined;
};

export type AdminBusinessesStackParamList = {
  BusinessesList: undefined;
  BusinessDetail: { businessId: string };
};
