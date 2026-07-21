import type { MetadataRoute } from "next";
import { db } from "@/lib/db/client";
import { news } from "@/lib/db/schema";

const BASE_URL = "https://lockdownpoker.club";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await db.select({ slug: news.slug, publishedAt: news.publishedAt }).from(news);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/tournaments`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/news`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/legal`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const newsRoutes: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${BASE_URL}/news/${a.slug}`,
    lastModified: new Date(a.publishedAt),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...newsRoutes];
}
