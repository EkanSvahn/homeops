"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ConfirmOptions = {
  title: string;
  body?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
};

type InternalState = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<InternalState | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(
    (result: boolean) => {
      if (state) {
        state.resolve(result);
        setState(null);
      }
    },
    [state]
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  useEffect(() => {
    if (state) {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          close(false);
        }
        if (e.key === "Enter") {
          e.preventDefault();
          close(true);
        }
      };
      window.addEventListener("keydown", onKeyDown);
      const timer = window.setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 0);
      return () => {
        window.removeEventListener("keydown", onKeyDown);
        window.clearTimeout(timer);
      };
    }
  }, [state, close]);

  const isOpen = Boolean(state);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && state && (
        <>
          <div
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
            onClick={() => close(false)}
          />
          <div className="fixed inset-0 z-[95] flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">{state.title}</h2>
                {state.body && <p className="mt-2 text-sm text-slate-600">{state.body}</p>}
              </div>
              <div className="px-5 py-4 flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.99] transition-all"
                >
                  {state.cancelText || "Avbryt"}
                </button>
                <button
                  type="button"
                  ref={confirmButtonRef}
                  onClick={() => close(true)}
                  className={`w-full sm:w-auto rounded-xl px-4 py-2 text-sm font-semibold text-white active:scale-[0.99] transition-all ${
                    state.variant === "danger"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-black hover:bg-slate-800"
                  }`}
                >
                  {state.confirmText || "Ok"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return ctx.confirm;
}
