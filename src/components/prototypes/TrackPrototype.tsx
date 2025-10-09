import { useEffect, useMemo, useRef, useState } from "react";
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

const CONDITION_BADGE_CLASSES: Record<TrackEntry["condition"], string> = {
  "-2": "bg-red-600",
  "-1": "bg-orange-500",
  0: "bg-gray-500",
  1: "bg-sky-500",
  2: "bg-blue-700",
};

const CONDITION_DOT_CLASSES: Record<TrackEntry["condition"], string> = {
  "-2": "bg-red-500",
  "-1": "bg-orange-400",
  0: "bg-gray-400",
  1: "bg-sky-400",
  2: "bg-blue-600",
};

/**
 * Track画面のワイヤーフレーム兼プロトタイプ。
 * Slack風にタイムラインを上部に配置し、入力エリアを下部に寄せている。
 */
export function TrackPrototype({
  entries,
  categories,
  hasUnread = true,
  activeTab = "track",
}: TrackPrototypeProps) {
  const [draft, setDraft] = useState("");
  const [composerCondition, setComposerCondition] =
    useState<TrackEntry["condition"]>(0);
  const [selectedMentions, setSelectedMentions] = useState<TrackTag[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const mentionButtonRef = useRef<HTMLButtonElement | null>(null);
  const mentionPopoverRef = useRef<HTMLDivElement | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [conditionFilter, setConditionFilter] = useState<
    TrackEntry["condition"][]
  >([-2, -1, 0, 1, 2]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<string[]>(
    categories.map((category) => category.id)
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

  const timelineEntries = useMemo(() => {
    return [...filteredEntries].reverse();
  }, [filteredEntries]);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleConditionFilter = (value: TrackEntry["condition"]) => {
    setConditionFilter((prev) =>
      prev.includes(value)
        ? prev.filter((cond) => cond !== value)
        : [...prev, value]
    );
  };

  const addMention = (tag: TrackTag) => {
    if (!selectedMentions.some((item) => item.id === tag.id)) {
      setSelectedMentions((prev) => [...prev, tag]);
    }
    setDraft((prev) => {
      const spacing =
        prev.length === 0 || prev.endsWith(" ") || prev.endsWith("\n") ? "" : " ";
      return `${prev}${spacing}@${tag.name} `;
    });
  };

  const removeMention = (tagId: string) => {
    setSelectedMentions((prev) => prev.filter((tag) => tag.id !== tagId));
  };

  useEffect(() => {
    if (!mentionOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        mentionPopoverRef.current &&
        !mentionPopoverRef.current.contains(target) &&
        mentionButtonRef.current &&
        !mentionButtonRef.current.contains(target)
      ) {
        setMentionOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [mentionOpen]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader activeTab={activeTab} />
      <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-5xl flex-col gap-6 px-6 py-6">
        <section className="flex flex-1 flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
          {hasUnread && (
            <div className="flex items-center justify-between bg-indigo-50 px-4 py-2 text-xs text-indigo-700">
              <span>新着のトラックがあります。最新の投稿を確認しますか？</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded border border-indigo-400 px-2 py-1"
                >
                  後で
                </button>
                <button
                  type="button"
                  className="rounded bg-indigo-600 px-3 py-1 text-white"
                >
                  今すぐ読む
                </button>
              </div>
            </div>
          )}

          <div className="border-b border-gray-200 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-700">トラック</h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  {([-2, -1, 0, 1, 2] as TrackEntry["condition"][]).map((value) => (
                    <label
                      key={value}
                      className="flex items-center gap-1 text-[11px] text-gray-600"
                    >
                      <input
                        type="checkbox"
                        checked={conditionFilter.includes(value)}
                        onChange={() => toggleConditionFilter(value)}
                        className="h-3 w-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      {value}
                    </label>
                  ))}
                </div>
                <input
                  type="search"
                  placeholder="メモ内検索"
                  className="rounded border border-gray-200 px-3 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring"
                />
                <button
                  type="button"
                  onClick={() => setFilterOpen((prev) => !prev)}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
                >
                  タグフィルタ
                </button>
              </div>
            </div>
            {filterOpen && (
              <div className="mt-3 space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
                {categories.map((category) => {
                  const open = openCategories.includes(category.id);
                  return (
                    <div key={category.id} className="rounded border border-gray-200 bg-white">
                      <button
                        type="button"
                        onClick={() => toggleCategory(category.id)}
                        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-gray-600"
                      >
                        <span>{category.name}</span>
                        <span className="text-[11px] text-gray-400">
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
                                  #{tag.name}
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
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="flex h-full flex-col gap-4 pb-6">
              {timelineEntries.map((entry) => {
                const displayCondition =
                  entry.condition > 0 ? `+${entry.condition}` : `${entry.condition}`;
                return (
                  <article
                    key={entry.id}
                    className="relative rounded-lg border border-gray-100 bg-white/80 p-4 pl-10 shadow-sm"
                  >
                    <span
                      className={`absolute left-4 top-5 h-2 w-2 rounded-full ${CONDITION_DOT_CLASSES[entry.condition]}`}
                    />
                    <header className="flex flex-wrap items-center gap-3">
                      <time className="text-xs text-gray-500">{entry.createdAt}</time>
                      <span
                        className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white ${CONDITION_BADGE_CLASSES[entry.condition]}`}
                      >
                        {displayCondition} {CONDITION_LABEL[entry.condition]}
                      </span>
                    </header>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">
                      {entry.memo}
                    </p>
                    {entry.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-indigo-600">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="rounded-full bg-indigo-50 px-2 py-0.5"
                          >
                            #{tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
              {timelineEntries.length === 0 && (
                <div className="self-center rounded-lg border border-dashed border-gray-300 px-6 py-6 text-center text-sm text-gray-500">
                  条件に一致するトラックがありません。
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900">新規トラック</h2>
            <div className="flex flex-wrap items-center gap-2">
              {([-2, -1, 0, 1, 2] as TrackEntry["condition"][]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setComposerCondition(value)}
                  className={`rounded-full px-3 py-1 text-xs transition ${
                    composerCondition === value
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </header>
          <div className="mt-3 space-y-3">
            <div className="relative">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="h-32 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring"
                placeholder="メモや気づきを記録。@ からタグを呼び出せます..."
              />
              <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between text-xs text-gray-400">
                <span>Shift + Enter で改行</span>
                <span>{draft.length}/1000</span>
              </div>
            </div>
            {selectedMentions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedMentions.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => removeMention(tag.id)}
                    className="flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-600"
                  >
                    @{tag.name}
                    <span className="text-[10px] text-indigo-400">×</span>
                  </button>
                ))}
              </div>
            )}
            <div className="relative">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    ref={mentionButtonRef}
                    onClick={() => setMentionOpen((prev) => !prev)}
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
                  >
                    @ タグを挿入
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-400"
                  >
                    添付
                  </button>
                </div>
              </div>
              {mentionOpen && (
                <div
                  ref={mentionPopoverRef}
                  className="absolute bottom-full left-0 mb-2 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
                >
                  <p className="text-[11px] font-semibold text-gray-500">
                    タグを選択
                  </p>
                  <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                    {categories.map((category) => (
                      <div key={category.id} className="space-y-1">
                        <p className="text-[11px] text-gray-400">{category.name}</p>
                        <div className="flex flex-wrap gap-2">
                          {category.tags.map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => addMention(tag)}
                              className="rounded-full border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
                            >
                              @{tag.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                記録する
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
