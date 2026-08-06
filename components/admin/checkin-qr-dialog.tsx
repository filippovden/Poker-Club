"use client";

import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { generateCheckinQrAction } from "@/lib/actions/checkin";

function CheckinQrContent({ tournamentId }: { tournamentId: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    generateCheckinQrAction(tournamentId).then((res) => {
      if (res.error) setError(res.error);
      else {
        setDataUrl(res.dataUrl ?? null);
        setUrl(res.url ?? null);
      }
    });
  }, [tournamentId]);

  async function copyLink() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (error) return <p className="text-sm text-[var(--danger)]">{error}</p>;
  if (!dataUrl) {
    return <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">Загрузка…</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt="QR-код для входа на турнир"
        className="h-64 w-64 rounded-lg border border-[var(--border)] bg-white p-3"
      />
      <p className="text-center text-xs text-[var(--muted-foreground)]">
        Распечатайте или покажите на экране на входе. Каждый гость сканирует сам своим телефоном и
        подтверждает, что он на месте.
      </p>
      <Button variant="secondary" size="sm" onClick={copyLink} className="gap-2">
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Скопировано" : "Скопировать ссылку"}
      </Button>
    </div>
  );
}

export function CheckinQrDialog({
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
          <DialogTitle>QR для входа</DialogTitle>
          <DialogDescription>{tournamentTitle}</DialogDescription>
        </DialogHeader>

        {open && tournamentId != null && <CheckinQrContent key={tournamentId} tournamentId={tournamentId} />}
      </DialogContent>
    </Dialog>
  );
}
