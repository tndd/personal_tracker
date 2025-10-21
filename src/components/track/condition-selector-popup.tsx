"use client";

import { Card } from "@/components/ui/card";
import {
  CONDITION_COLORS,
  CONDITION_METADATA,
  CONDITION_VALUES_DESC,
  type ConditionValue,
} from "@/constants/condition-style";

const conditionOptions = CONDITION_VALUES_DESC.map((value) => ({
  value,
  label: CONDITION_METADATA[value].label,
  description: CONDITION_METADATA[value].description,
  bgColor: CONDITION_COLORS[value].dot,
}));

interface ConditionSelectorPopupProps {
  currentCondition: ConditionValue;
  onSelect: (condition: ConditionValue) => void;
  onClose: () => void;
  position?: { bottom: number; right: number };
}

export function ConditionSelectorPopup({
  currentCondition,
  onSelect,
  onClose,
  position,
}: ConditionSelectorPopupProps) {
  const handleSelect = (value: ConditionValue) => {
    onSelect(value);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <Card
        className="absolute z-10 w-48 shadow-lg"
        style={{
          bottom: position?.bottom || 0,
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
                aria-label={`コンディション: ${option.label}`}
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
    </div>
  );
}
