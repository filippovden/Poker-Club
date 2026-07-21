import { Reveal } from "@/components/reveal";
import { CtaButtons } from "./cta-buttons";

export function CtaSection() {
  return (
    <section className="grain relative overflow-hidden bg-black py-28 sm:py-36">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 100% at 50% 100%, rgba(201,162,39,0.15), transparent 60%)",
        }}
      />
      <Reveal className="relative mx-auto flex max-w-3xl flex-col items-center px-6 text-center">
        <h2 className="font-display text-[clamp(2rem,6vw,3.5rem)] font-medium tracking-tight text-white">
          Готовы сесть за стол?
        </h2>
        <p className="mt-5 max-w-md text-white/60">
          Забронируйте место на ближайшем турнире или узнайте больше о клубе
          и правилах игры.
        </p>
        <CtaButtons />
      </Reveal>
    </section>
  );
}
