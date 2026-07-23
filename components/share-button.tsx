"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, [menuOpen]);

  function getFullUrl() {
    return new URL(url, window.location.origin).toString();
  }

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({ title, url: getFullUrl() }).catch(() => {});
      return;
    }
    // Most desktop browsers have no navigator.share — offer the sharing
    // channels this audience actually uses (VK, Telegram) instead of just
    // silently copying a link.
    setMenuOpen((v) => !v);
  }

  async function copyLink(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(getFullUrl());
    setCopied(true);
    setMenuOpen(false);
    setTimeout(() => setCopied(false), 2000);
  }

  const fullUrl = typeof window !== "undefined" ? getFullUrl() : url;
  const vkUrl = `https://vk.com/share.php?url=${encodeURIComponent(fullUrl)}&title=${encodeURIComponent(title)}`;
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(title)}`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={handleClick}
        aria-label="Поделиться"
        title="Поделиться"
        className={
          className ??
          "flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
        }
      >
        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      </button>

      {menuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full z-20 mt-1 flex w-44 flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 text-sm shadow-lg"
        >
          <a
            href={vkUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            className="px-3 py-2 text-left hover:bg-[var(--surface-2)]"
          >
            ВКонтакте
          </a>
          <a
            href={tgUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            className="px-3 py-2 text-left hover:bg-[var(--surface-2)]"
          >
            Telegram
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-2)]"
          >
            <Copy className="h-3.5 w-3.5" /> Скопировать ссылку
          </button>
        </div>
      )}
    </div>
  );
}
