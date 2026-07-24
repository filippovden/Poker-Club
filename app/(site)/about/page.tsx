import type { Metadata } from "next";
import Image from "next/image";
import { Reveal, RevealGroup, RevealItem } from "@/components/reveal";
import { Badge } from "@/components/ui/badge";
import { SITE_CONTENT } from "@/lib/content";

const ABOUT_DESCRIPTION = `${SITE_CONTENT.clubName} — покерный клуб в Тольятти. История клуба, правила и этикет за столом, контакты.`;

export const metadata: Metadata = {
  title: "О клубе",
  description: ABOUT_DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: { title: `О клубе — ${SITE_CONTENT.clubName}`, description: ABOUT_DESCRIPTION },
};

const FORMATS = [
  { code: "NLH", name: "No-Limit Hold'em", text: "Классический формат, основа расписания клуба." },
  { code: "PLO", name: "Pot-Limit Omaha", text: "Больше динамики и вариативности решений." },
  { code: "MTT", name: "Многостоловый турнир", text: "Гарантированный призовой фонд, несколько столов." },
];

const FAQ = [
  {
    question: "Как записаться на турнир?",
    answer:
      "Через сайт (страница «Турниры» → «Подать заявку») или прямо в Telegram-боте — короткая анкета: имя, телефон, email. После этого организаторы свяжутся с вами и подтвердят участие.",
  },
  {
    question: "Нужно ли платить при онлайн-заявке?",
    answer: "Нет, заявка — это бронирование места. Бай-ин оплачивается на месте перед началом турнира.",
  },
  {
    question: "Можно ли отменить заявку?",
    answer:
      "Да, в любой момент — по ссылке из подтверждения или командой /cancel в Telegram-боте.",
  },
  {
    question: "Со скольки лет можно участвовать?",
    answer: "Участие в турнирах клуба доступно только лицам, достигшим 18 лет.",
  },
  {
    question: "Что если все места заняты?",
    answer:
      "Заявка всё равно принимается и встаёт в лист ожидания — если кто-то отменит участие, организаторы свяжутся со следующим в очереди.",
  },
  {
    question: "Какой дресс-код?",
    answer: "Свободный стиль, без спортивной обуви и головных уборов в игровой зоне.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-28 sm:py-32">
      <Reveal className="mb-6">
        <Badge variant="accent">Закрытый клуб</Badge>
      </Reveal>

      <div className="grid gap-10 sm:grid-cols-[1.1fr_0.9fr] sm:items-center">
        <Reveal delay={0.05}>
          <h1 className="font-display text-[clamp(2rem,6vw,3.5rem)] font-medium tracking-tight">
            {SITE_CONTENT.clubName}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--muted-foreground)]">
            {SITE_CONTENT.about.story}
          </p>
        </Reveal>
        <Reveal delay={0.15} className="mx-auto w-full max-w-xs sm:max-w-none">
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]">
            <Image
              src="/brand/royal63-card-full.jpg"
              alt={`${SITE_CONTENT.clubName} — туз пик`}
              width={1248}
              height={1248}
              className="h-auto w-full"
              priority
            />
          </div>
        </Reveal>
      </div>

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQ.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: { "@type": "Answer", text: item.answer },
              })),
            }),
          }}
        />
        <Reveal>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            Частые вопросы
          </h2>
        </Reveal>
        <RevealGroup className="mt-6 flex flex-col gap-3">
          {FAQ.map((item) => (
            <RevealItem key={item.question}>
              <details className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 open:pb-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium marker:content-['']">
                  {item.question}
                  <span className="shrink-0 text-[var(--muted-foreground)] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 leading-relaxed text-[var(--muted-foreground)]">
                  {item.answer}
                </p>
              </details>
            </RevealItem>
          ))}
        </RevealGroup>
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
