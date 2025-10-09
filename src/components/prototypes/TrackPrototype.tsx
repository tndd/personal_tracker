import { useMemo, useState } from "react";
import { AppHeader } from "../AppHeader";
import type { AppTab } from "../AppHeader";

export interface TrackTag {
  id: string;
  name: string;
  color: string;
}

export interface TagCategory {
  id: string;
  name: string;
  tags: TrackTag[];
}

export interface TrackEntry {
  id: string;
  memo: string;
  condition: -2 | -1 | 0 | 1 | 2;
  createdAt: string;
  updatedAt: string;
  tags: TrackTag[];
}

export interface TrackPrototypeProps {
  entries: TrackEntry[];
  categories: TagCategory[];
  recentTags: TrackTag[];
  hasUnread?: boolean;
  activeTab?: AppTab;
}

const CONDITION_LABEL: Record<TrackEntry["condition"], string> = {
  "-2": "とても悪い",
  "-1": "やや悪い",
  0: "普通",
  1: "やや良い",
  2: "とても良い",
};

const CONDITION_COLORS: Record<TrackEntry["condition"], string> = {
  "-2": "bg-red-600",
  "-1": "bg-orange-500",
  0: "bg-gray-500",
  1: "bg-sky-500",
  2: "bg-blue-700",
};

/**
 * Track画面のワイヤーフレーム兼プロトタイプ。
 */
export function TrackPrototype({
  entries,
  categories,
  recentTags,
  hasUnread = true,
  activeTab = "track",
}: TrackPrototypeProps) {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [conditionFilter, setConditionFilter] = useState<
    TrackEntry["condition"][]
  >([-2, -1, 0, 1, 2]);
  const [openCategories, setOpenCategories] = useState<string[]>(
    categories.map((cat) => cat.id)
  );

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchCondition = conditionFilter.includes(entry.condition);
      const matchTag =
        selectedTagIds.length === 0 ||
        entry.tags.some((tag) => selectedTagIds.includes(tag.id));
      return matchCondition && matchTag;
    });
  }, [conditionFilter, entries, selectedTagIds]);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const toggleCondition = (value: TrackEntry["condition"]) => {
    setConditionFilter((prev) =>
      prev.includes(value)
        ? prev.filter((cond) => cond !== value)
        : [...prev, value]
    );
  };

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader activeTab={activeTab} />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        {hasUnread && (
          <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-700">
            <span>新着のトラックがあります。タイムラインを更新しますか？</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded border border-indigo-500 px-2 py-1 text-indigo-600"
              >
                後で確認
              </button>
              <button
                type="button"
                className="rounded bg-indigo-600 px-3 py-1 text-white"
              >
                更新する
              </button>
            </div>
          </div>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">新規トラック</h2>
          <form className="mt-4 flex flex-col gap-4">
            <textarea
              className="min-h-[120px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring"
              placeholder="今起きたことや気づきを記録..."
            />
            <div>
              <p className="text-xs font-semibold text-gray-500">コンディション</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {([-2, -1, 0, 1, 2] as TrackEntry["condition"][]).map(
                  (condition) => (
                    <button
                      key={condition}
                      type="button"
                      className={`rounded-full border px-3 py-1 text-sm transition ${
                        condition === 0 ? "border-gray-400" : "border-transparent"
                      } bg-gray-100 text-gray-700 hover:bg-gray-200`}
                    >
                      {condition} {CONDITION_LABEL[condition]}
                    </button>
                  )
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500">タグ選択</p>
              <div className="mt-3 space-y-2">
                {categories.map((category) => {
                  const open = openCategories.includes(category.id);
                  return (
                    <div key={category.id} className="rounded-lg border border-gray-200">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
                        onClick={() => toggleCategory(category.id)}
                      >
                        <span>{category.name}</span>
                        <span className="text-xs text-gray-400">
                          {open ? "閉じる" : "開く"}
                        </span>
                      </button>
                      {open && (
                        <div className="border-t border-gray-100 px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            {category.tags.map((tag) => {
                              const active = selectedTagIds.includes(tag.id);
                              return (
                                <button
                                  key={tag.id}
                                  type="button"
                                  onClick={() => toggleTag(tag.id)}
                                  className={`rounded-full border px-3 py-1 text-xs transition ${
                                    active
                                      ? "border-indigo-500 bg-indigo-100 text-indigo-700"
                                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                                  }`}
                                >
                                  {tag.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500">最近使ったタグ</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {recentTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      selectedTagIds.includes(tag.id)
                        ? "border-indigo-500 bg-indigo-100 text-indigo-700"
                        : "border-gray-200 bg-white text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600"
              >
                クリア
              </button>
              <button
                type="submit"
                className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                記録する
              </button>
            </div>
          </form>
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">タイムライン</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                {([-2, -1, 0, 1, 2] as TrackEntry["condition"][]).map((value) => (
                  <label
                    key={value}
                    className="flex items-center gap-1 text-xs text-gray-600"
                  >
                    <input
                      type="checkbox"
                      checked={conditionFilter.includes(value)}
                      onChange={() => toggleCondition(value)}
                      className="h-3 w-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    {value}
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <input
                  type="search"
                  placeholder="メモ検索..."
                  className="rounded-lg border border-gray-200 px-3 py-1.5 focus:border-indigo-500 focus:outline-none focus:ring"
                />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm"
              >
                <header className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <time>{entry.createdAt}</time>
                    <span className="text-xs text-gray-400">
                      更新 {entry.updatedAt}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white ${CONDITION_COLORS[entry.condition]}`}
                    >
                      {entry.condition} {CONDITION_LABEL[entry.condition]}
                    </span>
                    <div className="flex gap-2 text-xs text-indigo-600">
                      <button type="button">編集</button>
                      <button type="button">削除</button>
                      <button type="button">タグ管理</button>
                    </div>
                  </div>
                </header>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-800">
                  {entry.memo}
                </p>
                <footer className="mt-3 flex flex-wrap gap-2">
                  {entry.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600"
                    >
                      {tag.name}
                    </span>
                  ))}
                </footer>
              </article>
            ))}
            {filteredEntries.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500">
                条件に一致するトラックがありません。フィルタを調整してください。
              </div>
            )}
          </div>
          <div className="flex items-center justify-center">
            <button
              type="button"
              className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-600"
            >
              過去のトラックを読み込む
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
