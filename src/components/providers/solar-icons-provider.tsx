"use client";

import { SolarProvider } from "@solar-icons/react";
import { ICON_WEIGHT } from "@/lib/icons/types";

export function SolarIconsProvider({ children }: { children: React.ReactNode }) {
  return (
    <SolarProvider value={{ weight: ICON_WEIGHT, size: 24 }}>{children}</SolarProvider>
  );
}
