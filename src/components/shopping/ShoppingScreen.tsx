"use client";

import { useState, useEffect, useRef } from "react";
import type { ShoppingDocument } from "@/lib/shopping.types";
import {
  loadShoppingDocumentsFromStorage,
  saveShoppingDocumentsToStorage,
  deleteReceiptsForDocument,
} from "@/lib/storage";
import { ShoppingDocumentList } from "./ShoppingDocumentList";
import { ShoppingDocumentView } from "./ShoppingDocumentView";

export default function ShoppingScreen() {
  const [documents, setDocuments] = useState<ShoppingDocument[]>(
    () => loadShoppingDocumentsFromStorage() || []
  );
  const [selectedDocument, setSelectedDocument] = useState<ShoppingDocument | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const hasMountedRef = useRef(false);

  // Spara när documents ändras
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    saveShoppingDocumentsToStorage(documents);
  }, [documents]);

  const handleCreateDocument = (title: string) => {
    const newDoc: ShoppingDocument = {
      id: `doc-${Date.now()}`,
      title: title.trim() || "Ny lista",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [],
    };
    setDocuments([...documents, newDoc]);
    setSelectedDocument(newDoc);
    setIsCreating(false);
  };

  const handleUpdateDocument = (updated: ShoppingDocument) => {
    setDocuments(documents.map((d) => (d.id === updated.id ? updated : d)));
    setSelectedDocument(updated);
  };

  const handleDeleteDocument = (id: string) => {
    if (confirm("Är du säker på att du vill ta bort denna lista?")) {
      setDocuments(documents.filter((d) => d.id !== id));
      deleteReceiptsForDocument(id);
      if (selectedDocument?.id === id) {
        setSelectedDocument(null);
      }
    }
  };

  if (selectedDocument) {
    return (
      <ShoppingDocumentView
        document={selectedDocument}
        onBack={() => setSelectedDocument(null)}
        onUpdate={handleUpdateDocument}
        onDelete={() => handleDeleteDocument(selectedDocument.id)}
      />
    );
  }

  return (
    <ShoppingDocumentList
      documents={documents}
      onCreateDocument={handleCreateDocument}
      onSelectDocument={setSelectedDocument}
      onDeleteDocument={handleDeleteDocument}
      isCreating={isCreating}
      onStartCreate={() => setIsCreating(true)}
      onCancelCreate={() => setIsCreating(false)}
    />
  );
}
