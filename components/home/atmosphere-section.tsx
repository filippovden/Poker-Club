import Image from "next/image";
import { Reveal } from "@/components/reveal";
import { SITE_CONTENT } from "@/lib/content";

export function AtmosphereSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <div className="grid gap-12 md:grid-cols-2 md:items-center md:gap-16">
        <Reveal>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
            Атмосфера клуба
          </span>
          <h2 className="font-display mt-4 text-[clamp(1.75rem,4vw,3rem)] font-medium leading-tight tracking-tight">
            Не казино. Клуб.
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-[var(--muted-foreground)]">
            {SITE_CONTENT.about.story}
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--border)] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]">
            <Image
              src="/brand/royal63-card-full.jpg"
              alt={`${SITE_CONTENT.clubName} — туз пик`}
              fill
              className="object-cover"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
