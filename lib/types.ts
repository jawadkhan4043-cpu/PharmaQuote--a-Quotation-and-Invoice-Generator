export type DocumentKind = "Quotation" | "Invoice";
export type AppScreen = "Builder" | "Catalog" | "History" | "Settings";
export type CurrencyCode = "PKR" | "INR" | "USD" | "EUR";

export interface CatalogItem {
  id: string;
  name: string;
  sku: string;
  pack: string;
  category: string;
  unitPrice: number;
}

export interface QuoteLine {
  id: string;
  catalogItemId: string;
  name: string;
  sku: string;
  pack: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

export interface CustomerDetails {
  name: string;
  contact: string;
  email: string;
  address: string;
}

export interface QuoteDocument {
  id: string;
  number: string;
  kind: DocumentKind;
  currency: CurrencyCode;
  customer: CustomerDetails;
  issueDate: string;
  dueDate: string;
  reference: string;
  taxRate: number;
  notes: string;
  lines: QuoteLine[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSettings {
  companyName: string;
  contact: string;
  email: string;
  address: string;
  currency: CurrencyCode;
  defaultTaxRate: number;
}

export interface Numbering {
  Quotation: number;
  Invoice: number;
}

export interface WorkspaceData {
  catalog: CatalogItem[];
  documents: QuoteDocument[];
  settings: WorkspaceSettings;
  numbering: Numbering;
}
