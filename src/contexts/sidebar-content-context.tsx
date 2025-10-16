"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface SidebarContentContextValue {
  sidebarContent: ReactNode;
  setSidebarContent: (content: ReactNode) => void;
}

const SidebarContentContext = createContext<SidebarContentContextValue | undefined>(
  undefined
);

export function SidebarContentProvider({ children }: { children: ReactNode }) {
  const [sidebarContent, setSidebarContent] = useState<ReactNode>(null);

  const setContent = useCallback((content: ReactNode) => {
    setSidebarContent(content);
  }, []);

  return (
    <SidebarContentContext.Provider value={{ sidebarContent, setSidebarContent: setContent }}>
      {children}
    </SidebarContentContext.Provider>
  );
}

export function useSidebarContent() {
  const context = useContext(SidebarContentContext);
  if (!context) {
    throw new Error("useSidebarContent must be used within SidebarContentProvider");
  }
  return context;
}
