import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DailyPrototype } from "../components/prototypes/DailyPrototype";

const meta = {
  title: "Prototypes/Daily",
  component: DailyPrototype,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof DailyPrototype>;

export default meta;

type Story = StoryObj<typeof meta>;

const makeRecord = (date: string, condition: -2 | -1 | 0 | 1 | 2, memo: string) => ({
  date,
  condition,
  memo,
  updatedAt: `${date}T22:30:00Z`,
});

export const Default: Story = {
  args: {
    records: [
      makeRecord("2025-10-09", 1, "軽い散歩でリフレッシュ。睡眠も十分。"),
      makeRecord("2025-10-08", -1, "午後から偏頭痛。予定を調整して安静。"),
      makeRecord("2025-10-07", 0, "いつも通りの一日。特記事項なし。"),
      makeRecord("2025-10-06", 2, "仕事が順調で気分も良好。"),
      makeRecord("2025-10-05", -2, "発熱。終日横になって回復に専念。"),
      makeRecord("2025-10-04", 1, "新しい栄養ドリンクを試した。"),
      makeRecord("2025-10-03", 0, "在宅ワーク中心で落ち着いた日。"),
      makeRecord("2025-10-02", -1, "天候不安定で気圧変化を感じた。"),
    ],
  },
};
