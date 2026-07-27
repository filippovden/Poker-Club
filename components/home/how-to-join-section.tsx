import Link from "next/link";
import { Reveal, RevealGroup, RevealItem } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { SITE_CONTENT } from "@/lib/content";

const STEPS = [
  { n: "1", text: "Оставьте заявку на турнир — на сайте или в Telegram-боте клуба." },
  {
    n: "2",
    text: "Дождитесь подтверждения от организаторов — место закрепляется только после него.",
  },
];

export function HowToJoinSection() {
  const telegramHandle = SITE_CONTENT.contacts.telegram.replace(/^@/, "");
  const phoneHref = SITE_CONTENT.contacts.phone.replace(/[^\d+]/g, "");

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="grid gap-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-8 backdrop-blur-sm sm:grid-cols-2 sm:gap-16 sm:p-12">
        <Reveal>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
            Закрытый клуб
          </span>
          <h2 className="font-display mt-4 text-[clamp(1.5rem,3.5vw,2.25rem)] font-medium tracking-tight">
            Как попасть в клуб
          </h2>
          <RevealGroup className="mt-6 flex flex-col gap-4">
            {STEPS.map((step) => (
              <RevealItem key={step.n} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-xs font-medium text-[var(--accent)]">
                  {step.n}
                </span>
                <p className="text-sm leading-relaxed text-[var(--foreground)]/85">{step.text}</p>
              </RevealItem>
            ))}
          </RevealGroup>
          <Button asChild className="mt-8">
            <Link href="/tournaments">Подать заявку</Link>
          </Button>
        </Reveal>

        <Reveal
          delay={0.1}
          className="flex flex-col justify-center gap-5 border-t border-[var(--border)] pt-8 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-16"
        >
          <div>
            <span className="text-xs text-[var(--muted-foreground)]">Адрес зала</span>
            <p className="mt-1">{SITE_CONTENT.venue}</p>
          </div>
          <a href={`tel:${phoneHref}`} className="block w-fit">
            <span className="text-xs text-[var(--muted-foreground)]">Телефон</span>
            <p className="mt-1 hover:text-[var(--accent)]">{SITE_CONTENT.contacts.phone}</p>
          </a>
          <a
            href={`https://t.me/${telegramHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-fit"
          >
            <span className="text-xs text-[var(--muted-foreground)]">Telegram-канал</span>
            <p className="mt-1 hover:text-[var(--accent)]">{SITE_CONTENT.contacts.telegram}</p>
          </a>
        </Reveal>
      </div>
    </section>
  );
}
