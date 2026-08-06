"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/lib/auth/session";
import { SITE_CONTENT } from "@/lib/content";

async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new Error("Требуется авторизация");
}

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 5 * 1024 * 1024;

export interface UploadImageResult {
  error?: string;
  url?: string;
}

// Saves the file to disk under public/uploads/announcements and returns
// a full public URL — used so a Telegram broadcast can pass `photo` as a
// plain URL string (Telegram fetches it itself) instead of dealing with
// multipart uploads to the Bot API.
export async function uploadAnnouncementImage(formData: FormData): Promise<UploadImageResult> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Файл не выбран" };
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return { error: "Разрешены только JPEG, PNG или WebP" };
  if (file.size > MAX_BYTES) return { error: "Файл слишком большой (максимум 5 МБ)" };

  const dir = path.join(process.cwd(), "public", "uploads", "announcements");
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), bytes);

  return { url: `https://${SITE_CONTENT.domain}/uploads/announcements/${filename}` };
}
