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
    <section className="mx-auto max-w-7xl px-6 py-20 sm:py-32 lg:px-10">
      <div className="grid gap-10 border-y border-[var(--border)] py-12 sm:grid-cols-[1.25fr_.75fr] sm:gap-20 sm:py-20">
        <Reveal>
          <span className="royal-section-label">
            Как попасть за стол
          </span>
          <h2 className="royal-editorial mt-7 text-[clamp(3rem,5vw,5rem)] leading-[1.03] tracking-[-.055em]">
            Ваш вечер<br /><em className="font-normal text-[var(--accent)]">начинается здесь.</em>
          </h2>
          <RevealGroup className="mt-10 flex flex-col gap-6">
            {STEPS.map((step) => (
              <RevealItem key={step.n} className="flex items-start gap-5">
                <span className="royal-editorial w-9 shrink-0 text-3xl leading-none text-[var(--accent)]">
                  0{step.n}
                </span>
                <p className="max-w-md text-sm leading-relaxed text-[var(--foreground)]/85 sm:text-base">{step.text}</p>
              </RevealItem>
            ))}
          </RevealGroup>
          <Button asChild size="lg" className="mt-10">
            <Link href="/tournaments">Подать заявку</Link>
          </Button>
        </Reveal>

        <Reveal
          delay={0.1}
          className="flex flex-col justify-center gap-7 border-t border-[var(--border)] pt-8 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-12"
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
