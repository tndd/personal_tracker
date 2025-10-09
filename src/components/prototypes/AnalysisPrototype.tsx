import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { AppHeader } from "../AppHeader";

export interface ConditionPoint {
  date: string;
  condition: number | null;
}

export interface TagCorrelationRow {
  tagId: string;
  tagName: string;
  usageCount: number;
  averageCondition: number | null;
}

export interface AnalysisPrototypeProps {
  trend: ConditionPoint[];
  correlations: TagCorrelationRow[];
}

const PRESETS = [
  { label: "7日", range: 7 },
  { label: "30日", range: 30 },
  { label: "90日", range: 90 },
  { label: "カスタム", range: null },
];

function toBarWidth(usageCount: number, max: number) {
  if (max <= 0) return "0%";
  const ratio = usageCount / max;
  return `${Math.max(10, ratio * 100)}%`;
}

function conditionToColor(value: number | null) {
  if (value === null) return "bg-gray-200 text-gray-500";
  if (value <= -1.5) return "bg-red-600 text-white";
  if (value < 0) return "bg-orange-500 text-white";
  if (value === 0) return "bg-gray-400 text-white";
  if (value < 1.5) return "bg-sky-500 text-white";
  return "bg-blue-700 text-white";
}

/**
 * Analysis画面のプロトタイプ。期間変更とタグ相関の可視化を表現。
 */
export function AnalysisPrototype({
  trend,
  correlations,
}: AnalysisPrototypeProps) {
  const [selectedRange, setSelectedRange] = useState<number | null>(30);
  const [highlightedTag, setHighlightedTag] = useState<string | null>(null);

  const maxUsage = useMemo(
    () => Math.max(...correlations.map((row) => row.usageCount), 0),
    [correlations]
  );

  const highlightedRow = correlations.find(
    (row) => row.tagId === highlightedTag
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader activeTab="analysis" />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <section className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={`rounded-full px-4 py-1 text-sm ${
                selectedRange === preset.range
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
              onClick={() => setSelectedRange(preset.range)}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-500"
          >
            期間詳細
          </button>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <header className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    コンディション推移
                  </h2>
                  <p className="text-xs text-gray-500">
                    Daily.condition の直近推移
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>最高値: {Math.max(...trend.map((p) => p.condition ?? -2))}</span>
                  <span>最低値: {Math.min(...trend.map((p) => p.condition ?? 2))}</span>
                </div>
              </header>
              <div className="mt-4 h-56 rounded-lg border border-dashed border-gray-300 bg-gradient-to-b from-white via-white to-slate-100">
                <div className="flex h-full items-end gap-2 px-4 pb-4">
                  {trend.map((point) => {
                    const height =
                      point.condition === null
                        ? 6
                        : ((point.condition + 2) / 4) * 100;
                    return (
                      <div
                        key={point.date}
                        className="flex w-full flex-col items-center gap-2"
                      >
                        <div className="relative flex h-full w-full items-end">
                          <div
                            className={`mx-auto w-3 rounded-full ${
                              point.condition === null
                                ? "bg-gray-200"
                                : point.condition >= 1
                                ? "bg-indigo-500"
                                : point.condition <= -1
                                ? "bg-orange-500"
                                : "bg-gray-400"
                            }`}
                            style={{ height: `${Math.max(height, 6)}%` }}
                          />
                        </div>
                        <time className="text-[10px] text-gray-400">
                          {format(parseISO(point.date), "MM/dd", { locale: ja })}
                        </time>
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <header className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    タグとコンディションの相関
                  </h2>
                  <p className="text-xs text-gray-500">
                    トラックでの出現回数と平均コンディション
                  </p>
                </div>
                <div className="flex gap-2 text-xs text-gray-400">
                  <button type="button">使用回数順</button>
                  <button type="button">コンディション順</button>
                </div>
              </header>
              <table className="mt-4 w-full table-fixed text-left text-sm text-gray-700">
                <thead>
                  <tr className="text-xs text-gray-500">
                    <th className="w-2/5 pb-2 font-medium">タグ</th>
                    <th className="w-1/5 pb-2 font-medium">使用回数</th>
                    <th className="w-1/5 pb-2 font-medium">平均</th>
                    <th className="w-1/5 pb-2 font-medium">推移</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {correlations.map((row) => (
                    <tr
                      key={row.tagId}
                      className={`cursor-pointer transition ${
                        highlightedTag === row.tagId ? "bg-indigo-50" : ""
                      }`}
                      onClick={() =>
                        setHighlightedTag(
                          highlightedTag === row.tagId ? null : row.tagId
                        )
                      }
                    >
                      <td className="py-3">
                        <div className="font-medium text-gray-900">
                          {row.tagName}
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-indigo-400"
                            style={{
                              width: toBarWidth(row.usageCount, maxUsage),
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-3 text-gray-600">{row.usageCount}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex min-w-[3rem] justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${conditionToColor(
                            row.averageCondition
                          )}`}
                        >
                          {row.averageCondition?.toFixed(1) ?? "-"}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-indigo-500">
                        詳細
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          </div>

          <aside className="h-fit space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                深掘りサイドバー
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                タグ行をクリックすると直近のトラックがここに表示される。
              </p>
            </div>
            {highlightedRow ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                  <h4 className="text-sm font-semibold text-indigo-700">
                    {highlightedRow.tagName}
                  </h4>
                  <p className="mt-1 text-xs text-indigo-500">
                    平均コンディション{" "}
                    {highlightedRow.averageCondition?.toFixed(2) ?? "-"}
                  </p>
                </div>
                <div className="space-y-2">
                  {[1, 2, 3].map((index) => (
                    <article
                      key={index}
                      className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                    >
                      <header className="flex items-center justify-between text-xs text-gray-500">
                        <time>2025-10-0{index} 08:3{index}</time>
                        <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-white">
                          +1
                        </span>
                      </header>
                      <p className="mt-2 text-sm text-gray-700">
                        直近のトラック概要。タグ関連メモを表示。
                      </p>
                    </article>
                  ))}
                </div>
                <button
                  type="button"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-600"
                >
                  さらに読み込む
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
                タグ行を選択すると詳細が表示されます。
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}
