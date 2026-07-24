"use server";

import { eq, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { news } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { slugify } from "@/lib/slugify";
import type { ActionResult } from "./tournaments";

const newsSchema = z.object({
  title: z.string().min(1, "Заголовок обязателен"),
  excerpt: z.string().nullable(),
  content: z.string().min(1, "Текст обязателен"),
  coverImage: z.string().nullable(),
  category: z.enum(["announcement", "results", "general"]),
});

async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new Error("Требуется авторизация");
}

async function uniqueSlug(title: string, ignoreId?: number): Promise<string> {
  const base = slugify(title);
  let slug = base;
  let suffix = 2;

  while (true) {
    const conflicts = ignoreId
      ? await db
          .select({ id: news.id })
          .from(news)
          .where(and(eq(news.slug, slug), ne(news.id, ignoreId)))
      : await db.select({ id: news.id }).from(news).where(eq(news.slug, slug));

    if (conflicts.length === 0) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function createNewsAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = newsSchema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt") || null,
    content: formData.get("content"),
    coverImage: formData.get("coverImage") || null,
    category: formData.get("category") || "general",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Некорректные данные" };
  }

  const slug = await uniqueSlug(parsed.data.title);
  await db.insert(news).values({ ...parsed.data, slug });
  revalidatePath("/news");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function updateNewsAction(
  id: number,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = newsSchema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt") || null,
    content: formData.get("content"),
    coverImage: formData.get("coverImage") || null,
    category: formData.get("category") || "general",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Некорректные данные" };
  }

  const [existing] = await db.select().from(news).where(eq(news.id, id)).limit(1);
  const slug =
    existing && existing.title !== parsed.data.title
      ? await uniqueSlug(parsed.data.title, id)
      : existing?.slug;

  await db
    .update(news)
    .set({ ...parsed.data, slug })
    .where(eq(news.id, id));
  revalidatePath("/news");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function deleteNewsAction(id: number) {
  await requireAdmin();
  await db.delete(news).where(eq(news.id, id));
  revalidatePath("/news");
  revalidatePath("/admin/dashboard");
}
