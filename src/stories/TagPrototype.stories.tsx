import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TagPrototype } from "../components/prototypes/TagPrototype";

const meta = {
  title: "Prototypes/Tag",
  component: TagPrototype,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof TagPrototype>;

export default meta;

type Story = StoryObj<typeof meta>;

const categories = [
  {
    id: "cat-1",
    name: "コンディション",
    color: "#1D4ED8",
    sortOrder: 0,
    archivedAt: null,
    tags: [
      { id: "tag-1", name: "頭痛", usageCount: 12, archivedAt: null },
      { id: "tag-2", name: "睡眠不足", usageCount: 5, archivedAt: null },
      { id: "tag-3", name: "快眠", usageCount: 8, archivedAt: null },
    ],
  },
  {
    id: "cat-2",
    name: "習慣",
    color: "#16A34A",
    sortOrder: 1,
    archivedAt: null,
    tags: [
      { id: "tag-4", name: "ウォーキング", usageCount: 11, archivedAt: null },
      { id: "tag-5", name: "カフェイン", usageCount: 9, archivedAt: "2025-09-01T00:00:00Z" },
    ],
  },
  {
    id: "cat-3",
    name: "メンタル",
    color: "#D946EF",
    sortOrder: 2,
    archivedAt: "2025-07-01T00:00:00Z",
    tags: [],
  },
];

export const Default: Story = {
  args: {
    categories,
    showArchived: false,
  },
};

export const WithArchived: Story = {
  args: {
    categories,
    showArchived: true,
  },
};
