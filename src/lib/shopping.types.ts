// src/lib/shopping.types.ts
// Types för Shopping-funktionalitet

export type ShoppingDocument = {
  id: string;
  title: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  createdBy?: string; // PersonId (för framtida multi-user)
  notes?: string; // Fri text-anteckningar
  groupByCategory?: boolean; // Visa varor grupperade på kategori
  categoryOrder?: string[]; // Ordning för kategorier vid grupperad vy
  items: ShoppingItem[];
};

export type ShoppingItem = {
  id: string;
  text: string;
  checked: boolean;
  quantity?: string; // t.ex. "2 st", "500g"
  category?: string; // t.ex. "Frukt", "Mejeri"
  createdAt: string; // ISO string
  checkedAt?: string; // ISO string - när den markerades som köpt
};

export type Receipt = {
  id: string;
  documentId: string; // Koppling till shopping-dokument
  fileName: string;
  fileUrl: string; // URL till filen (för nu: base64 eller blob URL)
  fileType: string; // "image/jpeg", "image/png", "application/pdf"
  uploadedAt: string; // ISO string
  uploadedBy?: string; // PersonId
  store?: string; // Butiksnamn
  amount?: number; // Belopp
  date?: string; // ISO string - datum på kvittot
};
