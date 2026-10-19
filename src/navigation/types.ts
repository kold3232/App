// prefillFromRequestId threads a job the customer already described through
// the browse flow, so "try another business" does not make them type it twice.
// It carries the request id rather than the text itself: the screen that needs
// it reads the request out of context, and nothing long travels in a route.
export type BrowseStackParamList = {
  CategoryList: undefined;
  CategoryGroup: { groupId: import('../types').CategoryGroupId };
  CompanyList: { categoryId: string; prefillFromRequestId?: string };
  CompanyDetail: { companyId: string; prefillFromRequestId?: string };
  RequestQuote: { companyId: string; prefillFromRequestId?: string };
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
  Calendar: undefined;
  Earnings: undefined;
  MyListing: undefined;
  Settings: undefined;
};

export type EmployeeStackParamList = {
  EmployeeJobs: undefined;
};

export type CompanyStackParamList = {
  CompanyTabs: undefined;
  ListingEditor: { listingId?: string } | undefined;
  Team: undefined;
  Verification: undefined;
  Payments: undefined;
};

export type AdminTabParamList = {
  Queue: undefined;
  Businesses: undefined;
  Cases: undefined;
  Categories: undefined;
  Insights: undefined;
};

export type AdminBusinessesStackParamList = {
  BusinessesList: undefined;
  BusinessDetail: { businessId: string };
};
