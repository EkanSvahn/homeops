"use client";

import { useState } from "react";
import type { ShoppingItem } from "@/lib/shopping.types";

type ShoppingItemRowProps = {
  item: ShoppingItem;
  onUpdate: (updates: Partial<ShoppingItem>) => void;
  onDelete: () => void;
  categories?: string[];
  draggable?: boolean;
  dragging?: boolean;
  onDragStart?: (id: string) => void;
  onDragOver?: (id: string) => void;
  onDrop?: (id: string) => void;
  onDragEnd?: () => void;
  dragOver?: boolean;
};

export function ShoppingItemRow({
  item,
  onUpdate,
  onDelete,
  categories,
  draggable,
  dragging,
  dragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: ShoppingItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [showActions, setShowActions] = useState(false);

  const handleToggle = () => {
    onUpdate({ checked: !item.checked });
  };

  const handleSaveEdit = () => {
    if (editText.trim()) {
      const trimmed = editText.trim();
      setEditText(trimmed);
      onUpdate({ text: trimmed });
      setIsEditing(false);
    } else {
      setEditText(item.text);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-all hover:bg-neutral-50 relative ${
        dragging
          ? "opacity-60 border border-dashed border-slate-300"
          : dragOver
          ? "border border-slate-200"
          : ""
      }`}
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(item.id);
      }}
      onDragOver={(e) => {
        if (!draggable) return;
        e.preventDefault();
        onDragOver?.(item.id);
      }}
      onDrop={(e) => {
        if (!draggable) return;
        e.preventDefault();
        onDrop?.(item.id);
      }}
      onDragEnd={() => {
        if (!draggable) return;
        onDragEnd?.();
      }}
    >
      {draggable && (
        <span className="cursor-grab select-none text-slate-400 text-lg">↕</span>
      )}
      <button
        onClick={handleToggle}
        className={`shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
          item.checked
            ? "bg-green-500 border-green-500"
            : "border-slate-300 hover:border-slate-400"
        }`}
        aria-label={item.checked ? "Avmarkera" : "Markera"}
      >
        {item.checked && <span className="text-white text-sm">✓</span>}
      </button>

      {isEditing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveEdit();
          }}
          className="flex-1"
        >
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSaveEdit}
            className="w-full rounded-lg border-2 border-black bg-white px-3 py-2 text-sm focus:outline-none"
            autoFocus
          />
        </form>
      ) : (
        <button
          onClick={() => {
            setEditText(item.text);
            setIsEditing(true);
          }}
          className={`flex-1 text-left text-sm ${
            item.checked
              ? "text-slate-400 line-through"
              : "text-slate-900 font-medium"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="truncate">{item.text}</span>
            {item.quantity && (
              <span className="text-xs text-slate-500 shrink-0">
                ({item.quantity})
              </span>
            )}
            {item.category && (
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                {item.category}
              </span>
            )}
          </div>
        </button>
      )}

      <div className="shrink-0 relative">
        <button
          onClick={() => setShowActions(!showActions)}
          className="rounded-full border bg-white px-3 py-1 text-xs font-semibold hover:bg-neutral-50 active:scale-[0.99] transition-all"
        >
          ⋯
        </button>
        {showActions && (
          <>
            <div
              className="fixed inset-0 z-[70]"
              onClick={() => setShowActions(false)}
            />
            <div className="absolute right-0 top-full mt-1 z-[80] bg-white border rounded-xl shadow-lg min-w-[160px] overflow-hidden">
              <button
                onClick={() => {
                  setIsEditing(true);
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2"
              >
                <span>✏️</span> Redigera
              </button>
              {categories && (
                <div className="border-t border-slate-100 px-4 py-3 space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Kategori
                  </label>
                  <select
                    value={item.category || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      onUpdate({ category: value || undefined });
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                  >
                    <option value="">Ingen</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={() => {
                  onDelete();
                  setShowActions(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
              >
                <span>🗑️</span> Ta bort
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
