import Link from "next/link";
import Image from "next/image";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tournaments } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";

export async function Hero() {
  const [next] = await db.select().from(tournaments)
    .where(and(eq(tournaments.status, "upcoming"), eq(tournaments.isHidden, false)))
    .orderBy(asc(tournaments.startsAt)).limit(1);
  const date = next && new Date(next.startsAt).toLocaleString("ru-RU", {
    timeZone: "Europe/Samara", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
  return (
    <section className="royal-hero relative isolate overflow-hidden border-b border-[var(--border)]">
      <div className="royal-hero-art" aria-hidden="true">
        <Image src="/brand/royal63-club-hero-v2.jpg" alt="" fill priority sizes="100vw" className="hero-card-art object-cover" />
      </div>
      <div className="royal-hero-shade" aria-hidden="true" />
      <div className="royal-hero-halo" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-6 pt-36 sm:pt-44 lg:px-10">
        <div className="max-w-[730px] pb-16 sm:pb-24 lg:pb-28">
          <p className="royal-kicker mb-8"><span className="royal-kicker-line" />Royal63 <span className="text-[#e4d8bc]/45">/</span> Тольятти</p>
          <h1 className="royal-editorial text-[clamp(4rem,8.8vw,8.7rem)] leading-[.86] tracking-[-.075em] text-[#f4ecdd]">Игра<br /><em className="font-normal text-[var(--accent)]">начинается</em><br />здесь<span className="text-[var(--accent)]">.</span></h1>
          <p className="mt-9 max-w-[29rem] border-l border-[var(--accent)]/60 pl-5 text-base leading-[1.65] text-[#e0d7c8] sm:text-lg">Клуб живого покера, где важны люди, атмосфера и каждый вечер за столом.</p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="min-w-48"><Link href="/tournaments">Смотреть турниры <span aria-hidden="true">↗</span></Link></Button>
            <Link href="/about" className="inline-flex h-12 items-center px-5 text-sm font-medium text-[#eee1c9] transition-colors hover:text-[var(--accent)]">О клубе <span className="ml-3 text-[var(--accent)]" aria-hidden="true">↗</span></Link>
          </div>
        </div>
        <div className="royal-next-event relative grid gap-5 py-6 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-8 sm:py-7">
          <div className="hidden border-r border-white/15 pr-8 sm:block"><span className="royal-editorial text-5xl leading-none text-[var(--accent)]">R<span className="text-[var(--foreground)]">.</span></span></div>
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[.22em] text-[var(--accent)]">Ближайший турнир</p><p className="text-lg font-medium tracking-tight sm:text-xl">{next?.title ?? "Скоро за столом"}</p><p className="mt-1.5 text-xs text-[#beb4a5] sm:text-sm">{next ? `${date} · ${next.format}${next.startingStack ? ` · Стек ${next.startingStack.toLocaleString("ru-RU")}` : ""}` : "Следите за расписанием новых встреч"}</p>
          </div>
          <Link href="/tournaments" className="royal-event-link text-sm font-medium text-[var(--accent)]">Расписание <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </section>
  );
}
