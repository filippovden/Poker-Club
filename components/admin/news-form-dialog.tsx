"use client";

import { useState } from "react";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { NewsArticle } from "@/lib/db/schema";
import { NEWS_CATEGORY_LABELS } from "@/lib/news-categories";

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
  const [category, setCategory] = useState<NewsArticle["category"]>(
    article?.category ?? "general",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{article ? "Изменить новость" : "Новая новость"}</DialogTitle>
          <DialogDescription>
            Появится в журнале клуба сразу после публикации.
          </DialogDescription>
        </DialogHeader>

        <form
          action={(formData) => {
            formData.set("category", category);
            onSubmit(formData);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="news-title">Заголовок</Label>
            <Input id="news-title" name="title" defaultValue={article?.title} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Категория</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(NEWS_CATEGORY_LABELS) as NewsArticle["category"][]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {NEWS_CATEGORY_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="news-excerpt">Краткое описание (для списка)</Label>
            <Input id="news-excerpt" name="excerpt" defaultValue={article?.excerpt ?? ""} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="news-cover">Обложка (ссылка на изображение, необязательно)</Label>
            <Input
              id="news-cover"
              name="coverImage"
              type="url"
              placeholder="https://…"
              defaultValue={article?.coverImage ?? ""}
            />
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
