"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// モックデータ: コンディション推移
const mockConditionTrend = [
  { date: "10/08", condition: -1 },
  { date: "10/09", condition: 0 },
  { date: "10/10", condition: 2 },
  { date: "10/11", condition: -2 },
  { date: "10/12", condition: 0 },
  { date: "10/13", condition: 1 },
  { date: "10/14", condition: 1 },
];

// モックデータ: タグ相関
const mockTagCorrelation = [
  { tagName: "頭痛", usageCount: 12, averageCondition: -1.5, color: "#F59E0B" },
  { tagName: "運動", usageCount: 8, averageCondition: 1.2, color: "#10B981" },
  { tagName: "服薬", usageCount: 15, averageCondition: -0.3, color: "#3B82F6" },
  { tagName: "睡眠", usageCount: 6, averageCondition: 0.8, color: "#8B5CF6" },
  { tagName: "食事", usageCount: 20, averageCondition: 0.2, color: "#EC4899" },
];

export default function AnalysisPage() {
  // コンディション値を高さ（0-100%）に変換
  const getBarHeight = (condition: number) => {
    return ((condition + 2) / 4) * 100; // -2~2 を 0~100% に変換
  };

  // コンディションの色
  const getConditionColor = (condition: number) => {
    if (condition >= 1) return "bg-green-500";
    if (condition > 0) return "bg-green-400";
    if (condition === 0) return "bg-gray-400";
    if (condition > -2) return "bg-orange-400";
    return "bg-red-500";
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">健康データの分析</p>
      </div>

      {/* 期間選択 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">期間:</label>
            <Input type="date" defaultValue="2025-10-01" className="w-40" />
            <span className="text-gray-500">〜</span>
            <Input type="date" defaultValue="2025-10-14" className="w-40" />
          </div>
        </CardContent>
      </Card>

      {/* コンディション推移 */}
      <Card>
        <CardHeader>
          <CardTitle>コンディション推移</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* グラフ（シンプルな棒グラフ） */}
            <div className="flex items-end justify-around h-48 border-b border-l border-gray-200 p-4">
              {mockConditionTrend.map((item) => (
                <div key={item.date} className="flex flex-col items-center gap-2">
                  <div className="relative h-32 w-12 flex items-end">
                    <div
                      className={`w-full rounded-t ${getConditionColor(item.condition)}`}
                      style={{ height: `${getBarHeight(item.condition)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600">{item.date}</span>
                </div>
              ))}
            </div>

            {/* 凡例 */}
            <div className="flex justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-green-500" />
                <span>+2</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-green-400" />
                <span>+1</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-gray-400" />
                <span>±0</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-orange-400" />
                <span>-1</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-red-500" />
                <span>-2</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* タグとコンディションの相関 */}
      <Card>
        <CardHeader>
          <CardTitle>タグとコンディションの相関</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockTagCorrelation.map((item) => (
              <div
                key={item.tagName}
                className="flex items-center justify-between border-b pb-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: `${item.color}20`,
                      color: item.color,
                    }}
                  >
                    {item.tagName}
                  </span>
                  <span className="text-sm text-gray-600">
                    出現回数: {item.usageCount}回
                  </span>
                </div>
                <div
                  className={`text-sm font-medium ${
                    item.averageCondition > 0
                      ? "text-green-600"
                      : item.averageCondition < 0
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}
                >
                  平均: {item.averageCondition > 0 ? "+" : ""}
                  {item.averageCondition.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
