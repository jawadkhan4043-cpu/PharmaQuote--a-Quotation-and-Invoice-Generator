import type { WorkspaceData } from "./types";

export const STORAGE_KEY = "pharmaquote-workspace-v1";

export const starterData: WorkspaceData = {
  catalog: [
    {
      id: "med-001",
      name: "Paracetamol 500 mg tablets",
      sku: "MED-PCM-500",
      pack: "Box of 100",
      category: "Medicine",
      unitPrice: 480,
    },
    {
      id: "med-002",
      name: "Metformin 500 mg tablets",
      sku: "MED-MET-500",
      pack: "Box of 100",
      category: "Medicine",
      unitPrice: 1250,
    },
    {
      id: "med-003",
      name: "Amoxicillin 500 mg capsules",
      sku: "MED-AMX-500",
      pack: "Box of 100",
      category: "Medicine",
      unitPrice: 2200,
    },
    {
      id: "sup-004",
      name: "Normal saline 0.9% 500 mL",
      sku: "SUP-NS-500",
      pack: "Single bottle",
      category: "IV fluid",
      unitPrice: 180,
    },
    {
      id: "sup-005",
      name: "Nitrile examination gloves",
      sku: "SUP-GLV-100",
      pack: "Box of 100",
      category: "Consumable",
      unitPrice: 1850,
    },
    {
      id: "med-006",
      name: "Cetirizine 10 mg tablets",
      sku: "MED-CET-010",
      pack: "Box of 30",
      category: "Medicine",
      unitPrice: 690,
    },
  ],
  documents: [],
  settings: {
    companyName: "Northstar Medical Supply",
    contact: "+92 300 000 0000",
    email: "sales@example.com",
    address: "Commercial workspace · Demo address",
    currency: "PKR",
    defaultTaxRate: 5,
  },
  numbering: {
    Quotation: 1,
    Invoice: 1,
  },
};
