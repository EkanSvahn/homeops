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
  const CATEGORY_KEYWORDS: Record<string, string[]> = {
    "Frukt & Grönt": ["äpp", "banan", "tomat", "gurka", "potatis", "lök", "paprika", "sallad", "morot", "citron", "lime", "apelsin"],
    Mejeri: ["mjölk", "yoghurt", "ost", "smör", "grädde", "kvarg", "creme fraiche", "fil"],
    "Kött & Fisk": ["kyckling", "köttfärs", "biff", "fläsk", "bacon", "lax", "fisk", "räkor", "korv"],
    "Bröd & Bageri": ["bröd", "tortilla", "baguette", "fralla", "pitabröd"],
    Frys: ["fryst", "frysta", "glass", "frys"],
    Skafferi: ["pasta", "ris", "krossade", "tomat", "bönor", "linser", "krydda", "mjöl", "socker", "havre", "gryn", "knäckebröd"],
    Dryck: ["läsk", "juice", "cola", "fanta", "vatten", "öl", "vin", "kaffe", "te"],
    Snacks: ["chips", "godis", "choklad", "nöt", "kakor", "dipp"],
    Hushåll: ["tvätt", "disk", "toapapper", "hushållspapper", "tvål", "schampo", "sopsäck", "folie", "film"],
  };

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(document.title);
  const [newItemText, setNewItemText] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [activeTab, setActiveTab] = useState<"items" | "notes">("items");
  const [notes, setNotes] = useState(document.notes || "");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [categoryOrderEditing, setCategoryOrderEditing] = useState(false);
  const [categoryDragging, setCategoryDragging] = useState<string | null>(null);
  const [categoryDragOver, setCategoryDragOver] = useState<string | null>(null);

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
    const newItems: ShoppingItem[] = lines.map((line, index) => {
      const parsed = parseLineToItem(line, CATEGORY_KEYWORDS, CATEGORY_OPTIONS);
      return {
        id: `item-${Date.now()}-${index}`,
        text: parsed.text,
        quantity: parsed.quantity,
        category: parsed.category,
        checked: false,
        createdAt: now,
      };
    });

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

  const activeCategories =
    document.categoryOrder && document.categoryOrder.length > 0
      ? dedupeCategories(document.categoryOrder, CATEGORY_OPTIONS)
      : CATEGORY_OPTIONS;

  const uncheckedByCategory = useMemo(() => {
    if (!document.groupByCategory) return [];

    const groups = activeCategories.map((category) => ({
      category,
      items: uncheckedItems.filter((item) => item.category === category),
    }));

    const uncategorized = uncheckedItems.filter((item) => !item.category);
    return [...groups, { category: "Okategoriserat", items: uncategorized }];
  }, [activeCategories, document.groupByCategory, uncheckedItems]);

  const canDragItems = !document.groupByCategory && uncheckedItems.length > 1;

  const handleToggleGroup = () => {
    onUpdate({
      ...document,
      groupByCategory: !document.groupByCategory,
      categoryOrder:
        document.categoryOrder && document.categoryOrder.length > 0
          ? document.categoryOrder
          : CATEGORY_OPTIONS,
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

  const handleReorderItems = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const ids = document.items.map((i) => i.id);
    const fromIndex = ids.indexOf(fromId);
    const toIndex = ids.indexOf(toId);
    if (fromIndex === -1 || toIndex === -1) return;
    const reordered = [...document.items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onUpdate({
      ...document,
      items: reordered,
      updatedAt: new Date().toISOString(),
    });
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleReorderCategories = (from: string, to: string) => {
    if (from === to) return;
    const current =
      document.categoryOrder && document.categoryOrder.length > 0
        ? dedupeCategories(document.categoryOrder, CATEGORY_OPTIONS)
        : CATEGORY_OPTIONS;
    const fromIndex = current.indexOf(from);
    const toIndex = current.indexOf(to);
    if (fromIndex === -1 || toIndex === -1) return;
    const updated = [...current];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onUpdate({
      ...document,
      categoryOrder: updated,
      updatedAt: new Date().toISOString(),
    });
    setCategoryDragging(null);
    setCategoryDragOver(null);
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
              {document.groupByCategory && (
                <button
                  onClick={() => setCategoryOrderEditing(!categoryOrderEditing)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.99] transition-all"
                >
                  {categoryOrderEditing ? "Klar" : "Ordna kategorier"}
                </button>
              )}
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

            {categoryOrderEditing && document.groupByCategory && (
              <div className="rounded-2xl border bg-white p-3 shadow-sm space-y-2">
                <p className="text-xs text-slate-500">
                  Dra för att ändra ordning på kategorierna (gäller endast gruppvisning).
                </p>
                <div className="space-y-1">
                  {activeCategories.map((cat) => (
                    <div
                      key={cat}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                        categoryDragging === cat ? "bg-slate-50 border-dashed border-slate-300" : "bg-white"
                      }`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        setCategoryDragging(cat);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setCategoryDragOver(cat);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (categoryDragging) {
                          handleReorderCategories(categoryDragging, cat);
                        }
                      }}
                      onDragEnd={() => {
                        setCategoryDragging(null);
                        setCategoryDragOver(null);
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-slate-400">↕</span>
                        {cat}
                      </span>
                      {categoryDragOver === cat && categoryDragging && categoryDragging !== cat && (
                        <span className="text-[11px] text-slate-500">Släpp här</span>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500">
                    <span className="text-slate-400">↕</span>
                    Okategoriserat placeras alltid sist
                  </div>
                </div>
              </div>
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
                {!document.groupByCategory && canDragItems && (
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Dra för att ändra ordning
                  </div>
                )}
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
                              draggable={false}
                              dragging={false}
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
                        draggable={canDragItems}
                        dragging={draggingId === item.id}
                        dragOver={dragOverId === item.id}
                        categories={CATEGORY_OPTIONS}
                        onDragStart={(id) => {
                          setDraggingId(id);
                        }}
                        onDragOver={(id) => {
                          setDragOverId(id);
                        }}
                        onDrop={(id) => {
                          if (draggingId) {
                            handleReorderItems(draggingId, id);
                          }
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverId(null);
                        }}
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

function parseLineToItem(
  line: string,
  categoryKeywords: Record<string, string[]>,
  categories: string[]
): { text: string; quantity?: string; category?: string } {
  const lower = line.toLowerCase();

  // Quantity patterns: "2x mjölk", "2 mjölk", "500g pasta", "1 kg potatis"
  const qtyMatch = lower.match(/^(\d+[.,]?\d*)\s*(x|st|kg|g|l|ml|cl)?\s+(.*)$/i);
  let quantity: string | undefined;
  let text = line;
  if (qtyMatch) {
    const [, amount, unitRaw, rest] = qtyMatch;
    const unit = unitRaw ? unitRaw.replace(".", "") : "";
    quantity = `${amount}${unit ? " " + unit : ""}`.trim();
    text = rest.trim();
  }

  // Categorize by keyword
  let matchedCategory: string | undefined;
  for (const category of categories) {
    const keywords = categoryKeywords[category];
    if (!keywords) continue;
    if (keywords.some((kw) => lower.includes(kw))) {
      matchedCategory = category;
      break;
    }
  }

  return { text: text.trim(), quantity, category: matchedCategory };
}

function dedupeCategories(order: string[], defaults: string[]) {
  const set = new Set<string>();
  const result: string[] = [];
  for (const item of order) {
    if (!set.has(item) && defaults.includes(item)) {
      set.add(item);
      result.push(item);
    }
  }
  for (const item of defaults) {
    if (!set.has(item)) {
      set.add(item);
      result.push(item);
    }
  }
  return result;
}
