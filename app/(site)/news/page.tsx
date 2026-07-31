import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { news } from "@/lib/db/schema";
import { Reveal, RevealGroup, RevealItem } from "@/components/reveal";
import { DecorativeScene } from "@/components/decorative-scene";
import { Badge } from "@/components/ui/badge";
import { SITE_CONTENT } from "@/lib/content";
import { NEWS_CATEGORY_LABELS, NEWS_CATEGORY_BADGE_VARIANT } from "@/lib/news-categories";

const NEWS_DESCRIPTION = `Анонсы турниров, результаты и новости покерного клуба ${SITE_CONTENT.clubName} в Тольятти.`;

export const metadata: Metadata = {
  title: "Новости",
  description: NEWS_DESCRIPTION,
  alternates: { canonical: "/news" },
  openGraph: { title: `Новости — ${SITE_CONTENT.clubName}`, description: NEWS_DESCRIPTION },
};

export const revalidate = 0;

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("ru-RU", {
    timeZone: "Europe/Samara",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function NewsPage() {
  const all = await db.select().from(news).orderBy(desc(news.publishedAt));
  const [featured, ...rest] = all;

  return (
    <div className="mx-auto max-w-5xl px-6 py-28 sm:py-32">
      <Reveal className="mb-16">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
          Журнал клуба
        </span>
        <h1 className="font-display mt-4 text-[clamp(2rem,5vw,3.5rem)] font-medium tracking-tight">
          Новости
        </h1>
      </Reveal>

      {all.length === 0 && (
        <p className="text-sm text-[var(--muted-foreground)]">
          Пока нет новостей — загляните позже.
        </p>
      )}

      {featured && (
        <Reveal>
          <Link
            href={`/news/${featured.slug}`}
            className="group mb-16 grid gap-6 border-b border-[var(--border)] pb-16 md:grid-cols-2 md:items-center md:gap-12"
          >
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[var(--border)]">
              {featured.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featured.coverImage}
                  alt={featured.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <DecorativeScene
                  variant="cards"
                  className="h-full w-full transition-transform duration-700 group-hover:scale-105"
                />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--muted-foreground)]">
                  {formatDate(featured.publishedAt)}
                </span>
                {NEWS_CATEGORY_BADGE_VARIANT[featured.category] && (
                  <Badge variant={NEWS_CATEGORY_BADGE_VARIANT[featured.category]}>
                    {NEWS_CATEGORY_LABELS[featured.category]}
                  </Badge>
                )}
              </div>
              <h2 className="font-display mt-3 text-2xl font-medium leading-tight tracking-tight transition-colors group-hover:text-[var(--accent)] sm:text-3xl">
                {featured.title}
              </h2>
              {featured.excerpt && (
                <p className="mt-4 text-[var(--muted-foreground)]">{featured.excerpt}</p>
              )}
            </div>
          </Link>
        </Reveal>
      )}

      {rest.length > 0 && (
        <RevealGroup className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
          {rest.map((item) => (
            <RevealItem key={item.id}>
              <Link href={`/news/${item.slug}`} className="group block">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {formatDate(item.publishedAt)}
                  </span>
                  {NEWS_CATEGORY_BADGE_VARIANT[item.category] && (
                    <Badge variant={NEWS_CATEGORY_BADGE_VARIANT[item.category]}>
                      {NEWS_CATEGORY_LABELS[item.category]}
                    </Badge>
                  )}
                </div>
                <h3 className="font-display mt-2 text-xl font-medium leading-snug tracking-tight transition-colors group-hover:text-[var(--accent)]">
                  {item.title}
                </h3>
                {item.excerpt && (
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                    {item.excerpt}
                  </p>
                )}
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </div>
  );
}
