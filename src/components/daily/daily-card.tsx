import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// コンディションの表示用（色ベース）
const conditionConfig = {
  2: { label: "+2", bgColor: "bg-green-600", textColor: "text-green-600" },
  1: { label: "+1", bgColor: "bg-green-400", textColor: "text-green-400" },
  0: { label: "±0", bgColor: "bg-gray-400", textColor: "text-gray-500" },
  "-1": { label: "-1", bgColor: "bg-orange-400", textColor: "text-orange-500" },
  "-2": { label: "-2", bgColor: "bg-red-600", textColor: "text-red-600" },
} as const;

interface DailyCardProps {
  date: string; // YYYY-MM-DD
  memo: string | null;
  condition: number;
  onEdit?: () => void;
}

export function DailyCard({ date, memo, condition, onEdit }: DailyCardProps) {
  const config = conditionConfig[condition as keyof typeof conditionConfig];
  const dateObj = new Date(date + "T00:00:00");

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">
          {format(dateObj, "M月d日 (E)", { locale: ja })}
        </CardTitle>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-2 font-medium ${config.textColor}`}>
            <span className={`h-6 w-6 rounded-full ${config.bgColor}`} />
            <span className="text-sm">{config.label}</span>
          </span>
          <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {memo ? (
          <p className="text-gray-700 whitespace-pre-wrap">{memo}</p>
        ) : (
          <p className="text-gray-400 italic">日記が記録されていません</p>
        )}
      </CardContent>
    </Card>
  );
}
