import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { players } from "@/lib/db/schema";

export async function RatingPreviewSection() {
  const leaders = await db.select({ id: players.id, name: players.name, rating: players.rating, tournamentsPlayed: players.tournamentsPlayed })
    .from(players).orderBy(desc(players.rating)).limit(3);
  return <section className="bg-[#211b13] py-20 text-white sm:py-24">
    <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Рейтинг Royal63</p>
        <h2 className="font-display mt-4 text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-tight">Результаты, которые видны всем</h2>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-white/70">После завершения турнира места попадают в историю игрока, а рейтинг пересчитывается автоматически.</p>
        <Link href="/rating" className="mt-7 inline-flex rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-foreground)] hover:brightness-110">Открыть рейтинг ↗</Link>
      </div>
      <div className="self-center rounded-2xl border border-white/15 bg-white/10 p-5 sm:p-6">
        <div className="mb-4 flex justify-between text-xs uppercase tracking-[0.12em] text-white/60"><span>Игрок</span><span>Рейтинг</span></div>
        {leaders.length ? leaders.map((p, i) => <Link href={`/rating/${p.id}`} key={p.id} className="flex items-center gap-4 border-t border-white/15 py-4 hover:text-[var(--accent)]">
          <span className="w-7 text-sm text-white/50">{String(i + 1).padStart(2, "0")}</span>
          <span className="min-w-0 flex-1 truncate font-medium">{p.name}<span className="block text-xs font-normal text-white/50">{p.tournamentsPlayed} турниров</span></span>
          <strong className="font-display text-xl">{Math.round(p.rating)}</strong>
        </Link>) : <p className="border-t border-white/15 py-8 text-sm text-white/70">Рейтинг появится после первого завершённого турнира.</p>}
      </div>
    </div>
  </section>;
}
