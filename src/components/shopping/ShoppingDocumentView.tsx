"use client";

import { useState } from "react";
import type { ShoppingDocument, ShoppingItem } from "@/lib/shopping.types";
import { ShoppingItemRow } from "./ShoppingItemRow";
import { ReceiptSection } from "./ReceiptSection";

type ShoppingDocumentViewProps = {
  document: ShoppingDocument;
  onBack: () => void;
  onUpdate: (doc: ShoppingDocument) => void;
  onDelete: () => void;
};

export function ShoppingDocumentView({
  document,
  onBack,
  onUpdate,
  onDelete,
}: ShoppingDocumentViewProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(document.title);
  const [newItemText, setNewItemText] = useState("");

  const handleUpdateTitle = () => {
    if (title.trim()) {
      onUpdate({
        ...document,
        title: title.trim(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      setTitle(document.title);
    }
    setIsEditingTitle(false);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;

    const newItem: ShoppingItem = {
      id: `item-${Date.now()}`,
      text: newItemText.trim(),
      checked: false,
      createdAt: new Date().toISOString(),
    };

    onUpdate({
      ...document,
      items: [...document.items, newItem],
      updatedAt: new Date().toISOString(),
    });
    setNewItemText("");
  };

  const handleUpdateItem = (itemId: string, updates: Partial<ShoppingItem>) => {
    onUpdate({
      ...document,
      items: document.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...updates,
              checkedAt: updates.checked ? new Date().toISOString() : undefined,
            }
          : item
      ),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteItem = (itemId: string) => {
    onUpdate({
      ...document,
      items: document.items.filter((item) => item.id !== itemId),
      updatedAt: new Date().toISOString(),
    });
  };

  const checkedItems = document.items.filter((i) => i.checked);
  const uncheckedItems = document.items.filter((i) => !i.checked);

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-32 pt-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-full p-2 hover:bg-slate-100 active:scale-95 transition-all"
          aria-label="Tillbaka"
        >
          ←
        </button>
        {isEditingTitle ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateTitle();
            }}
            className="flex-1"
          >
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleUpdateTitle}
              className="w-full rounded-xl border-2 border-black bg-white px-4 py-2 text-base font-semibold focus:outline-none"
              autoFocus
            />
          </form>
        ) : (
          <h1
            onClick={() => setIsEditingTitle(true)}
            className="flex-1 text-2xl font-semibold tracking-tight cursor-pointer hover:opacity-70 transition-opacity"
          >
            {document.title}
          </h1>
        )}
        <button
          onClick={() => {
            if (confirm("Är du säker på att du vill ta bort denna lista?")) {
              onDelete();
            }
          }}
          className="rounded-full p-2 hover:bg-red-50 text-red-600 active:scale-95 transition-all"
          aria-label="Ta bort"
        >
          🗑️
        </button>
      </div>

      {/* Add item form */}
      <form onSubmit={handleAddItem} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Lägg till vara..."
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20"
            autoComplete="off"
          />
          <button
            type="submit"
            className="rounded-xl bg-black px-6 py-3 text-base font-semibold text-white hover:bg-slate-800 active:scale-[0.99] transition-all"
          >
            Lägg till
          </button>
        </div>
      </form>

      {/* Items list */}
      <div className="space-y-2 rounded-2xl border bg-white p-2 shadow-sm">
        {uncheckedItems.length === 0 && checkedItems.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Inga varor ännu. Lägg till din första vara ovan!
          </div>
        ) : (
          <>
            {uncheckedItems.map((item) => (
              <ShoppingItemRow
                key={item.id}
                item={item}
                onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                onDelete={() => handleDeleteItem(item.id)}
              />
            ))}
            {checkedItems.length > 0 && (
              <>
                <div className="border-t my-2"></div>
                <div className="px-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Klart ({checkedItems.length})
                </div>
                {checkedItems.map((item) => (
                  <ShoppingItemRow
                    key={item.id}
                    item={item}
                    onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                    onDelete={() => handleDeleteItem(item.id)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Receipts section */}
      <ReceiptSection documentId={document.id} />
    </div>
  );
}

