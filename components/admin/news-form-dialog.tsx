"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { NewsArticle } from "@/lib/db/schema";

export function NewsFormDialog({
  open,
  onOpenChange,
  article,
  onSubmit,
  error,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: NewsArticle | null;
  onSubmit: (formData: FormData) => void;
  error?: string;
  pending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{article ? "Изменить новость" : "Новая новость"}</DialogTitle>
          <DialogDescription>
            Появится в журнале клуба сразу после публикации.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="news-title">Заголовок</Label>
            <Input id="news-title" name="title" defaultValue={article?.title} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="news-excerpt">Краткое описание (для списка)</Label>
            <Input id="news-excerpt" name="excerpt" defaultValue={article?.excerpt ?? ""} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="news-content">Текст новости</Label>
            <Textarea
              id="news-content"
              name="content"
              rows={6}
              defaultValue={article?.content}
              required
            />
          </div>

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Сохраняем…" : article ? "Сохранить" : "Опубликовать"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
