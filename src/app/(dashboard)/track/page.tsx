"use client";

import { useState } from "react";
import { TrackForm } from "@/components/track/track-form";
import { TrackCard } from "@/components/track/track-card";
import { ArrowUp } from "lucide-react";

// モックデータ
const mockTracks = [
  {
    id: "1",
    memo: "朝散歩をした。気分が良い。",
    condition: 1,
    tags: [
      { id: "t1", name: "運動", color: "#10B981" },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    memo: "昼食後に少し頭痛がする",
    condition: -1,
    tags: [
      { id: "t2", name: "症状", color: "#EF4444" },
      { id: "t3", name: "頭痛", color: "#F59E0B" },
    ],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    memo: "デパスを服用",
    condition: 0,
    tags: [
      { id: "t4", name: "服薬", color: "#3B82F6" },
      { id: "t5", name: "デパス", color: "#6366F1" },
    ],
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    memo: "夜ぐっすり眠れた",
    condition: 2,
    tags: [
      { id: "t6", name: "睡眠", color: "#8B5CF6" },
    ],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function TrackPage() {
  const [tracks, setTracks] = useState(mockTracks);

  const handleSubmit = (data: { memo: string; condition: number; tagIds: string[] }) => {
    const newTrack = {
      id: Date.now().toString(),
      memo: data.memo,
      condition: data.condition,
      tags: [], // TODO: タグ選択機能実装後に対応
      createdAt: new Date().toISOString(),
    };

    // 新しいトラックを配列の最後に追加（Slack風：新しいものが下）
    setTracks([...tracks, newTrack]);
  };

  const handleDelete = (id: string) => {
    setTracks(tracks.filter((track) => track.id !== id));
  };

  // Slack風：古いものが上、新しいものが下
  const displayTracks = [...tracks].reverse();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Track</h1>
        <p className="mt-1 text-sm text-gray-500">日々の記録を残しましょう</p>
      </div>

      {/* 過去を読み込むボタン（モック） */}
      <div className="flex justify-center">
        <button className="flex items-center gap-2 rounded-md px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 transition-colors">
          <ArrowUp className="h-4 w-4" />
          過去のトラックを読み込む
        </button>
      </div>

      {/* トラック一覧（上が古い、下が新しい） */}
      <div className="space-y-3">
        {displayTracks.map((track) => (
          <TrackCard
            key={track.id}
            {...track}
            onDelete={() => handleDelete(track.id)}
            onEdit={() => console.log("Edit", track.id)}
          />
        ))}
      </div>

      {/* 新規作成フォーム（Slack風に下部配置） */}
      <TrackForm onSubmit={handleSubmit} />
    </div>
  );
}
