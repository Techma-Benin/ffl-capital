import type { Appearance } from "@clerk/types";

/** Clerk theme for standalone sign-in / sign-up pages. */
export const authClerkAppearance: Appearance = {
  variables: {
    colorText: "#0f172a",
    colorInputText: "#0f172a",
    colorBackground: "#ffffff",
    colorPrimary: "#2563eb",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full shadow-none border-0 p-0 bg-transparent",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    formFieldRow__name: "gap-4",
    socialButtons: "grid grid-cols-2 gap-3",
    socialButtonsBlockButton:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors rounded-lg text-sm font-medium h-10",
    dividerRow: "my-4",
    formFieldInput: "form-input",
    formFieldLabel: "form-label",
    formButtonPrimary: "btn-primary w-full justify-center h-10 text-sm",
    footerAction: "text-sm text-slate-500",
    footerActionLink: "text-brand-600 hover:underline font-medium",
  },
};
