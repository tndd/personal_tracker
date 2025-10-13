import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// コンディションの表示用
const conditionConfig = {
  2: { emoji: "😄", label: "+2", color: "text-green-600" },
  1: { emoji: "🙂", label: "+1", color: "text-green-500" },
  0: { emoji: "😐", label: "±0", color: "text-gray-500" },
  "-1": { emoji: "😟", label: "-1", color: "text-orange-500" },
  "-2": { emoji: "😞", label: "-2", color: "text-red-600" },
} as const;

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TrackCardProps {
  id: string;
  memo: string | null;
  condition: number;
  tags: Tag[];
  createdAt: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function TrackCard({
  memo,
  condition,
  tags,
  createdAt,
  onEdit,
  onDelete,
}: TrackCardProps) {
  const config = conditionConfig[condition as keyof typeof conditionConfig];
  const date = new Date(createdAt);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            {/* 時刻とコンディション */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <time>{format(date, "HH:mm", { locale: ja })}</time>
              <span className="text-gray-300">•</span>
              <span className={`flex items-center gap-1 font-medium ${config.color}`}>
                <span>{config.emoji}</span>
                <span>{config.label}</span>
              </span>
            </div>

            {/* メモ */}
            {memo && (
              <p className="text-gray-900 whitespace-pre-wrap">{memo}</p>
            )}

            {/* タグ */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* アクション */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="h-8 w-8"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-8 w-8 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
