import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db/client";
import { news } from "@/lib/db/schema";
import { Reveal } from "@/components/reveal";
import { ShareButton } from "@/components/share-button";
import { Badge } from "@/components/ui/badge";
import { NEWS_CATEGORY_LABELS, NEWS_CATEGORY_BADGE_VARIANT } from "@/lib/news-categories";

export const revalidate = 0;

async function getArticle(slug: string) {
  const [article] = await db.select().from(news).where(eq(news.slug, slug)).limit(1);
  return article ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Новость не найдена" };

  const description = article.excerpt ?? article.content.slice(0, 160);
  return {
    title: article.title,
    description,
    alternates: { canonical: `/news/${slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description,
      publishedTime: article.publishedAt,
      images: article.coverImage ? [article.coverImage] : undefined,
    },
  };
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-28 sm:py-32">
      <Reveal>
        <Link
          href="/news"
          className="mb-10 inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Все новости
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--muted-foreground)]">
              {formatDate(article.publishedAt)}
            </span>
            {NEWS_CATEGORY_BADGE_VARIANT[article.category] && (
              <Badge variant={NEWS_CATEGORY_BADGE_VARIANT[article.category]}>
                {NEWS_CATEGORY_LABELS[article.category]}
              </Badge>
            )}
          </div>
          <ShareButton title={article.title} url={`/news/${slug}`} />
        </div>
        <h1 className="font-display mt-3 text-[clamp(1.75rem,4vw,3rem)] font-medium leading-tight tracking-tight">
          {article.title}
        </h1>

        {article.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.coverImage}
            alt={article.title}
            className="mt-8 aspect-[16/10] w-full rounded-2xl border border-[var(--border)] object-cover"
          />
        )}

        <div className="mt-10 flex flex-col gap-5 text-base leading-relaxed text-[var(--foreground)]/85">
          {article.content
            .split(/\n+/)
            .filter(Boolean)
            .map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
        </div>
      </Reveal>
    </div>
  );
}
