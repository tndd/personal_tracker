"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { TrackForm } from "@/components/track/track-form";
import { TrackCard } from "@/components/track/track-card";
import { TrackSidebarContent } from "@/components/track/track-sidebar-content";
import { useSidebarContent } from "@/contexts/sidebar-content-context";
import { ArrowUp, Loader2 } from "lucide-react";
import type { Track, Tag, Category } from "@/lib/db/schema";

// トラックとタグ情報を組み合わせた型
type TrackWithTags = Track & {
  tags: Array<Tag & { category: Category }>;
};

export default function TrackPage() {
  const { setSidebarContent } = useSidebarContent();

  const [tracks, setTracks] = useState<TrackWithTags[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadButtonRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // タグ情報のキャッシュ
  const [tagsCache, setTagsCache] = useState<Map<string, Tag & { category: Category }>>(new Map());

  // フィルター状態
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // タグ情報を取得してキャッシュする
  const fetchTagsInfo = useCallback(async (tagIds: string[]) => {
    if (tagIds.length === 0) return [];

    const uncachedIds = tagIds.filter((id) => !tagsCache.has(id));

    if (uncachedIds.length > 0) {
      try {
        // カテゴリ一覧を取得
        const categoriesRes = await fetch("/api/categories");
        if (!categoriesRes.ok) {
          console.error("カテゴリ取得エラー");
          return [];
        }
        const categoriesData = await categoriesRes.json();
        const categories: Category[] = categoriesData.items;

        // 各カテゴリのタグを取得してキャッシュに追加
        for (const category of categories) {
          const tagsRes = await fetch(`/api/tags?category_id=${category.id}`);
          if (tagsRes.ok) {
            const tagsData = await tagsRes.json();
            const tags: Tag[] = tagsData.items;
            tags.forEach((tag) => {
              tagsCache.set(tag.id, { ...tag, category });
            });
          }
        }
        setTagsCache(new Map(tagsCache));
      } catch (error) {
        console.error("タグ情報取得エラー:", error);
      }
    }

    return tagIds.map((id) => tagsCache.get(id)).filter((tag): tag is Tag & { category: Category } => tag !== undefined);
  }, [tagsCache]);

  const handleSubmit = useCallback(async (data: { memo: string; condition: number; tagIds: string[] }) => {
    try {
      const response = await fetch("/api/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memo: data.memo,
          condition: data.condition,
          tagIds: data.tagIds,
        }),
      });

      if (!response.ok) {
        console.error("トラック作成エラー");
        return;
      }

      const newTrack: Track = await response.json();

      // タグ情報を取得
      const tags = await fetchTagsInfo(newTrack.tagIds || []);

      const trackWithTags: TrackWithTags = {
        ...newTrack,
        tags,
      };

      // 新しいトラックを配列の先頭に追加
      setTracks((prev) => [trackWithTags, ...prev]);
    } catch (error) {
      console.error("トラック作成エラー:", error);
    }
  }, [fetchTagsInfo]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/tracks/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        console.error("トラック削除エラー");
        return;
      }

      setTracks((prev) => prev.filter((track) => track.id !== id));
    } catch (error) {
      console.error("トラック削除エラー:", error);
    }
  }, []);

  // トラックを読み込む
  const loadMoreTracks = useCallback(async () => {
    if (isLoadingRef.current || !hasMore) return;

    isLoadingRef.current = true;
    setIsLoading(true);

    const container = containerRef.current;
    const oldScrollHeight = container?.scrollHeight || 0;
    const oldScrollTop = container?.scrollTop || 0;

    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (nextCursor) {
        params.set("cursor", nextCursor);
      }

      const response = await fetch(`/api/tracks?${params}`);
      if (!response.ok) {
        console.error("トラック取得エラー");
        setHasMore(false);
        isLoadingRef.current = false;
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      const newTracks: Track[] = data.items;

      // 各トラックのタグ情報を取得
      const tracksWithTags: TrackWithTags[] = await Promise.all(
        newTracks.map(async (track) => ({
          ...track,
          tags: await fetchTagsInfo(track.tagIds || []),
        }))
      );

      setTracks((prev) => [...prev, ...tracksWithTags]);
      setNextCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);

      // スクロール位置を調整
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          const heightDifference = newScrollHeight - oldScrollHeight;
          container.scrollTop = oldScrollTop + heightDifference;
        }

        isLoadingRef.current = false;
        setIsLoading(false);
      });
    } catch (error) {
      console.error("トラック取得エラー:", error);
      setHasMore(false);
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [hasMore, nextCursor, fetchTagsInfo]);

  // 初回ロード
  useEffect(() => {
    if (!initialLoadDone) {
      setInitialLoadDone(true);
      loadMoreTracks();
    }
  }, [initialLoadDone, loadMoreTracks]);

  // サイドバーコンテンツを設定
  useEffect(() => {
    setSidebarContent(
      <TrackSidebarContent
        selectedTagIds={selectedTagIds}
        onTagsChange={setSelectedTagIds}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
    );

    return () => setSidebarContent(null);
  }, [selectedTagIds, searchQuery, setSidebarContent]);

  // 初回レンダリング時にスクロールを最下部に移動
  useEffect(() => {
    if (initialLoadDone && tracks.length > 0) {
      const container = containerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [initialLoadDone, tracks.length]);

  // スクロール監視
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (!loadButtonRef.current || isLoadingRef.current || !hasMore) return;

      const buttonRect = loadButtonRef.current.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const isButtonVisible =
        buttonRect.top < containerRect.bottom &&
        buttonRect.bottom > containerRect.top;

      if (isButtonVisible) {
        loadMoreTracks();
      }
    };

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [loadMoreTracks, hasMore]);

  // フィルタリング
  const filteredTracks = useMemo(() => {
    let result = tracks;

    // 検索クエリでフィルター
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((track) => {
        // メモで検索
        if (track.memo?.toLowerCase().includes(query)) {
          return true;
        }
        // タグ名で検索
        return track.tags.some((tag) => tag.name.toLowerCase().includes(query));
      });
    }

    // タグIDでフィルター
    if (selectedTagIds.length > 0) {
      result = result.filter((track) => {
        // 選択されたタグのいずれかを持っているか
        return track.tags.some((tag) => selectedTagIds.includes(tag.id));
      });
    }

    return result;
  }, [tracks, searchQuery, selectedTagIds]);

  // Slack風：古いものが上、新しいものが下
  const displayTracks = [...filteredTracks].reverse();

  return (
    <div className="mx-auto max-w-3xl h-full flex flex-col">
      {/* ヘッダー */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Track</h1>
        <p className="mt-1 text-sm text-gray-500">日々の記録を残しましょう</p>
      </div>

      {/* トラック一覧（スクロール可能） */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto mb-4 sm:mb-6 pr-1 sm:pr-2"
      >
        <div className="space-y-2 sm:space-y-3">
          {/* 過去を読み込むボタン／ローディング表示 */}
          {hasMore && (
            <div ref={loadButtonRef} className="flex justify-center py-4">
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  過去のトラックを読み込み中...
                </div>
              ) : (
                <button
                  onClick={loadMoreTracks}
                  className="flex items-center gap-2 rounded-md px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <ArrowUp className="h-4 w-4" />
                  過去のトラックを読み込む
                </button>
              )}
            </div>
          )}

          {/* すべて読み込み済みまたは初回ロード中 */}
          {!hasMore && tracks.length === 0 && !isLoading && (
            <div className="flex justify-center py-8">
              <p className="text-sm text-gray-400">トラックがありません。最初の記録を作成しましょう！</p>
            </div>
          )}

          {!hasMore && tracks.length > 0 && (
            <div className="flex justify-center py-4">
              <p className="text-sm text-gray-400">すべてのトラックを読み込みました</p>
            </div>
          )}

          {/* トラック一覧（上が古い、下が新しい） */}
          {displayTracks.map((track) => (
            <TrackCard
              key={track.id}
              id={track.id}
              memo={track.memo || ""}
              condition={track.condition ?? 0}
              tags={track.tags.map((tag) => ({
                id: tag.id,
                name: tag.name,
                categoryName: tag.category.name,
                color: tag.category.color,
              }))}
              createdAt={
                typeof track.createdAt === 'string'
                  ? track.createdAt
                  : track.createdAt
                    ? track.createdAt.toISOString()
                    : new Date().toISOString()
              }
              onDelete={() => handleDelete(track.id)}
              onEdit={() => console.log("Edit", track.id)}
            />
          ))}
        </div>
      </div>

      {/* 新規作成フォーム（固定位置） */}
      <div className="shrink-0">
        <TrackForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
