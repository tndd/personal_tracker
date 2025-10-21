"use client";

import { cn } from "@/lib/utils";

export type AnalysisView = "dashboard" | "condition" | "tag";

interface AnalysisSidebarContentProps {
  selectedView: AnalysisView;
  onSelect: (view: AnalysisView) => void;
}

const NAV_ITEMS: Array<{ key: AnalysisView; label: string; description?: string }> = [
  { key: "dashboard", label: "Dashboard", description: "全体概要" },
  { key: "condition", label: "コンディション推移", description: "時系列の変化" },
  { key: "tag", label: "タグ相関", description: "タグ別の寄与度" },
];

export function AnalysisSidebarContent({
  selectedView,
  onSelect,
}: AnalysisSidebarContentProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Analysis</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          セクションを切り替えて分析内容を表示します。
        </p>
      </div>
      <nav className="space-y-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            className={cn(
              "w-full rounded-md border px-3 py-2 text-left text-sm transition-colors",
              selectedView === item.key
                ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                : "border-transparent bg-white text-gray-700 hover:border-gray-200 hover:bg-gray-50"
            )}
          >
            <div className="font-medium">{item.label}</div>
            {item.description && (
              <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
