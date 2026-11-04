import Image from "next/image";
import { Reveal } from "@/components/reveal";
import { SITE_CONTENT } from "@/lib/content";

export function AtmosphereSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 sm:py-36 lg:px-10">
      <div className="grid gap-12 md:grid-cols-[.9fr_1.1fr] md:items-center md:gap-20">
        <Reveal>
          <span className="royal-section-label">
            Атмосфера клуба
          </span>
          <h2 className="royal-editorial mt-7 text-[clamp(3rem,5.5vw,5.4rem)] leading-[1.02] tracking-[-.055em]">
            Свои люди.<br /><em className="font-normal text-[var(--accent)]">Своя игра.</em>
          </h2>
          <p className="mt-7 max-w-md text-base leading-[1.8] text-[var(--muted-foreground)]">
            {SITE_CONTENT.about.story}
          </p>
          <div className="mt-9 flex items-center gap-4 border-t border-[var(--border)] pt-6 text-xs uppercase tracking-[.18em] text-[var(--accent)]"><span>♠</span><span>Royal63</span><span className="text-[var(--muted-foreground)]">Тольятти</span></div>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="relative aspect-[4/3] overflow-hidden border border-[var(--border)] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]">
            <Image
              src="/brand/royal63-card-full.jpg"
              alt={`${SITE_CONTENT.clubName} — туз пик`}
              fill
              className="object-cover opacity-90 transition-transform duration-700 hover:scale-[1.04]"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
