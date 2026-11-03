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
    <section className="relative overflow-hidden border-b border-[var(--border)] bg-[radial-gradient(ellipse_at_78%_35%,rgba(212,170,84,0.12),transparent_42%),linear-gradient(145deg,#11100e,#0b0a09)] pt-28 sm:pt-36">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(212,170,84,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(212,170,84,.08)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_right,transparent,black)]" />
      <div className="mx-auto grid max-w-6xl gap-10 px-6 pb-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-16 lg:pb-24">
        <div className="relative z-10">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Покерный клуб · Тольятти</p>
          <h1 className="font-display max-w-3xl text-[clamp(2.6rem,6vw,5.4rem)] font-semibold leading-[1.05] tracking-[-0.055em]">
            Игра начинается <span className="text-[var(--accent)]">здесь.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-relaxed text-[var(--muted-foreground)] sm:text-lg">
            Выберите турнир, оставьте заявку и следите за результатами клуба. Всё важное для игрока — в одном месте.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/tournaments">Выбрать турнир <span aria-hidden="true">↗</span></Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/registration/status">Проверить заявку</Link></Button>
          </div>
          <div className="mt-12 grid max-w-xl grid-cols-2 gap-5 border-t border-[var(--border)] pt-6 text-sm sm:grid-cols-3">
            <div><strong className="block">Расписание</strong><span className="text-[var(--muted-foreground)]">и запись онлайн</span></div>
            <div><strong className="block">Результаты</strong><span className="text-[var(--muted-foreground)]">после турнира</span></div>
            <div className="col-span-2 sm:col-span-1"><strong className="block">Рейтинг</strong><span className="text-[var(--muted-foreground)]">игроков клуба</span></div>
          </div>
        </div>
        <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[#17130e] shadow-[0_32px_90px_-38px_rgba(212,170,84,0.25)] sm:min-h-[500px]">
          <Image src="/brand/royal63-card-full.jpg" alt="Игральная карта Royal63" fill priority className="hero-card-art object-cover opacity-90" sizes="(min-width: 1024px) 45vw, 100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0b08]/95 via-[#0d0b08]/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
            <p className="text-xs uppercase tracking-[0.16em] text-white/70">Ближайший турнир</p>
            {next ? <>
              <h2 className="mt-2 font-display text-2xl font-semibold">{next.title}</h2>
              <p className="mt-2 text-sm text-white/80">{date} · {next.format}{next.buyIn != null ? ` · ${next.buyIn.toLocaleString("ru-RU")} ₽` : ""}</p>
              <Link href="/tournaments" className="mt-5 inline-block rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110">Посмотреть и записаться ↗</Link>
            </> : <>
              <h2 className="mt-2 font-display text-2xl font-semibold">Скоро за столом</h2>
              <p className="mt-2 text-sm text-white/80">Новые даты появятся в расписании.</p>
            </>}
          </div>
        </div>
      </div>
    </section>
  );
}
