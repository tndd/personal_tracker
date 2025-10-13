"use client";

import { Card } from "@/components/ui/card";

const conditionOptions = [
  { value: 2, label: "+2", description: "最高", bgColor: "bg-green-600" },
  { value: 1, label: "+1", description: "良い", bgColor: "bg-green-400" },
  { value: 0, label: "±0", description: "普通", bgColor: "bg-gray-400" },
  { value: -1, label: "-1", description: "悪い", bgColor: "bg-orange-400" },
  { value: -2, label: "-2", description: "最悪", bgColor: "bg-red-600" },
];

interface ConditionSelectorPopupProps {
  currentCondition: number;
  onSelect: (condition: number) => void;
  onClose: () => void;
  position?: { top: number; right: number };
}

export function ConditionSelectorPopup({
  currentCondition,
  onSelect,
  onClose,
  position,
}: ConditionSelectorPopupProps) {
  const handleSelect = (value: number) => {
    onSelect(value);
    onClose();
  };

  return (
    <>
      {/* 背景クリックで閉じる */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* ポップアップ */}
      <Card
        className="absolute z-50 w-48 shadow-lg"
        style={{
          top: position?.top || 0,
          right: position?.right || 0,
        }}
      >
        <div className="p-2">
          <div className="space-y-1">
            {conditionOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-3 ${
                  currentCondition === option.value
                    ? "bg-blue-50 border border-blue-200"
                    : "hover:bg-gray-100"
                }`}
              >
                <span className={`h-6 w-6 rounded-full ${option.bgColor}`} />
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Card>
    </>
  );
}
