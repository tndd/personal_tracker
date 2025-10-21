import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// コンディションの表示用（色ベース）
const conditionConfig = {
  2: { label: "+2", bgColor: "bg-sky-500", textColor: "text-sky-600" },
  1: { label: "+1", bgColor: "bg-green-400", textColor: "text-green-400" },
  0: { label: "±0", bgColor: "bg-gray-400", textColor: "text-gray-500" },
  "-1": { label: "-1", bgColor: "bg-orange-400", textColor: "text-orange-500" },
  "-2": { label: "-2", bgColor: "bg-red-600", textColor: "text-red-600" },
} as const;

interface Tag {
  id: string;
  name: string;
  categoryName: string;
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
  id,
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
    <Card data-testid="track-card" data-track-id={id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
            {/* 時刻とコンディション */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500">
              <time>{format(date, "HH:mm", { locale: ja })}</time>
              <span className="text-gray-300">•</span>
              <span className={`flex items-center gap-1 sm:gap-1.5 font-medium ${config.textColor}`}>
                <span className={`h-3 w-3 sm:h-4 sm:w-4 rounded-full ${config.bgColor}`} />
                <span>{config.label}</span>
              </span>
            </div>

            {/* メモ */}
            {memo && (
              <p className="text-sm sm:text-base text-gray-900 whitespace-pre-wrap break-words">{memo}</p>
            )}

            {/* タグ */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                  >
                    <span className="hidden sm:inline">{tag.categoryName}/</span>{tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* アクション */}
          <div className="flex gap-0.5 sm:gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="h-7 w-7 sm:h-8 sm:w-8"
              title="編集"
              aria-label="編集"
            >
              <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-7 w-7 sm:h-8 sm:w-8 text-red-600 hover:text-red-700"
              title="削除"
              aria-label="削除"
            >
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
