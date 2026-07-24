import { RevealGroup, RevealItem } from "@/components/reveal";
import { SITE_CONTENT } from "@/lib/content";

export function ClubFactsSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <RevealGroup className="grid grid-cols-1 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {SITE_CONTENT.facts.map((fact) => (
          <RevealItem key={fact.label} className="px-8 py-8 text-center">
            <div className="font-display text-[clamp(1.25rem,3vw,2rem)] font-medium text-[var(--accent)]">
              {fact.value}
            </div>
            <div className="mt-1 text-xs text-[var(--muted-foreground)] sm:text-sm">
              {fact.label}
            </div>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
