import {
  ChangeEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AppTab } from "../AppHeader";
import { AppTabNav } from "../AppTabNav";

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

const CONDITION_OPTIONS: TrackEntry["condition"][] = [-2, -1, 0, 1, 2];
const DRAFT_LIMIT = 1000;

/**
 * ストリング形式の日時を比較しやすい `Date` へ変換する。
 * Storybook上では `YYYY-MM-DD HH:mm` 形式の値が来るため "T" を付与して補正する。
 */
function parseTrackDate(value: string): Date {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(value);
  }
  return parsed;
}

/**
 * Track用の日時表示フォーマット。Storybookのダミーデータと揃える。
 */
function formatTrackDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * Track画面のワイヤーフレーム兼プロトタイプ。
 * Slack風にタイムラインを上部に配置し、入力エリアを下部に寄せている。
 */
export function TrackPrototype({
  entries,
  categories,
  activeTab = "track",
}: TrackPrototypeProps) {
  const [internalEntries, setInternalEntries] = useState<TrackEntry[]>(() => [
    ...entries,
  ]);
  const [draft, setDraft] = useState("");
  const [composerCondition, setComposerCondition] =
    useState<TrackEntry["condition"]>(0);
  const [composerTags, setComposerTags] = useState<TrackTag[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const mentionButtonRef = useRef<HTMLButtonElement | null>(null);
  const mentionPopoverRef = useRef<HTMLDivElement | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [conditionFilter, setConditionFilter] = useState<
    TrackEntry["condition"][]
  >([...CONDITION_OPTIONS]);
  const [openCategories, setOpenCategories] = useState<string[]>(
    categories.map((category) => category.id)
  );
  const [composerOpenCategories, setComposerOpenCategories] = useState<
    string[]
  >(categories.map((category) => category.id));
  const [activeSection, setActiveSection] = useState<
    "search" | "inbox" | "saved"
  >("search");
  const [showSearchPanel, setShowSearchPanel] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedEntryIds, setSavedEntryIds] = useState<string[]>([]);

  // 無限スクロール用の状態
  const [displayCount, setDisplayCount] = useState(20);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const previousFilterKeyRef = useRef<string>("");
  const timelineLengthRef = useRef<number>(entries.length);

  useEffect(() => {
    setInternalEntries(entries);
  }, [entries]);

  useEffect(() => {
    setOpenCategories(categories.map((category) => category.id));
    setComposerOpenCategories(categories.map((category) => category.id));
  }, [categories]);

  const composerTagIdSet = useMemo(() => {
    return new Set(composerTags.map((tag) => tag.id));
  }, [composerTags]);

  const savedEntryIdSet = useMemo(() => {
    return new Set(savedEntryIds);
  }, [savedEntryIds]);

  const normalizedEntries = useMemo(() => {
    return [...internalEntries].sort((a, b) => {
      return (
        parseTrackDate(a.createdAt).getTime() -
        parseTrackDate(b.createdAt).getTime()
      );
    });
  }, [internalEntries]);

  const totalEntryCount = useMemo(() => {
    return normalizedEntries.length;
  }, [normalizedEntries]);

  const recentTags = useMemo(() => {
    const tagStats = new Map<
      string,
      { tag: TrackTag; count: number; latest: number }
    >();
    normalizedEntries.forEach((entry) => {
      const createdAt = parseTrackDate(entry.createdAt).getTime();
      entry.tags.forEach((tag) => {
        const current = tagStats.get(tag.id);
        if (current) {
          current.count += 1;
          current.latest = Math.max(current.latest, createdAt);
        } else {
          tagStats.set(tag.id, { tag, count: 1, latest: createdAt });
        }
      });
    });
    return [...tagStats.values()]
      .sort((a, b) => {
        if (a.count === b.count) {
          return b.latest - a.latest;
        }
        return b.count - a.count;
      })
      .slice(0, 5)
      .map((item) => item.tag);
  }, [normalizedEntries]);

  const normalizedConditionFilter = useMemo(() => {
    return [...conditionFilter].sort().join(",");
  }, [conditionFilter]);

  const normalizedTagFilter = useMemo(() => {
    return [...selectedTagIds].sort().join(",");
  }, [selectedTagIds]);

  const searchFilteredEntries = useMemo(() => {
    if (activeSection !== "search") {
      return normalizedEntries;
    }
    const trimmedQuery = searchQuery.trim().toLowerCase();
    return normalizedEntries.filter((entry) => {
      const matchCondition = conditionFilter.includes(entry.condition);
      const matchTag =
        selectedTagIds.length === 0 ||
        entry.tags.some((tag) => selectedTagIds.includes(tag.id));
      const matchText =
        trimmedQuery.length === 0 ||
        entry.memo.toLowerCase().includes(trimmedQuery) ||
        entry.tags.some((tag) => tag.name.toLowerCase().includes(trimmedQuery));
      return matchCondition && matchTag && matchText;
    });
  }, [
    activeSection,
    conditionFilter,
    normalizedEntries,
    searchQuery,
    selectedTagIds,
  ]);

  const timelineEntries = useMemo(() => {
    if (activeSection === "saved") {
      return normalizedEntries.filter((entry) => savedEntryIdSet.has(entry.id));
    }
    if (activeSection === "search") {
      return searchFilteredEntries;
    }
    return normalizedEntries;
  }, [activeSection, normalizedEntries, savedEntryIdSet, searchFilteredEntries]);

  // 表示するエントリー（無限スクロール用に制限）
  // 最新20件から始める（配列の最後から取得）
  const displayedEntries = useMemo(() => {
    const startIndex = Math.max(0, timelineEntries.length - displayCount);
    return timelineEntries.slice(startIndex);
  }, [timelineEntries, displayCount]);

  // 初回表示時にスクロール位置を最下部に設定
  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, []);

  const filterKey = useMemo(() => {
    return `${activeSection}|${searchQuery}|${normalizedTagFilter}|${normalizedConditionFilter}`;
  }, [activeSection, normalizedConditionFilter, normalizedTagFilter, searchQuery]);

  useEffect(() => {
    // フィルター条件の変化に応じて表示件数とスクロール位置を整える。
    const filtersChanged = previousFilterKeyRef.current !== filterKey;
    const previousLength = timelineLengthRef.current;
    const currentLength = timelineEntries.length;

    if (filtersChanged) {
      const initialCount = currentLength > 20 ? 20 : currentLength;
      setDisplayCount(initialCount);
      if (timelineRef.current) {
        timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
      }
    } else if (currentLength < previousLength && displayCount > currentLength) {
      setDisplayCount(currentLength);
    }

    previousFilterKeyRef.current = filterKey;
    timelineLengthRef.current = currentLength;
  }, [displayCount, filterKey, timelineEntries.length]);

  // 無限スクロールの監視（上方向にスクロール）
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entriesList) => {
        const target = entriesList[0];
        if (target.isIntersecting && displayCount < timelineEntries.length) {
          // スクロール位置を保存
          const scrollContainer = timelineRef.current;
          const previousScrollHeight = scrollContainer?.scrollHeight || 0;
          const previousScrollTop = scrollContainer?.scrollTop || 0;

          setDisplayCount((prev) => {
            const newCount = Math.min(prev + 20, timelineEntries.length);

            // データ追加後にスクロール位置を調整
            setTimeout(() => {
              if (scrollContainer) {
                const newScrollHeight = scrollContainer.scrollHeight;
                const heightDifference = newScrollHeight - previousScrollHeight;
                scrollContainer.scrollTop = previousScrollTop + heightDifference;
              }
            }, 0);

            return newCount;
          });
        }
      },
      { threshold: 0.1 }
    );

    const target = loadingRef.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [displayCount, timelineEntries.length]);

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

  const toggleSavedEntry = (entryId: string) => {
    setSavedEntryIds((prev) =>
      prev.includes(entryId)
        ? prev.filter((id) => id !== entryId)
        : [...prev, entryId]
    );
  };

  const handleSectionClick = (section: "search" | "inbox" | "saved") => {
    setActiveSection(section);
    if (section === "search") {
      setShowSearchPanel(true);
    } else {
      setShowSearchPanel(false);
    }
  };

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

  const toggleComposerCategory = (categoryId: string) => {
    setComposerOpenCategories((prev) =>
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

  const addComposerTag = (tag: TrackTag) => {
    if (!composerTagIdSet.has(tag.id)) {
      setComposerTags((prev) => [...prev, tag]);
    }
  };

  const toggleComposerTag = (tag: TrackTag) => {
    if (composerTagIdSet.has(tag.id)) {
      setComposerTags((prev) => prev.filter((item) => item.id !== tag.id));
    } else {
      setComposerTags((prev) => [...prev, tag]);
    }
  };

  const removeComposerTag = (tagId: string) => {
    setComposerTags((prev) => prev.filter((tag) => tag.id !== tagId));
  };

  const handleSearchInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchReset = () => {
    setSearchQuery("");
    setSelectedTagIds([]);
    setConditionFilter([...CONDITION_OPTIONS]);
  };

  const handleTimelineTagClick = (tagId: string) => {
    setActiveSection("search");
    setShowSearchPanel(true);
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev : [...prev, tagId]
    );
  };

  const handleDraftChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (event.target.value.length <= DRAFT_LIMIT) {
      setDraft(event.target.value);
      return;
    }
    setDraft(event.target.value.slice(0, DRAFT_LIMIT));
  };

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      (event.metaKey || event.ctrlKey) &&
      draft.trim().length > 0
    ) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const cleaned = draft.trim();
    if (cleaned.length === 0) {
      return;
    }
    const now = new Date();
    const formatted = formatTrackDate(now);
    const newEntry: TrackEntry = {
      id: `local-${now.getTime()}`,
      memo: cleaned,
      condition: composerCondition,
      createdAt: formatted,
      updatedAt: formatted,
      tags: composerTags,
    };
    setInternalEntries((prev) => [...prev, newEntry]);
    setDraft("");
    setComposerTags([]);
    setMentionOpen(false);
    setComposerOpenCategories(categories.map((category) => category.id));
    setTimeout(() => {
      if (timelineRef.current) {
        timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
      }
    }, 0);
  };

  const clearComposer = () => {
    setDraft("");
    setComposerTags([]);
    setMentionOpen(false);
    setComposerCondition(0);
  };

  const canSubmit = draft.trim().length > 0;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* 左端のタブナビゲーション */}
      <AppTabNav activeTab={activeTab} />

      {/* メインコンテンツ */}
      <div className="flex flex-1 flex-col">
        <main className="flex h-screen gap-0">
          {/* 左サイドバー */}
          <aside className="w-60 shrink-0 border-r border-gray-200 bg-white">
            <div className="flex flex-col gap-1 p-3">
              {/* Search */}
              <button
                type="button"
                onClick={() => handleSectionClick("search")}
                className={`flex items-center justify-between rounded px-3 py-2 text-left text-sm font-medium transition ${
                  activeSection === "search"
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span>🔍 Search</span>
                {searchFilteredEntries.length !== normalizedEntries.length && (
                  <span className="rounded bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {searchFilteredEntries.length}
                  </span>
                )}
              </button>

              {/* Inbox */}
              <button
                type="button"
                onClick={() => handleSectionClick("inbox")}
                className={`flex items-center justify-between rounded px-3 py-2 text-left text-sm font-medium transition ${
                  activeSection === "inbox"
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span>📥 Inbox</span>
                {totalEntryCount > 0 && (
                  <span className="rounded bg-indigo-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {totalEntryCount}
                  </span>
                )}
              </button>

              {/* Saved */}
              <button
                type="button"
                onClick={() => handleSectionClick("saved")}
                className={`flex items-center justify-between rounded px-3 py-2 text-left text-sm font-medium transition ${
                  activeSection === "saved"
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span>🔖 Saved</span>
                {savedEntryIds.length > 0 && (
                  <span className="rounded bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {savedEntryIds.length}
                  </span>
                )}
              </button>

              {/* Channels */}
              <div className="mt-4">
                <h3 className="px-3 text-xs font-semibold text-gray-500">
                  Channels
                </h3>
                <div className="mt-2 flex flex-col gap-0.5">
                  <button
                    type="button"
                    className="rounded px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    # general
                  </button>
                  <button
                    type="button"
                    className="rounded px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    # health
                  </button>
                  <button
                    type="button"
                    className="rounded px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    # work
                  </button>
                  <button
                    type="button"
                    className="rounded px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    # personal
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* メインコンテンツエリア */}
          <section className="flex flex-1 flex-col border-r border-gray-200 bg-white">
            {/* Search パネル */}
            {showSearchPanel && (
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="search"
                    placeholder="メモ内検索"
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    className="flex-1 rounded border border-gray-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring"
                  />
                  <button
                    type="button"
                    onClick={handleSearchReset}
                    className="rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
                  >
                    条件をリセット
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600">
                    Condition:
                  </span>
                  {CONDITION_OPTIONS.map((value) => (
                    <label
                      key={value}
                      className="flex items-center gap-1 text-xs text-gray-600"
                    >
                      <input
                        type="checkbox"
                        checked={conditionFilter.includes(value)}
                        onChange={() => toggleConditionFilter(value)}
                        className="h-3 w-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>
                        {value > 0 ? `+${value}` : value}{" "}
                        {CONDITION_LABEL[value]}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-semibold text-gray-600">Tags:</div>
                  {categories.map((category) => {
                    const open = openCategories.includes(category.id);
                    return (
                      <div
                        key={category.id}
                        className="rounded border border-gray-200 bg-white"
                      >
                        <button
                          type="button"
                          onClick={() => toggleCategory(category.id)}
                          className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-gray-600"
                        >
                          <span>{category.name}</span>
                          <span className="text-[11px] text-gray-400">
                            {open ? "▼" : "▶"}
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
                                    className={`rounded-full border px-3 py-1 text-xs transition focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
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
              </div>
            )}

            {/* タイムライン */}
            <div ref={timelineRef} className="flex-1 overflow-y-auto px-4 pb-4 pt-4">
              <div className="flex flex-col gap-4">
                {/* ローディングインジケーター（上部） */}
                {displayCount < timelineEntries.length && (
                  <div
                    ref={loadingRef}
                    className="flex items-center justify-center py-4"
                  >
                    <div className="text-sm text-gray-500">
                      さらに過去のトラックを読み込み中...
                    </div>
                  </div>
                )}

                {displayedEntries.map((entry) => {
                  const displayCondition =
                    entry.condition > 0 ? `+${entry.condition}` : `${entry.condition}`;
                  const isSaved = savedEntryIdSet.has(entry.id);
                  return (
                    <article
                      key={entry.id}
                      className="relative rounded-lg border border-gray-100 bg-white/80 p-4 pl-10 shadow-sm"
                    >
                      <span
                        className={`absolute left-4 top-5 h-2 w-2 rounded-full ${CONDITION_DOT_CLASSES[entry.condition]}`}
                      />
                      <header className="flex flex-wrap items-center gap-3">
                        <time className="text-xs text-gray-500">
                          {entry.createdAt}
                        </time>
                        <div className="ml-auto flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white ${CONDITION_BADGE_CLASSES[entry.condition]}`}
                          >
                            {displayCondition} {CONDITION_LABEL[entry.condition]}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleSavedEntry(entry.id)}
                            aria-label={
                              isSaved ? "保存リストから外す" : "保存リストに追加"
                            }
                            className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
                              isSaved
                                ? "border-amber-400 bg-amber-50 text-amber-500"
                                : "border-transparent text-gray-300 hover:border-gray-200 hover:bg-gray-100 hover:text-amber-400"
                            }`}
                          >
                            <span className="text-base leading-none">
                              {isSaved ? "★" : "☆"}
                            </span>
                          </button>
                        </div>
                      </header>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">
                        {entry.memo}
                      </p>
                      {entry.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-indigo-600">
                          {entry.tags.map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => handleTimelineTagClick(tag.id)}
                              className="rounded-full bg-indigo-50 px-2 py-0.5 transition hover:bg-indigo-100"
                            >
                              #{tag.name}
                            </button>
                          ))}
                        </div>
                      )}
                      <footer className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <button
                          type="button"
                          className="rounded px-2 py-1 transition hover:bg-gray-100 hover:text-gray-600"
                        >
                          編集
                        </button>
                        <span>・</span>
                        <button
                          type="button"
                          className="rounded px-2 py-1 transition hover:bg-gray-100 hover:text-gray-600"
                        >
                          削除
                        </button>
                        <span>・</span>
                        <button
                          type="button"
                          className="rounded px-2 py-1 transition hover:bg-gray-100 hover:text-gray-600"
                        >
                          Tag管理へ
                        </button>
                      </footer>
                    </article>
                  );
                })}

                {timelineEntries.length === 0 && (
                  <div className="self-center rounded-lg border border-dashed border-gray-300 px-6 py-6 text-center text-sm text-gray-500">
                    {activeSection === "saved"
                      ? "保存したトラックがありません。"
                      : activeSection === "inbox"
                        ? "トラックの記録がまだありません。"
                        : "条件に一致するトラックがありません。"}
                  </div>
                )}
              </div>
            </div>

            {/* 新規トラック入力エリア */}
            <div className="border-t border-gray-200 bg-white px-4 py-4">
              <header className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-gray-900">新規トラック</h2>
                <div className="flex flex-wrap items-center gap-2">
                  {CONDITION_OPTIONS.map((value) => (
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
                      {value > 0 ? `+${value}` : value}
                    </button>
                  ))}
                </div>
              </header>
              <div className="mt-3 space-y-3">
                <div className="relative">
                  <textarea
                    value={draft}
                    onChange={handleDraftChange}
                    onKeyDown={handleDraftKeyDown}
                    className="h-20 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring"
                    placeholder="メモや気づきを記録。@ からタグを呼び出せます..."
                  />
                  <div className="pointer-events-none absolute inset-x-3 bottom-2 flex items-center justify-between text-xs text-gray-400">
                    <span>Shift + Enter で改行</span>
                    <span className={draft.length >= DRAFT_LIMIT ? "text-red-500" : undefined}>
                      {draft.length}/{DRAFT_LIMIT}
                    </span>
                  </div>
                </div>
                {composerTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {composerTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => removeComposerTag(tag.id)}
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
                    <button
                      type="button"
                      disabled={!canSubmit}
                      onClick={handleSubmit}
                      className={`rounded px-4 py-2 text-sm font-semibold shadow-sm transition ${
                        canSubmit
                          ? "bg-indigo-600 text-white hover:bg-indigo-500"
                          : "cursor-not-allowed bg-gray-200 text-gray-400"
                      }`}
                    >
                      記録する
                    </button>
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
                                  onClick={() => addComposerTag(tag)}
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
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-600">
                      最近使ったタグ
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500">
                      <span>クリックで追加</span>
                    </div>
                  </div>
                  {recentTags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {recentTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleComposerTag(tag)}
                          className={`rounded-full px-3 py-1 text-xs transition ${
                            composerTagIdSet.has(tag.id)
                              ? "bg-indigo-600 text-white"
                              : "bg-white text-gray-600 hover:bg-indigo-100"
                          }`}
                        >
                          #{tag.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] text-gray-500">
                      まだタグ付きのトラックがありません。
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
                  <header className="flex items-center justify-between text-xs text-gray-600">
                    <span>カテゴリからタグを付与</span>
                    <button
                      type="button"
                      onClick={() =>
                        setComposerOpenCategories((prev) =>
                          prev.length === categories.length
                            ? []
                            : categories.map((category) => category.id)
                        )
                      }
                      className="text-[11px] text-indigo-600 hover:underline"
                    >
                      {composerOpenCategories.length === categories.length
                        ? "すべて閉じる"
                        : "すべて開く"}
                    </button>
                  </header>
                  <div className="mt-3 space-y-2">
                    {categories.map((category) => {
                      const open = composerOpenCategories.includes(category.id);
                      return (
                        <div
                          key={category.id}
                          className="rounded border border-gray-200 bg-white"
                        >
                          <button
                            type="button"
                            onClick={() => toggleComposerCategory(category.id)}
                            className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-gray-600"
                          >
                            <span>{category.name}</span>
                            <span className="text-[11px] text-gray-400">
                              {open ? "▼" : "▶"}
                            </span>
                          </button>
                          {open && (
                            <div className="border-t border-gray-100 px-3 py-2">
                              <div className="flex flex-wrap gap-2">
                                {category.tags.map((tag) => {
                                  const active = composerTagIdSet.has(tag.id);
                                  return (
                                    <button
                                      key={tag.id}
                                      type="button"
                                      onClick={() => toggleComposerTag(tag)}
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
                  <div className="mt-3 flex justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={clearComposer}
                      className="rounded border border-gray-200 px-3 py-1 text-gray-500 hover:border-indigo-300 hover:text-indigo-600"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      className={`rounded px-3 py-1 font-semibold transition ${
                        canSubmit
                          ? "bg-indigo-600 text-white hover:bg-indigo-500"
                          : "cursor-not-allowed bg-gray-200 text-gray-400"
                      }`}
                    >
                      記録する
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
