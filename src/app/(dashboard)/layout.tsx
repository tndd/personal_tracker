"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Menu } from "lucide-react";
import { SidebarContentProvider, useSidebarContent } from "@/contexts/sidebar-content-context";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { sidebarContent } = useSidebarContent();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      >
        {sidebarContent}
      </Sidebar>
      <main className="flex-1 overflow-hidden bg-gray-50">
        {/* モバイル用ヘッダー（ハンバーガーメニュー） */}
        <div className="lg:hidden flex items-center h-16 border-b bg-white px-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-md p-2 hover:bg-gray-100 transition-colors"
            aria-label="メニューを開く"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="ml-3 text-lg font-semibold">Health Tracker</h1>
        </div>

        {/* コンテンツエリア */}
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 h-[calc(100%-4rem)] lg:h-full overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarContentProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarContentProvider>
  );
}
