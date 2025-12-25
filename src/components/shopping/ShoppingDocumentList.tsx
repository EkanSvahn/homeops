"use client";

import { useState } from "react";
import type { ShoppingDocument } from "@/lib/shopping.types";

type ShoppingDocumentListProps = {
  documents: ShoppingDocument[];
  onCreateDocument: (title: string) => void;
  onSelectDocument: (doc: ShoppingDocument) => void;
  onDeleteDocument: (id: string) => void;
  isCreating: boolean;
  onStartCreate: () => void;
  onCancelCreate: () => void;
};

export function ShoppingDocumentList({
  documents,
  onCreateDocument,
  onSelectDocument,
  onDeleteDocument,
  isCreating,
  onStartCreate,
  onCancelCreate,
}: ShoppingDocumentListProps) {
  const [newTitle, setNewTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      onCreateDocument(newTitle);
      setNewTitle("");
    }
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
    });
  };

  const getItemCount = (doc: ShoppingDocument) => {
    const total = doc.items.length;
    const checked = doc.items.filter((i) => i.checked).length;
    return { total, checked };
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-32 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Handlingslistor</h1>
        <p className="mt-1 text-sm text-slate-500">
          Skapa och hantera dina shoppinglistor
        </p>
      </div>

      {/* Create new document */}
      {isCreating ? (
        <form
          onSubmit={handleSubmit}
          className="mb-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4"
        >
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="T.ex. Mathandling, Veckohandling..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base focus:border-black focus:outline-none focus:ring-2 focus:ring-black/20"
            autoFocus
            autoComplete="off"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-black px-4 py-3 text-base font-semibold text-white hover:bg-slate-800 active:scale-[0.99] transition-all"
            >
              Skapa
            </button>
            <button
              type="button"
              onClick={onCancelCreate}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.99] transition-all"
            >
              Avbryt
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={onStartCreate}
          className="mb-4 w-full rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-4 text-base font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 active:scale-[0.99] transition-all"
        >
          + Skapa ny lista
        </button>
      )}

      {/* Documents list */}
      {documents.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl mb-3">🛒</div>
          <p className="text-sm font-medium text-slate-700">
            Inga handlingslistor ännu
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Skapa din första lista för att komma igång
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .map((doc) => {
              const { total, checked } = getItemCount(doc);
              return (
                <div
                  key={doc.id}
                  className="group relative rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md"
                >
                  <button
                    onClick={() => onSelectDocument(doc)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-slate-900 truncate">
                          {doc.title}
                        </h3>
                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                          <span>
                            {checked}/{total} varor
                          </span>
                          <span>•</span>
                          <span>Uppdaterad {formatDate(doc.updatedAt)}</span>
                        </div>
                      </div>
                      {total > 0 && (
                        <div
                          className={`ml-3 shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                            checked === total
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {Math.round((checked / total) * 100)}%
                        </div>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Är du säker på att du vill ta bort denna lista?")) {
                        onDeleteDocument(doc.id);
                      }
                    }}
                    className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 rounded-full p-2 hover:bg-red-50 text-red-600 transition-opacity"
                    aria-label="Ta bort"
                  >
                    🗑️
                  </button>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

