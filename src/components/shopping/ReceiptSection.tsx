"use client";

import { useMemo, useState, useRef } from "react";
import type { Receipt } from "@/lib/shopping.types";
import { loadReceiptsFromStorage, saveReceiptsToStorage } from "@/lib/storage";
import { useConfirm } from "../ui/ConfirmDialog";

type ReceiptSectionProps = {
  documentId: string;
};

export function ReceiptSection({ documentId }: ReceiptSectionProps) {
  const MAX_RECEIPT_BYTES = 2_500_000; // localStorage-friendly (base64 adds overhead)
  const [allReceipts, setAllReceipts] = useState<Receipt[]>(
    () => loadReceiptsFromStorage() || []
  );
  const [isUploading, setIsUploading] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<Receipt | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();

  const receipts = useMemo(
    () => allReceipts.filter((r) => r.documentId === documentId),
    [allReceipts, documentId]
  );

  const persistAllReceipts = (next: Receipt[]) => {
    saveReceiptsToStorage(next);
    setAllReceipts(next);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_RECEIPT_BYTES) {
      alert(
        `Filen är för stor (${Math.round(
          file.size / 1_000_000
        )} MB). Välj en mindre fil (max ~${Math.round(
          MAX_RECEIPT_BYTES / 1_000_000
        )} MB).`
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setIsUploading(true);

    // För nu: konvertera till base64 (i produktion: ladda upp till cloud storage)
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const newReceipt: Receipt = {
        id: `receipt-${Date.now()}`,
        documentId,
        fileName: file.name,
        fileUrl: base64,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
      };

      const updated = [...allReceipts, newReceipt];
      persistAllReceipts(updated);
      setIsUploading(false);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteReceipt = async (id: string) => {
    const ok = await confirm({
      title: "Ta bort kvitto?",
      body: "Kvitto tas bort permanent från denna enhet.",
      confirmText: "Ta bort",
      cancelText: "Behåll",
      variant: "danger",
    });
    if (!ok) return;

    const updated = allReceipts.filter((r) => r.id !== id);
    persistAllReceipts(updated);
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Kvitton</h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.99] transition-all disabled:opacity-50"
        >
          {isUploading ? "Laddar upp..." : "+ Ladda upp"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {receipts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <div className="text-2xl mb-2">🧾</div>
          <p className="text-sm text-slate-600">Inga kvitton ännu</p>
          <p className="mt-1 text-xs text-slate-500">
            Ladda upp kvitton för att spara dem här
          </p>
        </div>
      ) : (
        <div className="space-y-2 rounded-2xl border bg-white p-2 shadow-sm">
          {receipts.map((receipt) => (
            <div
              key={receipt.id}
              className="group relative flex items-center gap-3 rounded-xl px-3 py-3 transition-all hover:bg-neutral-50"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">
                  {receipt.fileName}
                </div>
                <div className="text-xs text-slate-500">
                  {formatDate(receipt.uploadedAt)}
                  {receipt.store && ` • ${receipt.store}`}
                </div>
              </div>
              <button
                onClick={() => setPreviewReceipt(receipt)}
                className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 active:scale-[0.99] transition-all"
              >
                {receipt.fileType.startsWith("image/") ? "Visa" : "Öppna"}
              </button>
              <button
                onClick={() => handleDeleteReceipt(receipt.id)}
                className="shrink-0 rounded-full p-2 text-red-600 transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-50"
                aria-label="Ta bort"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewReceipt && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewReceipt(null)}
          />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold truncate">
                    {previewReceipt.fileName}
                  </h3>
                  {previewReceipt.store && (
                    <p className="text-sm text-slate-500 mt-1">
                      {previewReceipt.store}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setPreviewReceipt(null)}
                  className="rounded-full p-2 hover:bg-neutral-100 active:scale-95 transition-all ml-4"
                  aria-label="Stäng"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
                {previewReceipt.fileType.startsWith("image/") ? (
                  <img
                    src={previewReceipt.fileUrl}
                    alt={previewReceipt.fileName}
                    className="w-full h-auto rounded-lg"
                  />
                ) : previewReceipt.fileType === "application/pdf" ? (
                  <iframe
                    src={previewReceipt.fileUrl}
                    className="w-full h-[600px] rounded-lg border"
                    title={previewReceipt.fileName}
                  />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-slate-600">
                      Förhandsvisning inte tillgänglig för denna filtyp
                    </p>
                    <a
                      href={previewReceipt.fileUrl}
                      download={previewReceipt.fileName}
                      className="mt-4 inline-block rounded-xl bg-black px-6 py-3 text-base font-semibold text-white hover:bg-slate-800"
                    >
                      Ladda ner
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
