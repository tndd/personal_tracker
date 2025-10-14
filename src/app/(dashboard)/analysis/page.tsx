"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// 3時間区間のデータ型
type HourlyCondition = {
  date: string;
  slot: number;
  startHour: number;
  endHour: number;
  min: number;
  max: number;
  count: number;
};

// モックデータ: タグ相関
const mockTagCorrelation = [
  { tagName: "頭痛", usageCount: 12, averageCondition: -1.5, color: "#F59E0B" },
  { tagName: "運動", usageCount: 8, averageCondition: 1.2, color: "#10B981" },
  { tagName: "服薬", usageCount: 15, averageCondition: -0.3, color: "#3B82F6" },
  { tagName: "睡眠", usageCount: 6, averageCondition: 0.8, color: "#8B5CF6" },
  { tagName: "食事", usageCount: 20, averageCondition: 0.2, color: "#EC4899" },
];

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AnalysisPage() {
  const [conditionData, setConditionData] = useState<HourlyCondition[]>([]);
  const [loading, setLoading] = useState(true);

  // デフォルト期間（過去7日間）
  const today = new Date();
  const defaultTo = formatDate(today);
  const defaultFrom = formatDate(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ from: fromDate, to: toDate });
        const response = await fetch(`/api/analysis/condition-hourly?${params}`);
        if (response.ok) {
          const data = await response.json();
          setConditionData(data.items);
        }
      } catch (error) {
        console.error("データ取得エラー:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fromDate, toDate]);

  // 日付とスロットのラベルを生成
  const getSlotLabel = (slot: number) => {
    const start = slot * 3;
    const end = (slot + 1) * 3;
    return `${start}-${end}h`;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">健康データの分析（3時間単位）</p>
      </div>

      {/* 期間選択 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">期間:</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-40"
            />
            <span className="text-gray-500">〜</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-40"
            />
          </div>
        </CardContent>
      </Card>

      {/* コンディション推移（3時間区間） */}
      <Card>
        <CardHeader>
          <CardTitle>コンディション推移（3時間区間）</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">読み込み中...</div>
          ) : conditionData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              データがありません
            </div>
          ) : (
            <div className="space-y-4">
              {/* グラフ（レンジバー） */}
              <div className="overflow-x-auto">
                <div className="relative min-w-max p-4">
                  {/* プラス方向のエリア（上部） */}
                  <div className="flex gap-1 h-20 items-end">
                    {conditionData.map((item) => (
                      <div key={`${item.date}-${item.slot}-top`} className="w-8">
                        {item.max > 0 && (
                          <div
                            className={
                              item.max === 2 ? "bg-green-500" : "bg-green-400"
                            }
                            style={{ height: `${item.max * 20}px` }}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 灰色の基準線（横一直線） */}
                  <div className="w-full h-1 bg-gray-400" />

                  {/* マイナス方向のエリア（下部） */}
                  <div className="flex gap-1 h-20">
                    {conditionData.map((item) => (
                      <div key={`${item.date}-${item.slot}-bottom`} className="w-8">
                        {item.min < 0 && (
                          <div
                            className={
                              item.min === -2 ? "bg-red-500" : "bg-orange-400"
                            }
                            style={{ height: `${Math.abs(item.min) * 20}px` }}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 時間帯ラベル */}
                  <div className="flex gap-1 mt-2">
                    {conditionData.map((item) => (
                      <div
                        key={`${item.date}-${item.slot}-label`}
                        className="w-8 flex flex-col items-center gap-1"
                      >
                        <span className="text-xs text-gray-600">
                          {getSlotLabel(item.slot)}
                        </span>
                        {/* 日付ラベル（日付が変わる最初のスロットのみ表示） */}
                        {item.slot === 0 && (
                          <span className="text-xs font-medium text-gray-700">
                            {item.date.slice(5)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
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
                  <span>基準（±0）</span>
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
          )}
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
