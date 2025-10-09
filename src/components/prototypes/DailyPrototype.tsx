import { useMemo, useState } from "react";
import { addDays, format, parseISO, startOfMonth } from "date-fns";
import { ja } from "date-fns/locale";
import { AppHeader } from "../AppHeader";

export interface DailyRecord {
  date: string;
  memo: string | null;
  condition: -2 | -1 | 0 | 1 | 2;
  updatedAt: string;
}

export interface DailyPrototypeProps {
  records: DailyRecord[];
}

const CONDITION_TO_COLOR: Record<DailyRecord["condition"], string> = {
  "-2": "bg-red-600 text-white",
  "-1": "bg-orange-500 text-white",
  0: "bg-gray-300 text-gray-800",
  1: "bg-sky-400 text-white",
  2: "bg-blue-700 text-white",
};

const PRESETS: { label: string; days: number }[] = [
  { label: "7日", days: 7 },
  { label: "30日", days: 30 },
  { label: "90日", days: 90 },
];

function buildCalendarMatrix(reference: Date) {
  const startDate = startOfMonth(reference);
  const startWeekday = startDate.getDay();
  const firstCellDate = addDays(startDate, -startWeekday);
  const rows = [];
  for (let week = 0; week < 6; week += 1) {
    const days = [];
    for (let day = 0; day < 7; day += 1) {
      days.push(addDays(firstCellDate, week * 7 + day));
    }
    rows.push(days);
  }
  return rows;
}

/**
 * Daily画面のプロトタイプ。カレンダーとリストの二段レイアウトを確認できる。
 */
export function DailyPrototype({ records }: DailyPrototypeProps) {
  const [mode, setMode] = useState<"calendar" | "list">("calendar");
  const [selectedDate, setSelectedDate] = useState<string | null>(
    records[0]?.date ?? null
  );
  const [presetDays, setPresetDays] = useState<number>(30);

  const recordMap = useMemo(() => {
    return new Map(records.map((record) => [record.date, record]));
  }, [records]);

  const referenceDate = selectedDate
    ? parseISO(selectedDate)
    : parseISO(records[0]?.date ?? format(new Date(), "yyyy-MM-dd"));
  const calendar = buildCalendarMatrix(referenceDate);

  const listViewRecords = useMemo(() => {
    const sorted = [...records].sort((a, b) => (a.date > b.date ? -1 : 1));
    return sorted.slice(0, presetDays);
  }, [records, presetDays]);

  const activeRecord = selectedDate ? recordMap.get(selectedDate) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader activeTab="daily" />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={`rounded-full px-4 py-1 text-sm ${
                mode === "calendar"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
              onClick={() => setMode("calendar")}
            >
              カレンダー
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-1 text-sm ${
                mode === "list"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
              onClick={() => setMode("list")}
            >
              リスト
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {PRESETS.map((preset) => (
              <button
                key={preset.days}
                type="button"
                onClick={() => setPresetDays(preset.days)}
                className={`rounded-full border px-3 py-1 ${
                  presetDays === preset.days
                    ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                    : "border-gray-200 bg-white"
                }`}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              className="rounded-full border border-gray-200 px-3 py-1"
            >
              カスタム
            </button>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            {mode === "calendar" ? (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <header className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {format(referenceDate, "yyyy年M月", { locale: ja })}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded border border-gray-200 px-3 py-1 text-sm text-gray-500"
                    >
                      前月
                    </button>
                    <button
                      type="button"
                      className="rounded border border-gray-200 px-3 py-1 text-sm text-gray-500"
                    >
                      次月
                    </button>
                  </div>
                </header>
                <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-500">
                  {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-2">
                  {calendar.map((week, index) => (
                    <div key={index} className="contents">
                      {week.map((date) => {
                        const key = format(date, "yyyy-MM-dd");
                        const record = recordMap.get(key);
                        const isSelected = selectedDate === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setSelectedDate(key)}
                            className={`flex h-24 flex-col justify-between rounded-xl border p-2 text-left transition ${
                              isSelected
                                ? "border-indigo-500 bg-indigo-50"
                                : "border-gray-200 bg-white hover:border-indigo-200"
                            }`}
                          >
                            <span className="text-sm font-semibold text-gray-600">
                              {format(date, "d")}
                            </span>
                            {record ? (
                              <span
                                className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs ${CONDITION_TO_COLOR[record.condition]}`}
                              >
                                {record.condition}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-300">
                                未記録
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {listViewRecords.map((record) => (
                  <article
                    key={record.date}
                    className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition ${
                      selectedDate === record.date
                        ? "border-indigo-400"
                        : "border-gray-200"
                    }`}
                  >
                    <header className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">
                          {format(parseISO(record.date), "yyyy年M月d日(E)", {
                            locale: ja,
                          })}
                        </h3>
                        <time className="text-xs text-gray-400">
                          更新 {record.updatedAt}
                        </time>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${CONDITION_TO_COLOR[record.condition]}`}
                      >
                        {record.condition}
                      </span>
                    </header>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                      {record.memo ?? "メモは未入力です。"}
                    </p>
                    <footer className="mt-4 flex gap-3 text-xs text-indigo-600">
                      <button
                        type="button"
                        onClick={() => setSelectedDate(record.date)}
                      >
                        編集
                      </button>
                      <button type="button">削除</button>
                    </footer>
                  </article>
                ))}
              </div>
            )}
          </div>
          <aside className="h-fit rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedDate
                ? format(parseISO(selectedDate), "yyyy年M月d日(E)", {
                    locale: ja,
                  })
                : "日付を選択"}
            </h2>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500">コンディション</p>
                <div className="mt-2 flex gap-2">
                  {([-2, -1, 0, 1, 2] as DailyRecord["condition"][]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`rounded-full px-3 py-1 text-xs ${
                        activeRecord?.condition === value
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">メモ</p>
                <textarea
                  className="mt-2 h-40 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring"
                  defaultValue={activeRecord?.memo ?? ""}
                  placeholder="日記を入力..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600"
                >
                  リセット
                </button>
                <button
                  type="button"
                  className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  保存
                </button>
              </div>
            </div>
          </aside>
        </section>

        <section className="rounded-xl border border-dashed border-gray-300 px-6 py-8 text-center text-sm text-gray-500">
          指定期間内の記録が不足している場合、期間を拡張すると過去の記録が表示されます。
        </section>
      </main>
    </div>
  );
}
