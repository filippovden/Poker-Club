"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export function StickyMobileCta() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 500);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Every tournament card already has its own "Подать заявку" button —
  // a second, floating one here would just be visual noise.
  if (pathname.startsWith("/tournaments") || pathname.startsWith("/admin")) {
    return null;
  }
  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-4px_rgba(0,0,0,0.5)] backdrop-blur-md md:hidden">
      <Button asChild size="lg" className="w-full">
        <Link href="/tournaments">Смотреть турниры</Link>
      </Button>
    </div>
  );
}
