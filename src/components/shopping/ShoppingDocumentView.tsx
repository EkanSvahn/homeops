"use client";

import { useMemo, useState } from "react";
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
  const CATEGORY_OPTIONS = useMemo(
    () => [
      "Frukt & Grönt",
      "Mejeri",
      "Kött & Fisk",
      "Bröd & Bageri",
      "Frys",
      "Skafferi",
      "Dryck",
      "Snacks",
      "Hushåll",
      "Övrigt",
    ],
    []
  );

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(document.title);
  const [newItemText, setNewItemText] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [activeTab, setActiveTab] = useState<"items" | "notes">("items");
  const [notes, setNotes] = useState(document.notes || "");

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

  const handleBulkAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const now = new Date().toISOString();
    const newItems: ShoppingItem[] = lines.map((line, index) => ({
      id: `item-${Date.now()}-${index}`,
      text: line,
      checked: false,
      createdAt: now,
    }));

    onUpdate({
      ...document,
      items: [...document.items, ...newItems],
      updatedAt: now,
    });
    setBulkText("");
    setShowBulk(false);
  };

  const handleUpdateItem = (itemId: string, updates: Partial<ShoppingItem>) => {
    onUpdate({
      ...document,
      items: document.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...updates,
              checkedAt:
                typeof updates.checked === "boolean"
                  ? updates.checked
                    ? new Date().toISOString()
                    : undefined
                  : item.checkedAt,
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

  const uncheckedByCategory = useMemo(() => {
    if (!document.groupByCategory) return [];

    const groups = CATEGORY_OPTIONS.map((category) => ({
      category,
      items: uncheckedItems.filter((item) => item.category === category),
    }));

    const uncategorized = uncheckedItems.filter((item) => !item.category);
    return [...groups, { category: "Okategoriserat", items: uncategorized }];
  }, [CATEGORY_OPTIONS, document.groupByCategory, uncheckedItems]);

  const handleToggleGroup = () => {
    onUpdate({
      ...document,
      groupByCategory: !document.groupByCategory,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveNotes = () => {
    onUpdate({
      ...document,
      notes: notes.trim(),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSendNotesToItems = () => {
    if (!notes.trim()) return;
    setActiveTab("items");
    setShowBulk(true);
    setBulkText(notes.trim());
  };

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
          onClick={onDelete}
          className="rounded-full p-2 hover:bg-red-50 text-red-600 active:scale-95 transition-all"
          aria-label="Ta bort"
        >
          🗑️
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 grid grid-cols-2 rounded-xl border bg-white p-1 shadow-sm">
        {(["items", "notes"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
              activeTab === tab
                ? "bg-black text-white shadow-sm"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {tab === "items" ? "Varor" : "Anteckningar"}
          </button>
        ))}
      </div>

      {activeTab === "items" ? (
        <>
          {/* Add item form */}
          <div className="mb-4 space-y-2">
            <form onSubmit={handleAddItem}>
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

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulk(!showBulk)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.99] transition-all"
              >
                {showBulk ? "Stäng klistra in" : "Klistra in flera"}
              </button>
              <button
                onClick={handleToggleGroup}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  document.groupByCategory
                    ? "bg-black text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {document.groupByCategory ? "Visa utan grupper" : "Gruppera efter kategori"}
              </button>
            </div>

            {showBulk && (
              <form
                onSubmit={handleBulkAdd}
                className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 space-y-2"
              >
                <label className="text-xs font-semibold text-slate-600">
                  Klistra in flera rader (en vara per rad)
                </label>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                  placeholder={`mjölk\nbananer\npasta 500g`}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkText("");
                      setShowBulk(false);
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.99] transition-all"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 active:scale-[0.99] transition-all"
                  >
                    Lägg till varor
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Items list */}
          <div className="space-y-2 rounded-2xl border bg-white p-2 shadow-sm">
            {uncheckedItems.length === 0 && checkedItems.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Inga varor ännu. Lägg till din första vara ovan!
              </div>
            ) : (
              <>
                {document.groupByCategory
                  ? uncheckedByCategory.map(({ category, items }) =>
                      items.length === 0 ? null : (
                        <div key={category} className="space-y-1 px-1 pb-2">
                          <div className="px-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            {category}
                          </div>
                          {items.map((item) => (
                            <ShoppingItemRow
                              key={item.id}
                              item={item}
                              categories={CATEGORY_OPTIONS}
                              onUpdate={(updates) => handleUpdateItem(item.id, updates)}
                              onDelete={() => handleDeleteItem(item.id)}
                            />
                          ))}
                        </div>
                      )
                    )
                  : uncheckedItems.map((item) => (
                      <ShoppingItemRow
                        key={item.id}
                        item={item}
                        categories={CATEGORY_OPTIONS}
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
                        categories={CATEGORY_OPTIONS}
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
        </>
      ) : (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Anteckningar</h2>
            <div className="flex gap-2">
              <button
                onClick={handleSendNotesToItems}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.99] transition-all"
              >
                Lägg till i listan
              </button>
              <button
                onClick={handleSaveNotes}
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 active:scale-[0.99] transition-all"
              >
                Spara
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-2">
            Fri text för recept, förberedelser eller idéer. Du kan klistra in flera rader här och
            sedan konvertera dem till varor via “Klistra in flera”.
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={10}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            placeholder="Skriv dina anteckningar här..."
          />
        </div>
      )}
    </div>
  );
}
