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

export const Default: Story = {
  args: {
    categories: sampleCategories,
    recentTags: sampleTags.slice(0, 3),
    entries: [
      {
        id: "track-1",
        memo: "朝に服薬を実施。体調はまずまず。\nメモの複数行表示も確認。",
        condition: 1,
        createdAt: "2025-10-09 07:10",
        updatedAt: "2025-10-09 07:12",
        tags: [sampleTags[0], sampleTags[3]],
      },
      {
        id: "track-2",
        memo: "午後から頭痛が悪化したので休息。タグ選択で色分けを確認。",
        condition: -1,
        createdAt: "2025-10-08 15:30",
        updatedAt: "2025-10-08 15:30",
        tags: [sampleTags[2]],
      },
      {
        id: "track-3",
        memo: "夜は軽いストレッチのみ。コンディションはゼロ付近。",
        condition: 0,
        createdAt: "2025-10-07 22:05",
        updatedAt: "2025-10-07 22:05",
        tags: [sampleTags[1]],
      },
    ],
  },
};

export const NoUnread: Story = {
  args: {
    ...Default.args,
    hasUnread: false,
  },
};
