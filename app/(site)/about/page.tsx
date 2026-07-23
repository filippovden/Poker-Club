import type { Metadata } from "next";
import { Reveal, RevealGroup, RevealItem } from "@/components/reveal";
import { Badge } from "@/components/ui/badge";
import { SITE_CONTENT } from "@/lib/content";

export const metadata: Metadata = {
  title: "О клубе",
  description: `История клуба ${SITE_CONTENT.clubName}, правила и этикет за столом, контакты.`,
};

const FORMATS = [
  { code: "NLH", name: "No-Limit Hold'em", text: "Классический формат, основа расписания клуба." },
  { code: "PLO", name: "Pot-Limit Omaha", text: "Больше динамики и вариативности решений." },
  { code: "MTT", name: "Многостоловый турнир", text: "Гарантированный призовой фонд, несколько столов." },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-28 sm:py-32">
      <Reveal className="mb-6">
        <Badge variant="accent">Закрытый клуб</Badge>
      </Reveal>

      <Reveal delay={0.05}>
        <h1 className="font-display text-[clamp(2rem,6vw,3.5rem)] font-medium tracking-tight">
          {SITE_CONTENT.clubName}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--muted-foreground)]">
          {SITE_CONTENT.about.story}
        </p>
      </Reveal>

      <section className="mt-20">
        <Reveal>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            Форматы игры
          </h2>
        </Reveal>
        <RevealGroup className="mt-6 grid gap-4 sm:grid-cols-3">
          {FORMATS.map((f) => (
            <RevealItem key={f.code}>
              <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <Badge>{f.code}</Badge>
                <h3 className="font-display mt-4 text-base font-medium">{f.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {f.text}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      <section className="mt-20 grid gap-10 sm:grid-cols-2">
        <Reveal>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            Дресс-код
          </h2>
          <p className="mt-4 leading-relaxed text-[var(--foreground)]/85">
            {SITE_CONTENT.about.dressCode}
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            Этикет за столом
          </h2>
          <p className="mt-4 leading-relaxed text-[var(--foreground)]/85">
            {SITE_CONTENT.about.etiquette}
          </p>
        </Reveal>
      </section>

      <section className="mt-20">
        <Reveal>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            Контакты
          </h2>
          <p className="mt-4 max-w-lg leading-relaxed text-[var(--foreground)]/85">
            Хотите присоединиться или узнать о ближайшем турнире? Напишите
            нам в любой из каналов ниже — ответим и расскажем, как попасть
            в клуб.
          </p>
          <div className="mt-6 flex flex-col divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
            <a
              href={`mailto:${SITE_CONTENT.contacts.email}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-[var(--surface-2)]"
            >
              <span className="text-xs text-[var(--muted-foreground)]">Email</span>
              <span>{SITE_CONTENT.contacts.email}</span>
            </a>
            <a
              href={`https://t.me/${SITE_CONTENT.contacts.telegram.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-5 py-4 hover:bg-[var(--surface-2)]"
            >
              <span className="text-xs text-[var(--muted-foreground)]">Telegram</span>
              <span>{SITE_CONTENT.contacts.telegram}</span>
            </a>
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-xs text-[var(--muted-foreground)]">Адрес зала</span>
              <span className="text-right text-[var(--muted-foreground)]">
                Сообщим при подтверждении заявки
              </span>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
