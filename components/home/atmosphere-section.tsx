import { Reveal } from "@/components/reveal";
import { DecorativeScene } from "@/components/decorative-scene";
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
          <DecorativeScene className="aspect-[4/3] rounded-2xl border border-[var(--border)]" />
        </Reveal>
      </div>
    </section>
  );
}
