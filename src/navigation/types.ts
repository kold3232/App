export type BrowseStackParamList = {
  CategoryList: undefined;
  CompanyList: { categoryId: string };
  CompanyDetail: { companyId: string };
  RequestQuote: { companyId: string };
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
