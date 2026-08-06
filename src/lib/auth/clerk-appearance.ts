import type { Appearance } from "@clerk/types";

/** Shared Clerk theme so modals opened from the dark sidebar stay readable. */
export const clerkAppearance: Appearance = {
  variables: {
    colorText: "#0f172a",
    colorInputText: "#0f172a",
    colorBackground: "#ffffff",
    colorPrimary: "#2563eb",
  },
  elements: {
    formFieldInput: "form-input",
    formFieldLabel: "form-label",
    card: "text-slate-900",
    modalContent: "text-slate-900",
  },
};
