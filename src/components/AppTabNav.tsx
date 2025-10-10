import clsx from "clsx";
import type { AppTab } from "./AppHeader";

export interface AppTabNavProps {
  activeTab: AppTab;
  onTabChange?: (tab: AppTab) => void;
}

const TAB_CONFIG: Record<
  AppTab,
  { label: string; icon: string; description: string }
> = {
  track: {
    label: "Track",
    icon: "📝",
    description: "記録を管理",
  },
  daily: {
    label: "Daily",
    icon: "📅",
    description: "日次サマリー",
  },
  analysis: {
    label: "Analysis",
    icon: "📊",
    description: "分析・統計",
  },
  tag: {
    label: "Tag",
    icon: "🏷️",
    description: "タグ管理",
  },
};

/**
 * Slackスタイルの縦長タブナビゲーション。
 * 画面左端に配置され、アプリ全体のタブ切り替えを行う。
 */
export function AppTabNav({ activeTab, onTabChange }: AppTabNavProps) {
  return (
    <aside className="flex w-20 shrink-0 flex-col items-center gap-1 border-r border-gray-300 bg-indigo-900 py-3">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-xl font-bold text-indigo-900">
        PT
      </div>
      {(Object.keys(TAB_CONFIG) as AppTab[]).map((tab) => {
        const config = TAB_CONFIG[tab];
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange?.(tab)}
            className={clsx(
              "group relative flex h-14 w-14 flex-col items-center justify-center rounded-lg transition",
              isActive
                ? "bg-indigo-700 text-white"
                : "text-indigo-200 hover:bg-indigo-800 hover:text-white"
            )}
            title={`${config.label} - ${config.description}`}
          >
            <span className="text-xl">{config.icon}</span>
            <span className="mt-0.5 text-[10px] font-medium">{config.label}</span>
            {isActive && (
              <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r bg-white" />
            )}
          </button>
        );
      })}
    </aside>
  );
}
