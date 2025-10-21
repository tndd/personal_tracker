"use client";

import { useEffect, useState, useRef } from "react";
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
type Granularity = "1d" | "1w" | "1m";

// タグ寄与度の型
type TagContribution = {
  tagId: string;
  tagName: string;
  occurrenceCount: number;
  observationCount: number;
  effectiveSampleSize: number;
  totalWeight: number;
  rawMean: number | null;
  baselineMean: number;
  contribution: number; // ベイズ調整後の寄与度
  rawContribution: number; // ベースラインからの差分（未調整）
  confidence: number; // 信頼度指標 (0.0-1.0)
  probabilitySameSign: number; // 符号が維持される事後確率 (0.5-1.0)
  credibleInterval: {
    lower: number;
    upper: number;
  };
};

// タグ相関APIレスポンスの型
type TagCorrelationResponse = {
  positive: TagContribution[];
  negative: TagContribution[];
  metadata: {
    priorWeight: number;
    priorMean: number;
    priorVariance: number;
    lagWeights: number[];
    lagDays: number[];
    granularity: Granularity;
    baselineMean: number;
  };
};

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 粒度をミリ秒に変換
function granularityToMs(gran: Granularity): number {
  const match = gran.match(/^(\d+)([dwm])$/);
  if (!match) return 0;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "w":
      return value * 7 * 24 * 60 * 60 * 1000;
    case "m":
      return value * 30 * 24 * 60 * 60 * 1000; // 30日として概算
    default:
      return 0;
  }
}

function formatGranularityLabel(gran: Granularity): string {
  switch (gran) {
    case "1d":
      return "日単位";
    case "1w":
      return "週単位";
    case "1m":
      return "月単位";
    default:
      return gran;
  }
}

function formatLagDescription(days: number): string {
  if (days === 1) {
    return "翌日";
  }
  if (days === 2) {
    return "翌々日";
  }
  return `${days}日後`;
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
  const [granularity, setGranularity] = useState<Granularity>("1d");
  const [conditionData, setConditionData] = useState<ConditionData[]>([]);
  const [tagCorrelation, setTagCorrelation] = useState<TagCorrelationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tagLoading, setTagLoading] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false);
  const metadataRef = useRef<HTMLDivElement>(null);

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

  // コンディションデータ取得
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

  // タグ相関データ取得
  useEffect(() => {
    const fetchTagCorrelation = async () => {
      setTagLoading(true);
      try {
        const params = new URLSearchParams({
          granularity,
          from: fromDate,
          to: toDate
        });
        const response = await fetch(`/api/analysis/tag-correlation?${params}`);
        if (response.ok) {
          const data = await response.json();
          setTagCorrelation(data);
        }
      } catch (error) {
        console.error("タグ相関データ取得エラー:", error);
      } finally {
        setTagLoading(false);
      }
    };
    fetchTagCorrelation();
  }, [granularity, fromDate, toDate]);

  // ポップアップの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (metadataRef.current && !metadataRef.current.contains(event.target as Node)) {
        setShowMetadata(false);
      }
    };

    if (showMetadata) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMetadata]);

  // スロットのラベルを生成
  const getSlotLabel = (item: ConditionData) => {
    const start = new Date(item.startTime);

    // 日付表示（日単位の粒度）
    if (granularity === "1d") {
      return `${start.getMonth() + 1}/${start.getDate()}`;
    }

    // 期間表示（週単位、月単位の粒度）
    return `${start.getMonth() + 1}/${start.getDate()}`;
  };

  const displayGranularity = tagCorrelation?.metadata.granularity ?? granularity;
  const displayGranularityLabel = formatGranularityLabel(displayGranularity);

  return (
    <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">健康データの分析</p>
      </div>

      {/* コンディション推移 */}
      <Card>
        <CardHeader>
          <CardTitle>コンディション推移</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 粒度と期間の選択 */}
          <div className="space-y-3">
            {/* 粒度選択 */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <label className="text-sm font-medium text-gray-700">粒度:</label>
              <div className="flex flex-wrap gap-2">
                {(["1d", "1w", "1m"] as Granularity[]).map((gran) => (
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
          </div>

          {/* グラフ表示エリア */}
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
                  {/* 積み上げバー */}
                  {(() => {
                    const BAR_HEIGHT = 200; // バー全体の高さ

                    return (
                      <div className="flex gap-1 items-end" style={{ height: `${BAR_HEIGHT}px` }}>
                        {conditionData.map((item) => {
                          const hasData = item.count > 0;
                          const ratios = item.ratios || {};

                          return (
                            <div
                              key={`${item.slotIndex}-bar`}
                              className="w-8 flex flex-col justify-end"
                              style={{ height: `${BAR_HEIGHT}px` }}
                            >
                              {hasData ? (
                                <div className="flex flex-col" style={{ height: `${BAR_HEIGHT}px` }}>
                                  {/* +2の領域（最上部） */}
                                  {ratios[2] > 0 && (
                                    <div
                                      className="bg-green-500"
                                      style={{ height: `${(ratios[2] * BAR_HEIGHT)}px` }}
                                    />
                                  )}
                                  {/* +1の領域 */}
                                  {ratios[1] > 0 && (
                                    <div
                                      className="bg-green-400"
                                      style={{ height: `${(ratios[1] * BAR_HEIGHT)}px` }}
                                    />
                                  )}
                                  {/* 0の領域（中央） */}
                                  {ratios[0] > 0 && (
                                    <div
                                      className="bg-gray-400"
                                      style={{ height: `${(ratios[0] * BAR_HEIGHT)}px` }}
                                    />
                                  )}
                                  {/* -1の領域 */}
                                  {ratios[-1] > 0 && (
                                    <div
                                      className="bg-orange-400"
                                      style={{ height: `${(ratios[-1] * BAR_HEIGHT)}px` }}
                                    />
                                  )}
                                  {/* -2の領域（最下部） */}
                                  {ratios[-2] > 0 && (
                                    <div
                                      className="bg-red-500"
                                      style={{ height: `${(ratios[-2] * BAR_HEIGHT)}px` }}
                                    />
                                  )}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>
            タグとコンディションの相関（{displayGranularityLabel}の寄与度）
          </CardTitle>
          {!tagLoading && tagCorrelation && (
            <div className="relative" ref={metadataRef}>
              <button
                onClick={() => setShowMetadata(!showMetadata)}
                className="text-xs px-2 py-1 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                前提条件
              </button>
              {showMetadata && (
                <div className="absolute right-0 top-full mt-2 w-80 p-3 bg-white border border-gray-200 rounded-md shadow-lg z-10 text-xs text-gray-600 space-y-2">
                  <div>
                    基準平均（全タグ加重平均）: {tagCorrelation.metadata.baselineMean.toFixed(2)}
                  </div>
                  <div>
                    事前設定: 平均 {tagCorrelation.metadata.priorMean.toFixed(2)} ／ 仮想サンプル数 {tagCorrelation.metadata.priorWeight} ／ 分散 {tagCorrelation.metadata.priorVariance.toFixed(2)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>ラグ重み:</span>
                    {tagCorrelation.metadata.lagDays.map((day, index) => {
                      const weight = tagCorrelation.metadata.lagWeights[index];
                      const weightLabel =
                        typeof weight === "number" && Number.isFinite(weight)
                          ? Number(weight.toFixed(2)).toString()
                          : "-";
                      return (
                        <span key={`${day}-${index}`} className="text-gray-600">
                          {formatLagDescription(day)} {weightLabel}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {tagLoading ? (
            <div className="text-center py-8 text-gray-500">読み込み中...</div>
          ) : !tagCorrelation ? (
            <div className="text-center py-8 text-gray-500">データがありません</div>
          ) : (
            <div className="space-y-6">
              {/* プラス寄与（コンディション向上に寄与） */}
              {tagCorrelation.positive.length > 0 && (() => {
                // プラス寄与の最大値を計算
                const maxContribution = Math.max(...tagCorrelation.positive.map(item => Math.abs(item.contribution)));
                return (
                  <div>
                    <h3 className="text-sm font-semibold text-green-700 mb-3">
                      プラス寄与（コンディション向上）
                    </h3>
                    <div className="space-y-3">
                      {tagCorrelation.positive.map((item) => {
                        const barWidth = maxContribution > 0 ? (Math.abs(item.contribution) / maxContribution) * 100 : 0;
                        const probabilityPercent = Math.round(item.probabilitySameSign * 100);
                        const confidencePercent = Math.round(item.confidence * 100);
                        return (
                          <div
                            key={item.tagId}
                            className="flex flex-col gap-2 border-b pb-3 last:border-0"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-green-100 text-green-800 flex-shrink-0">
                                  {item.tagName}
                                </span>
                                <span className="text-xs text-gray-600 truncate">
                                  {item.occurrenceCount}回
                                </span>
                                <span className="text-xs text-gray-500 truncate">
                                  観測{item.observationCount}件
                                </span>
                              </div>
                              <div className="text-sm font-medium text-green-600 flex-shrink-0">
                                +{item.contribution.toFixed(2)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 transition-opacity"
                                  style={{
                                    width: `${barWidth}%`,
                                    opacity: item.confidence
                                  }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 flex-shrink-0 w-10 text-right">
                                {probabilityPercent}%
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              95%信用区間: {item.credibleInterval.lower.toFixed(2)}〜{item.credibleInterval.upper.toFixed(2)} ／ 信頼係数: {confidencePercent}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* マイナス寄与（コンディション低下に寄与） */}
              {tagCorrelation.negative.length > 0 && (() => {
                // マイナス寄与の最大値を計算
                const maxContribution = Math.max(...tagCorrelation.negative.map(item => Math.abs(item.contribution)));
                return (
                  <div>
                    <h3 className="text-sm font-semibold text-red-700 mb-3">
                      マイナス寄与（コンディション低下）
                    </h3>
                    <div className="space-y-3">
                      {tagCorrelation.negative.map((item) => {
                        const barWidth = maxContribution > 0 ? (Math.abs(item.contribution) / maxContribution) * 100 : 0;
                        const probabilityPercent = Math.round(item.probabilitySameSign * 100);
                        const confidencePercent = Math.round(item.confidence * 100);
                        return (
                          <div
                            key={item.tagId}
                            className="flex flex-col gap-2 border-b pb-3 last:border-0"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-red-100 text-red-800 flex-shrink-0">
                                  {item.tagName}
                                </span>
                                <span className="text-xs text-gray-600 truncate">
                                  {item.occurrenceCount}回
                                </span>
                                <span className="text-xs text-gray-500 truncate">
                                  観測{item.observationCount}件
                                </span>
                              </div>
                              <div className="text-sm font-medium text-red-600 flex-shrink-0">
                                {item.contribution.toFixed(2)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-red-500 transition-opacity"
                                  style={{
                                    width: `${barWidth}%`,
                                    opacity: item.confidence
                                  }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 flex-shrink-0 w-10 text-right">
                                {probabilityPercent}%
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              95%信用区間: {item.credibleInterval.lower.toFixed(2)}〜{item.credibleInterval.upper.toFixed(2)} ／ 信頼係数: {confidencePercent}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* データがない場合 */}
              {tagCorrelation.positive.length === 0 && tagCorrelation.negative.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  この期間にタグデータがありません
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
