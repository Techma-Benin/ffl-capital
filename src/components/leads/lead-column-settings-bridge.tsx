"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from "react";

type LeadColumnSettingsBridgeValue = {
  registerOpenColumnSettings: (open: () => void) => () => void;
  openColumnSettings: () => void;
};

const LeadColumnSettingsBridgeContext =
  createContext<LeadColumnSettingsBridgeValue | null>(null);

export function LeadColumnSettingsBridge({ children }: { children: ReactNode }) {
  const openerRef = useRef<(() => void) | null>(null);

  const registerOpenColumnSettings = useCallback((open: () => void) => {
    openerRef.current = open;
    return () => {
      if (openerRef.current === open) openerRef.current = null;
    };
  }, []);

  const openColumnSettings = useCallback(() => {
    openerRef.current?.();
  }, []);

  return (
    <LeadColumnSettingsBridgeContext.Provider
      value={{ registerOpenColumnSettings, openColumnSettings }}
    >
      {children}
    </LeadColumnSettingsBridgeContext.Provider>
  );
}

export function useLeadColumnSettingsBridge() {
  return useContext(LeadColumnSettingsBridgeContext);
}
