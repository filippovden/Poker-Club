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
        <Image src="/brand/royal63-card-full.jpg" alt="" fill priority sizes="(min-width: 1024px) 65vw, 100vw" className="hero-card-art object-cover" />
      </div>
      <div className="royal-hero-shade" aria-hidden="true" />
      <div className="royal-hero-halo" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-6 pt-32 sm:pt-40">
        <div className="max-w-2xl pb-14 sm:pb-20">
          <p className="mb-7 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[.24em] text-[var(--accent)] sm:text-xs"><span className="h-px w-8 bg-current" />Royal63 · Покерный клуб · Тольятти</p>
          <h1 className="royal-editorial text-[clamp(4.2rem,8vw,7.5rem)] leading-[.95] tracking-[-.055em]">Твой ход.<br /><em className="font-normal text-[var(--accent)]">Твой круг.</em></h1>
          <p className="mt-8 max-w-[26rem] text-base leading-relaxed text-[#c4bdb2] sm:text-lg">Живой покер. Люди, с которыми хочется играть. Вечер, который начинается за одним столом.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/tournaments">Выбрать турнир <span aria-hidden="true">↗</span></Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/registration/status">Моя заявка</Link></Button>
          </div>
          <div className="mt-8 flex items-center gap-4 text-[10px] uppercase tracking-[.18em] text-[#a79c8b]"><span>Texas Hold’em</span><span className="text-[var(--accent)]" aria-hidden="true">♠</span><span>Omaha</span><span className="ml-2 rounded border border-[var(--border)] px-2 py-1">18+</span></div>
        </div>
        <div className="relative grid gap-5 border-t border-[var(--accent)]/25 py-6 sm:grid-cols-[1fr_auto] sm:items-center sm:py-7">
          <div className="flex items-center gap-5">
            <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--accent)]/30 text-xl text-[var(--accent)]">♠</span>
            <div><p className="mb-1 text-[10px] uppercase tracking-[.2em] text-[var(--accent)]">Следующая встреча за столом</p><p className="text-base font-medium sm:text-lg">{next?.title ?? "Новый турнир — скоро"}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{next ? `${date} · ${next.format}${next.startingStack ? ` · Стек ${next.startingStack.toLocaleString("ru-RU")}` : ""}` : "Расписание появится здесь. Пока познакомьтесь с клубом."}</p></div>
          </div>
          <Link href={next ? "/tournaments" : "/about"} className="ml-[4.25rem] text-sm text-[var(--accent)] underline-offset-4 hover:underline sm:ml-0">{next ? "К расписанию" : "О клубе"} <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </section>
  );
}
