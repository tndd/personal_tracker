"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  BarChart3,
  Tag,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  {
    name: "Track",
    href: "/track",
    icon: LayoutDashboard,
  },
  {
    name: "Daily",
    href: "/daily",
    icon: Calendar,
  },
  {
    name: "Analysis",
    href: "/analysis",
    icon: BarChart3,
  },
  {
    name: "Tags",
    href: "/tags",
    icon: Tag,
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* オーバーレイ（モバイルのみ） */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* サイドバー */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r bg-gray-50 transition-transform duration-300 lg:relative lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* ロゴ/タイトル */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          <h1 className="text-xl font-semibold">Health Tracker</h1>
          {/* モバイル用閉じるボタン */}
          <button
            onClick={onClose}
            className="lg:hidden rounded-md p-2 hover:bg-gray-200 transition-colors"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ナビゲーション */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => {
                  // モバイルでリンクをクリックしたらサイドバーを閉じる
                  if (window.innerWidth < 1024) {
                    onClose?.();
                  }
                }}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* フッター（オプション） */}
        <div className="border-t p-4">
          <p className="text-xs text-gray-500">Personal Health Tracker</p>
        </div>
      </div>
    </>
  );
}
