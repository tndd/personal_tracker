export type ConditionValue = -2 | -1 | 0 | 1 | 2;

type ConditionColorConfig = {
  dot: string;
  text: string;
  filterText: string;
  filterDotSize: string;
  badgeBg: string;
  badgeText: string;
};

type ConditionMetadata = {
  label: string;
  altLabel: string;
  description: string;
};

export const CONDITION_VALUES_DESC: ConditionValue[] = [2, 1, 0, -1, -2];
export const CONDITION_VALUES_ASC: ConditionValue[] = [...CONDITION_VALUES_DESC].reverse();

export const CONDITION_COLORS: Record<ConditionValue, ConditionColorConfig> = {
  2: {
    dot: "bg-sky-500",
    text: "text-sky-600",
    filterText: "text-sky-700",
    filterDotSize: "w-[20px] h-[20px]",
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-800",
  },
  1: {
    dot: "bg-green-400",
    text: "text-green-400",
    filterText: "text-green-600",
    filterDotSize: "w-[16px] h-[16px]",
    badgeBg: "bg-green-100",
    badgeText: "text-green-700",
  },
  0: {
    dot: "bg-gray-400",
    text: "text-gray-500",
    filterText: "text-gray-700",
    filterDotSize: "w-3 h-3",
    badgeBg: "bg-gray-100",
    badgeText: "text-gray-700",
  },
  "-1": {
    dot: "bg-orange-400",
    text: "text-orange-500",
    filterText: "text-orange-600",
    filterDotSize: "w-[16px] h-[16px]",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-700",
  },
  "-2": {
    dot: "bg-red-600",
    text: "text-red-600",
    filterText: "text-red-700",
    filterDotSize: "w-[20px] h-[20px]",
    badgeBg: "bg-red-100",
    badgeText: "text-red-800",
  },
} as const;

export const CONDITION_METADATA: Record<ConditionValue, ConditionMetadata> = {
  2: { label: "+2", altLabel: "とても良い", description: "最高" },
  1: { label: "+1", altLabel: "良い", description: "良い" },
  0: { label: "±0", altLabel: "普通", description: "普通" },
  "-1": { label: "-1", altLabel: "悪い", description: "悪い" },
  "-2": { label: "-2", altLabel: "とても悪い", description: "最悪" },
} as const;

export function getConditionMetadata(value: ConditionValue) {
  return CONDITION_METADATA[value];
}

export function getConditionColors(value: ConditionValue) {
  return CONDITION_COLORS[value];
}

export function normalizeCondition(value: number | null | undefined): ConditionValue {
  if (value === 2 || value === 1 || value === 0 || value === -1 || value === -2) {
    return value;
  }
  return 0;
}
