"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MagneticWrapper } from "@/components/magnetic";
import { playClick } from "@/lib/sound";

export function CtaButtons() {
  return (
    <div className="mt-9 flex flex-wrap justify-center gap-3">
      <MagneticWrapper>
        <Button asChild size="lg" onClick={() => playClick()}>
          <Link href="/tournaments">Смотреть турниры</Link>
        </Button>
      </MagneticWrapper>
      <MagneticWrapper>
        <Button
          asChild
          size="lg"
          variant="outline"
          onClick={() => playClick()}
          className="border-white/25 text-white hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <Link href="/about">Правила и контакты</Link>
        </Button>
      </MagneticWrapper>
    </div>
  );
}
