import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AnalysisPrototype } from "../components/prototypes/AnalysisPrototype";

const meta = {
  title: "Prototypes/Analysis",
  component: AnalysisPrototype,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AnalysisPrototype>;

export default meta;

type Story = StoryObj<typeof meta>;

const trendData = [
  { date: "2025-09-30", condition: -1 },
  { date: "2025-10-01", condition: 0 },
  { date: "2025-10-02", condition: 1 },
  { date: "2025-10-03", condition: 2 },
  { date: "2025-10-04", condition: 1 },
  { date: "2025-10-05", condition: -2 },
  { date: "2025-10-06", condition: -1 },
  { date: "2025-10-07", condition: 0 },
  { date: "2025-10-08", condition: 1 },
  { date: "2025-10-09", condition: 2 },
];

const correlationData = [
  {
    tagId: "tag-1",
    tagName: "服薬",
    usageCount: 14,
    averageCondition: 0.5,
  },
  {
    tagId: "tag-2",
    tagName: "運動",
    usageCount: 6,
    averageCondition: 1.2,
  },
  {
    tagId: "tag-3",
    tagName: "睡眠不足",
    usageCount: 4,
    averageCondition: -1.3,
  },
  {
    tagId: "tag-4",
    tagName: "頭痛",
    usageCount: 8,
    averageCondition: -0.8,
  },
];

export const Default: Story = {
  args: {
    trend: trendData,
    correlations: correlationData,
  },
};
