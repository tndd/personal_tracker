import { format } from "date-fns";
import { ja } from "date-fns/locale";
import clsx from "clsx";

export type AppTab = "track" | "daily" | "analysis" | "tag";

export interface AppHeaderProps {
  currentDate?: Date;
  rightSlot?: React.ReactNode;
}

/**
 * 画面共通の固定ヘッダー。アプリ名と現在日付を表示する。
 */
export function AppHeader({
  currentDate = new Date(),
  rightSlot,
}: AppHeaderProps) {
  const formatted = format(currentDate, "yyyy-MM-dd (EEE)", { locale: ja });

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between px-6 py-3">
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
        <div className="flex items-center gap-3">
          <time className="text-sm text-gray-500 sm:hidden">{formatted}</time>
          {rightSlot}
        </div>
      </div>
    </header>
  );
}
