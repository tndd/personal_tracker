"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TrackForm } from "@/components/track/track-form";
import { TrackCard } from "@/components/track/track-card";
import { ArrowUp, Loader2 } from "lucide-react";

// ダミーデータを生成する関数（決定的な生成でHydration errorを防ぐ）
const generateMockTracks = (count: number, startIndex: number, baseTime?: number) => {
  const now = baseTime || Date.now();
  const memos = [
    "朝散歩をした。気分が良い。",
    "昼食後に少し頭痛がする",
    "デパスを服用",
    "夜ぐっすり眠れた",
    "仕事が忙しくてストレスを感じる",
    "ヨガをして心身ともにリフレッシュ",
    "カフェでゆっくり読書",
    "友人と楽しく食事",
    "軽い運動をした",
    "体調がすぐれない",
    "新しいプロジェクトを開始",
    "良いアイデアが浮かんだ",
    "睡眠不足で疲れている",
    "気分転換に映画を見た",
    "健康診断を受けた",
  ];

  const tags = [
    { id: "tag-1", name: "デパス", categoryName: "服薬", color: "#3B82F6" },
    { id: "tag-4", name: "頭痛", categoryName: "症状", color: "#EF4444" },
    { id: "tag-7", name: "散歩", categoryName: "運動", color: "#10B981" },
    { id: "tag-8", name: "ヨガ", categoryName: "運動", color: "#10B981" },
    { id: "tag-9", name: "読書", categoryName: "趣味", color: "#8B5CF6" },
  ];

  const tracks = [];
  for (let i = 0; i < count; i++) {
    const index = startIndex + i;
    // 決定的な生成（同じindexなら常に同じ結果）
    const hoursAgo = index * 2 + (index % 3) * 0.5;
    const condition = ((index * 7) % 5) - 2; // -2 から 2
    const memo = memos[index % memos.length];
    const tagCount = (index * 3) % 3; // 0-2個のタグ
    const selectedTags = [];
    for (let j = 0; j < tagCount; j++) {
      const tagIndex = (index + j) % tags.length;
      const tag = tags[tagIndex];
      if (!selectedTags.find((t) => t.id === tag.id)) {
        selectedTags.push(tag);
      }
    }

    tracks.push({
      id: `track-${index}`,
      memo,
      condition,
      tags: selectedTags,
      createdAt: new Date(now - hoursAgo * 60 * 60 * 1000).toISOString(),
    });
  }
  return tracks;
};

export default function TrackPage() {
  // 基準時刻を保存（Hydration errorを防ぐため）
  const baseTimeRef = useRef(Date.now());

  // 初期データをuseStateの初期化関数で生成（クライアントサイドのみ）
  const [tracks, setTracks] = useState(() => generateMockTracks(10, 0, baseTimeRef.current));
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [oldestIndex, setOldestIndex] = useState(10); // 次にロードするトラックのインデックス
  const containerRef = useRef<HTMLDivElement>(null);
  const loadButtonRef = useRef<HTMLButtonElement>(null);
  const isLoadingRef = useRef(false); // ローディング中フラグ（同期的にチェック可能）

  const handleSubmit = (data: { memo: string; condition: number; tagIds: string[] }) => {
    const newTrack = {
      id: `new-${Date.now()}`,
      memo: data.memo,
      condition: data.condition,
      tags: [], // TODO: タグ選択機能実装後に対応
      createdAt: new Date().toISOString(),
    };

    // 新しいトラックを配列の先頭に追加（tracks配列は新しい順で統一）
    setTracks([newTrack, ...tracks]);
  };

  const handleDelete = (id: string) => {
    setTracks(tracks.filter((track) => track.id !== id));
  };

  // 過去のトラックを読み込む
  const loadMoreTracks = useCallback(async () => {
    // refを使って同期的にチェック（Reactの状態更新を待たない）
    if (isLoadingRef.current || !hasMore) return;

    isLoadingRef.current = true;
    setIsLoading(true);

    // 現在のスクロール位置と高さを保存
    const container = containerRef.current;
    const oldScrollHeight = container?.scrollHeight || 0;
    const oldScrollTop = container?.scrollTop || 0;

    // ローディングをシミュレート（300ms）
    await new Promise((resolve) => setTimeout(resolve, 300));

    const newTracks = generateMockTracks(15, oldestIndex, baseTimeRef.current);

    // すでに100件以上ある場合は終了
    if (oldestIndex >= 100) {
      setHasMore(false);
      isLoadingRef.current = false;
      setIsLoading(false);
      return;
    }

    // 古いトラックを配列の末尾に追加（tracks配列は新しい順で統一）
    setTracks((prevTracks) => [...prevTracks, ...newTracks]);
    setOldestIndex(oldestIndex + 15);

    // スクロール位置を調整（新しいコンテンツが追加されても同じ位置を見ているように）
    // requestAnimationFrameを使用して、DOMの更新が確実に完了してから調整
    requestAnimationFrame(() => {
      if (container) {
        const newScrollHeight = container.scrollHeight;
        const heightDifference = newScrollHeight - oldScrollHeight;
        container.scrollTop = oldScrollTop + heightDifference;
      }

      // スクロール位置の調整が完了してからローディングを解除
      isLoadingRef.current = false;
      setIsLoading(false);
    });
  }, [hasMore, oldestIndex]);

  // 初回レンダリング時にスクロールを最下部に移動
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  // スクロール監視（スクロール可能なコンテナ内で監視）
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // refを使って同期的にチェック
      if (!loadButtonRef.current || isLoadingRef.current || !hasMore) return;

      const buttonRect = loadButtonRef.current.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // ボタンがコンテナの表示領域内にあるかチェック
      const isButtonVisible =
        buttonRect.top < containerRect.bottom &&
        buttonRect.bottom > containerRect.top;

      // ボタンが表示されたら自動的にロード
      if (isButtonVisible) {
        loadMoreTracks();
      }
    };

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [loadMoreTracks, hasMore]);

  // Slack風：古いものが上、新しいものが下
  const displayTracks = [...tracks].reverse();

  return (
    <div className="mx-auto max-w-3xl h-full flex flex-col">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Track</h1>
        <p className="mt-1 text-sm text-gray-500">日々の記録を残しましょう</p>
      </div>

      {/* トラック一覧（スクロール可能） */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto mb-6 pr-2"
      >
        <div className="space-y-3">
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

          {/* すべて読み込み済みの表示 */}
          {!hasMore && (
            <div className="flex justify-center py-4">
              <p className="text-sm text-gray-400">すべてのトラックを読み込みました</p>
            </div>
          )}

          {/* トラック一覧（上が古い、下が新しい） */}
          {displayTracks.map((track) => (
            <TrackCard
              key={track.id}
              {...track}
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
