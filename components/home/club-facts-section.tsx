import { RevealGroup, RevealItem } from "@/components/reveal";
import { SITE_CONTENT } from "@/lib/content";

export function ClubFactsSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <RevealGroup className="grid grid-cols-3 gap-6">
        {SITE_CONTENT.facts.map((fact) => (
          <RevealItem key={fact.label} className="text-center sm:text-left">
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
