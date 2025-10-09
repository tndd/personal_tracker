import { format } from "date-fns";
import { ja } from "date-fns/locale";
import clsx from "clsx";

export type AppTab = "track" | "daily" | "analysis" | "tag";

export interface AppHeaderProps {
  activeTab: AppTab;
  onTabChange?: (tab: AppTab) => void;
  currentDate?: Date;
  rightSlot?: React.ReactNode;
}

const TAB_LABELS: Record<AppTab, string> = {
  track: "Track",
  daily: "Daily",
  analysis: "Analysis",
  tag: "Tag",
};

/**
 * 画面共通の固定ヘッダー。タブ切り替えと現在日付を表示する。
 */
export function AppHeader({
  activeTab,
  onTabChange,
  currentDate = new Date(),
  rightSlot,
}: AppHeaderProps) {
  const formatted = format(currentDate, "yyyy-MM-dd (EEE)", { locale: ja });

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-900">
            <span className="rounded bg-indigo-600 px-2 py-1 text-sm font-semibold text-white">
              PT
            </span>
            <span className="text-base font-semibold">Personal Tracker</span>
          </div>
          <time className="hidden text-sm text-gray-500 sm:inline">
            {formatted}
          </time>
        </div>
        <nav className="flex items-center gap-2">
          {(Object.keys(TAB_LABELS) as AppTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange?.(tab)}
              className={clsx(
                "rounded-full px-3 py-1 text-sm font-medium transition",
                activeTab === tab
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <time className="text-sm text-gray-500 sm:hidden">{formatted}</time>
          {rightSlot}
        </div>
      </div>
    </header>
  );
}
