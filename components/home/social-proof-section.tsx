import { Reveal, RevealGroup, RevealItem } from "@/components/reveal";
import { SITE_CONTENT } from "@/lib/content";

export function SocialProofSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <RevealGroup className="grid grid-cols-3 gap-6 border-b border-[var(--border)] pb-16">
        {SITE_CONTENT.stats.map((stat) => (
          <RevealItem key={stat.label} className="text-center sm:text-left">
            <div className="font-display text-[clamp(2rem,5vw,3.5rem)] font-medium text-[var(--accent)]">
              {stat.value}
            </div>
            <div className="mt-1 text-xs text-[var(--muted-foreground)] sm:text-sm">
              {stat.label}
            </div>
          </RevealItem>
        ))}
      </RevealGroup>

      <div className="mt-16 grid gap-8 md:grid-cols-2">
        {SITE_CONTENT.testimonials.map((t, i) => (
          <Reveal key={t.author} delay={i * 0.1}>
            <blockquote className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8">
              <p className="font-display text-lg leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </p>
              <footer className="mt-4 text-sm text-[var(--muted-foreground)]">
                — {t.author}
              </footer>
            </blockquote>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
