"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

export function ShareButton({
  title,
  url,
  className,
}: {
  title: string;
  url: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const fullUrl = new URL(url, window.location.origin).toString();
    if (navigator.share) {
      navigator.share({ title, url: fullUrl }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label="Поделиться"
      title="Поделиться"
      className={
        className ??
        "flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
      }
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
    </button>
  );
}
