import type { Metadata } from "next";
import { Reveal } from "@/components/reveal";
import { LookupRegistrationsView } from "@/components/tournaments/lookup-registrations-view";

export const metadata: Metadata = {
  title: "Проверить заявку",
};

export default function RegistrationStatusPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-28 sm:py-32">
      <Reveal>
        <h1 className="font-display text-2xl font-medium tracking-tight">Проверить заявку</h1>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          Если вы подавали заявку через сайт и не подключали Telegram-бота —
          посмотреть статус можно здесь.
        </p>
        <div className="mt-8">
          <LookupRegistrationsView />
        </div>
      </Reveal>
    </div>
  );
}
