import type { NewsArticle } from "@/lib/db/schema";

export const NEWS_CATEGORY_LABELS: Record<NewsArticle["category"], string> = {
  announcement: "Анонс",
  results: "Результаты турнира",
  general: "Общее",
};

// "general" is the majority case (plain club updates) — badging every
// single card with "Общее" would just be visual noise, so only the two
// more specific categories get a badge on public pages.
export const NEWS_CATEGORY_BADGE_VARIANT: Partial<
  Record<NewsArticle["category"], "accent" | "outline">
> = {
  announcement: "accent",
  results: "outline",
};
