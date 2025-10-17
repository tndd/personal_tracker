"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// 集計データの型
type ConditionData = {
  slotIndex: number;
  startTime: string;
  endTime: string;
  min: number | null;
  max: number | null;
  count: number;
  counts: Record<number, number>; // 各コンディション値の出現回数
  ratios: Record<number, number>; // 各コンディション値の比率
};

// 粒度の型
type Granularity = "3h" | "6h" | "12h" | "1d" | "3d" | "1w";

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

// 粒度をミリ秒に変換
function granularityToMs(gran: Granularity): number {
  const match = gran.match(/^(\d+)([hdw])$/);
  if (!match) return 0;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "w":
      return value * 7 * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
}

// デフォルト期間を計算（16区間分）
function calculateDefaultPeriod(granularity: Granularity): { from: string; to: string } {
  const today = new Date();
  const to = formatDate(today);
  const granMs = granularityToMs(granularity);
  const from = formatDate(new Date(today.getTime() - granMs * 16));
  return { from, to };
}

export default function AnalysisPage() {
  const [granularity, setGranularity] = useState<Granularity>("3h");
  const [conditionData, setConditionData] = useState<ConditionData[]>([]);
  const [loading, setLoading] = useState(true);

  // デフォルト期間（粒度の16区間分）
  const defaultPeriod = calculateDefaultPeriod(granularity);
  const [fromDate, setFromDate] = useState(defaultPeriod.from);
  const [toDate, setToDate] = useState(defaultPeriod.to);

  // 粒度が変更されたら期間をリセット
  useEffect(() => {
    const period = calculateDefaultPeriod(granularity);
    setFromDate(period.from);
    setToDate(period.to);
  }, [granularity]);

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          granularity,
          from: fromDate,
          to: toDate
        });
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
  }, [granularity, fromDate, toDate]);

  // スロットのラベルを生成
  const getSlotLabel = (item: ConditionData) => {
    const start = new Date(item.startTime);

    // 時間表示（時間単位の粒度）
    if (granularity.endsWith("h")) {
      return `${start.getHours()}h`;
    }

    // 日付表示（日単位の粒度）
    if (granularity === "1d") {
      return `${start.getMonth() + 1}/${start.getDate()}`;
    }

    // 期間表示（3日、1週間単位の粒度）
    return `${start.getMonth() + 1}/${start.getDate()}`;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">健康データの分析</p>
      </div>

      {/* 粒度と期間の選択 */}
      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3">
          {/* 粒度選択 */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <label className="text-sm font-medium text-gray-700">粒度:</label>
            <div className="flex flex-wrap gap-2">
              {(["3h", "6h", "12h", "1d", "3d", "1w"] as Granularity[]).map((gran) => (
                <button
                  key={gran}
                  onClick={() => setGranularity(gran)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    granularity === gran
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {gran}
                </button>
              ))}
            </div>
          </div>

          {/* 期間選択 */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <label className="text-sm font-medium text-gray-700">期間:</label>
            <div className="flex items-center gap-2 sm:gap-4">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-32 sm:w-40 text-sm"
              />
              <span className="text-gray-500">〜</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-32 sm:w-40 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* コンディション推移 */}
      <Card>
        <CardHeader>
          <CardTitle>コンディション推移（{granularity}）</CardTitle>
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
              {/* グラフ（比率ベースの積み上げバー） */}
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <div className="relative min-w-max p-2 sm:p-4">
                  {/* 最大高さ（px） */}
                  {(() => {
                    const MAX_HEIGHT = 120;

                    return (
                      <>
                        {/* プラス方向のエリア（上部） */}
                        <div className="flex gap-1" style={{ height: `${MAX_HEIGHT}px` }}>
                          {conditionData.map((item) => {
                            const hasData = item.count > 0;
                            const ratios = item.ratios || {};
                            // +2と+1の比率
                            const ratio2 = ratios[2] || 0;
                            const ratio1 = ratios[1] || 0;
                            const totalPositive = ratio2 + ratio1;

                            return (
                              <div key={`${item.slotIndex}-top`} className="w-8 flex flex-col-reverse">
                                {hasData && totalPositive > 0 ? (
                                  <>
                                    {/* +1の領域（下側） */}
                                    {ratio1 > 0 && (
                                      <div
                                        className="bg-green-400"
                                        style={{ height: `${(ratio1 * MAX_HEIGHT)}px` }}
                                      />
                                    )}
                                    {/* +2の領域（上側） */}
                                    {ratio2 > 0 && (
                                      <div
                                        className="bg-green-500"
                                        style={{ height: `${(ratio2 * MAX_HEIGHT)}px` }}
                                      />
                                    )}
                                  </>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>

                        {/* 0の段（基準線） */}
                        <div className="flex gap-1" style={{ height: '20px' }}>
                          {conditionData.map((item) => {
                            const hasData = item.count > 0;
                            const ratios = item.ratios || {};
                            const ratio0 = ratios[0] || 0;

                            return (
                              <div key={`${item.slotIndex}-zero`} className="w-8">
                                {hasData && ratio0 > 0 && (
                                  <div className="bg-gray-400 h-full" />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* マイナス方向のエリア（下部） */}
                        <div className="flex gap-1" style={{ height: `${MAX_HEIGHT}px` }}>
                          {conditionData.map((item) => {
                            const hasData = item.count > 0;
                            const ratios = item.ratios || {};
                            // -1と-2の比率
                            const ratioMinus1 = ratios[-1] || 0;
                            const ratioMinus2 = ratios[-2] || 0;
                            const totalNegative = ratioMinus1 + ratioMinus2;

                            return (
                              <div key={`${item.slotIndex}-bottom`} className="w-8 flex flex-col">
                                {hasData && totalNegative > 0 ? (
                                  <>
                                    {/* -1の領域（上側） */}
                                    {ratioMinus1 > 0 && (
                                      <div
                                        className="bg-orange-400"
                                        style={{ height: `${(ratioMinus1 * MAX_HEIGHT)}px` }}
                                      />
                                    )}
                                    {/* -2の領域（下側） */}
                                    {ratioMinus2 > 0 && (
                                      <div
                                        className="bg-red-500"
                                        style={{ height: `${(ratioMinus2 * MAX_HEIGHT)}px` }}
                                      />
                                    )}
                                  </>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}

                  {/* ラベル */}
                  <div className="flex gap-1 mt-2">
                    {conditionData.map((item, index) => (
                      <div
                        key={`${item.slotIndex}-label`}
                        className="w-8 flex flex-col items-center gap-1"
                      >
                        {index % 2 === 0 && (
                          <span className="text-xs text-gray-600">
                            {getSlotLabel(item)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 凡例 */}
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4 text-xs">
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
                  <span className="hidden sm:inline">基準（±0）</span>
                  <span className="sm:hidden">±0</span>
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
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 border-b pb-3 last:border-0"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span
                    className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium flex-shrink-0"
                    style={{
                      backgroundColor: `${item.color}20`,
                      color: item.color,
                    }}
                  >
                    {item.tagName}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-600 truncate">
                    <span className="hidden sm:inline">出現回数: </span>{item.usageCount}回
                  </span>
                </div>
                <div
                  className={`text-xs sm:text-sm font-medium flex-shrink-0 ${
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
