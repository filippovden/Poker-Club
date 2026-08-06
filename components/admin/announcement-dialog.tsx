"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { uploadAnnouncementImage } from "@/lib/actions/uploads";
import { adminSendCustomAnnouncement } from "@/lib/actions/announce";

const TEXT_LIMIT = 4096;
const PHOTO_CAPTION_LIMIT = 1024;

function AnnouncementContent({
  tournamentId,
  onSent,
}: {
  tournamentId: number;
  onSent: () => void;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const limit = file ? PHOTO_CAPTION_LIMIT : TEXT_LIMIT;

  async function send() {
    setError(null);
    setResult(null);
    if (!text.trim()) {
      setError("Введите текст объявления");
      return;
    }
    if (text.length > limit) {
      setError(`Слишком длинный текст (максимум ${limit}${file ? " символов с фото" : ""})`);
      return;
    }
    setSending(true);

    let photoUrl: string | null = null;
    if (file) {
      const formData = new FormData();
      formData.set("file", file);
      const uploaded = await uploadAnnouncementImage(formData);
      if (uploaded.error) {
        setSending(false);
        setError(uploaded.error);
        return;
      }
      photoUrl = uploaded.url ?? null;
    }

    const res = await adminSendCustomAnnouncement(tournamentId, text, photoUrl);
    setSending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setResult(`Отправлено: ${res.sentCount}`);
    onSent();
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder="Текст объявления — уйдёт всем, у кого привязан Telegram, с кнопкой «Подать заявку» на этот турнир."
      />
      <p className="text-right text-xs text-[var(--muted-foreground)]">
        {text.length} / {limit}
      </p>

      {previewUrl ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Превью изображения" className="max-h-48 w-full rounded-lg object-cover" />
          <Button
            size="sm"
            variant="secondary"
            className="absolute right-2 top-2"
            onClick={() => {
              setFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          >
            Убрать фото
          </Button>
        </div>
      ) : (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-xs text-[var(--muted-foreground)]"
        />
      )}

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      {result && <p className="text-sm text-[var(--live)]">{result}</p>}

      <Button onClick={send} disabled={sending} className="mt-2">
        {sending ? "Отправляем…" : "Отправить рассылку"}
      </Button>
    </div>
  );
}

export function AnnouncementDialog({
  open,
  onOpenChange,
  tournamentId,
  tournamentTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: number | null;
  tournamentTitle: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Объявление в Telegram</DialogTitle>
          <DialogDescription>«{tournamentTitle}»</DialogDescription>
        </DialogHeader>

        {open && tournamentId != null && (
          <AnnouncementContent key={tournamentId} tournamentId={tournamentId} onSent={() => {}} />
        )}
      </DialogContent>
    </Dialog>
  );
}
