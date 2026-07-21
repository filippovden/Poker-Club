import { Badge } from "@/components/ui/badge";
import type { Tournament } from "@/lib/db/schema";

const FORMAT_LABELS: Record<string, string> = {
  NLH: "No-Limit Hold'em",
  PLO: "Pot-Limit Omaha",
  MTT: "Многостоловый турнир",
};

const STATUS_LABELS: Record<Tournament["status"], string> = {
  upcoming: "Скоро",
  live: "Идёт сейчас",
  completed: "Завершён",
};

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  const isPast = tournament.status === "completed";

  return (
    <div
      className={`group relative flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 transition-all duration-300 hover:border-[var(--accent)]/40 hover:-translate-y-0.5 ${isPast ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between">
        <Badge variant={tournament.status === "live" ? "live" : "default"}>
          {tournament.status === "live" && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
          )}
          {STATUS_LABELS[tournament.status]}
        </Badge>
        <span className="text-xs text-[var(--muted-foreground)]">
          {formatDate(tournament.startsAt)}
        </span>
      </div>

      <div>
        <h3 className="font-display text-xl font-medium tracking-tight">
          {tournament.title}
        </h3>
        {tournament.description && (
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
            {tournament.description}
          </p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-4 text-sm">
        <span className="font-medium">
          {tournament.buyIn ? `${tournament.buyIn.toLocaleString("ru-RU")} ₽` : "Фриролл"}
        </span>
        <span className="text-[var(--muted-foreground)]">
          {FORMAT_LABELS[tournament.format] ?? tournament.format}
        </span>
      </div>
    </div>
  );
}
