import { Reveal } from "@/components/reveal";
import { CtaButtons } from "./cta-buttons";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-[var(--surface)] py-20 sm:py-24">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 100% at 50% 100%, rgba(212,170,84,0.1), transparent 60%)",
        }}
      />
      <Reveal className="relative mx-auto flex max-w-3xl flex-col items-center px-6 text-center">
        <h2 className="font-display text-[clamp(2rem,6vw,3.5rem)] font-semibold tracking-tight">
          Готовы сесть за стол?
        </h2>
        <p className="mt-5 max-w-md text-[var(--muted-foreground)]">
          Посмотрите расписание ближайших турниров или узнайте больше о
          клубе и о том, как попасть в игру.
        </p>
        <CtaButtons />
      </Reveal>
    </section>
  );
}
