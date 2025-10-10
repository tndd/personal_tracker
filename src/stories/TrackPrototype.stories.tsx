import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TrackPrototype } from "../components/prototypes/TrackPrototype";

const meta = {
  title: "Prototypes/Track",
  component: TrackPrototype,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof TrackPrototype>;

export default meta;

type Story = StoryObj<typeof meta>;

const sampleTags = [
  {
    id: "tag-1",
    name: "服薬",
    color: "#FFAA00",
  },
  {
    id: "tag-2",
    name: "運動",
    color: "#0EA5E9",
  },
  {
    id: "tag-3",
    name: "頭痛",
    color: "#F97316",
  },
  {
    id: "tag-4",
    name: "快眠",
    color: "#22C55E",
  },
] as const;

const sampleCategories = [
  {
    id: "cat-1",
    name: "コンディション",
    tags: [sampleTags[2], sampleTags[3]],
  },
  {
    id: "cat-2",
    name: "習慣",
    tags: [sampleTags[0], sampleTags[1]],
  },
];

// サンプルデータ生成用のヘルパー関数
const generateEntries = (count: number) => {
  const memos = [
    "朝に服薬を実施。体調はまずまず。",
    "午後から頭痛が悪化したので休息。",
    "夜は軽いストレッチのみ。",
    "ジョギングを30分実施。気分爽快。",
    "仕事が忙しく疲労感が強い。",
    "よく眠れた。朝から調子が良い。",
    "ストレスを感じる一日だった。",
    "趣味の時間を取れてリフレッシュ。",
    "体調不良で早めに休息。",
    "友人と会って楽しく過ごせた。",
    "集中力が続かず作業が進まない。",
    "瞑想とヨガで心身ともに整った。",
    "睡眠不足で頭が重い。",
    "美味しい食事で満足感が高い。",
    "天気が良くて気持ちが上向き。",
  ];

  const conditions: Array<-2 | -1 | 0 | 1 | 2> = [-2, -1, 0, 1, 2];
  const entries = [];
  const baseDate = new Date("2025-10-09 20:00");

  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate.getTime() - i * 3600000 * 2); // 2時間ごと
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    const memo = memos[Math.floor(Math.random() * memos.length)];
    const tagCount = Math.floor(Math.random() * 3); // 0-2個のタグ
    const selectedTags = [];

    for (let j = 0; j < tagCount; j++) {
      const tag = sampleTags[Math.floor(Math.random() * sampleTags.length)];
      if (!selectedTags.find(t => t.id === tag.id)) {
        selectedTags.push(tag);
      }
    }

    entries.push({
      id: `track-${i + 1}`,
      memo,
      condition,
      createdAt: date.toISOString().slice(0, 16).replace("T", " "),
      updatedAt: date.toISOString().slice(0, 16).replace("T", " "),
      tags: selectedTags,
    });
  }

  return entries;
};

export const Default: Story = {
  args: {
    categories: sampleCategories,
    entries: generateEntries(50),
  },
};

export const WithMoreEntries: Story = {
  args: {
    categories: sampleCategories,
    entries: generateEntries(100),
  },
};
