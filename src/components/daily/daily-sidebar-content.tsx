"use client";

interface DailySidebarContentProps {
  selectedCondition: number | null;
  onConditionChange: (condition: number | null) => void;
}

const conditionOptions = [
  { value: 2, label: "とても良い", color: "bg-sky-500", textColor: "text-sky-700" },
  { value: 1, label: "良い", color: "bg-green-400", textColor: "text-green-600" },
  { value: 0, label: "普通", color: "bg-gray-400", textColor: "text-gray-700" },
  { value: -1, label: "悪い", color: "bg-orange-400", textColor: "text-orange-600" },
  { value: -2, label: "とても悪い", color: "bg-red-500", textColor: "text-red-700" },
];

export function DailySidebarContent({
  selectedCondition,
  onConditionChange,
}: DailySidebarContentProps) {
  const handleConditionClick = (value: number) => {
    // 同じコンディションをクリックしたら選択解除
    if (selectedCondition === value) {
      onConditionChange(null);
    } else {
      onConditionChange(value);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">コンディションフィルター</h3>
        <div className="space-y-2">
          {conditionOptions.map((option) => {
            const isSelected = selectedCondition === option.value;
            return (
              <button
                key={option.value}
                onClick={() => handleConditionClick(option.value)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
                  isSelected
                    ? "bg-blue-50 border-2 border-blue-500 shadow-sm"
                    : "border-2 border-transparent hover:bg-gray-100"
                }`}
              >
                <div className={`w-4 h-4 rounded-full ${option.color} flex-shrink-0`} />
                <span
                  className={`text-sm font-medium ${
                    isSelected ? "text-blue-700" : option.textColor
                  }`}
                >
                  {option.label}
                </span>
                {isSelected && (
                  <svg
                    className="ml-auto h-5 w-5 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 選択中の表示 */}
      {selectedCondition !== null && (
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              {conditionOptions.find((opt) => opt.value === selectedCondition)?.label}
              で絞り込み中
            </span>
            <button
              onClick={() => onConditionChange(null)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              クリア
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
