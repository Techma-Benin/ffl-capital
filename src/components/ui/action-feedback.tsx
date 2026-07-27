"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { clsx } from "clsx";

type FeedbackKind = "success" | "error";

type FeedbackInput = {
  kind: FeedbackKind;
  title: string;
  message?: string;
};

type FeedbackItem = FeedbackInput & {
  id: number;
};

type ActionFeedbackContextValue = {
  notify: (feedback: FeedbackInput) => void;
};

const ActionFeedbackContext =
  createContext<ActionFeedbackContextValue | null>(null);

let nextFeedbackId = 1;

export function ActionFeedbackProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<FeedbackItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (feedback: FeedbackInput) => {
      const id = nextFeedbackId++;
      setItems((current) => [...current.slice(-2), { ...feedback, id }]);
      window.setTimeout(
        () => dismiss(id),
        feedback.kind === "error" ? 7000 : 4500,
      );
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ActionFeedbackContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
        aria-live="polite"
        aria-atomic="false"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role={item.kind === "error" ? "alert" : "status"}
            className={clsx(
              "pointer-events-auto rounded-xl border bg-white px-4 py-3 shadow-lg",
              item.kind === "success"
                ? "border-emerald-200"
                : "border-red-200",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={clsx(
                  "mt-1 h-2 w-2 shrink-0 rounded-full",
                  item.kind === "success" ? "bg-emerald-500" : "bg-red-500",
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {item.title}
                </p>
                {item.message ? (
                  <p className="mt-0.5 text-xs text-slate-600">
                    {item.message}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ActionFeedbackContext.Provider>
  );
}

export function useActionFeedback() {
  const context = useContext(ActionFeedbackContext);
  if (!context) {
    throw new Error(
      "useActionFeedback must be used within ActionFeedbackProvider",
    );
  }
  return context;
}
