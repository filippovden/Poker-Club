import { PokerChipLoader } from "@/components/poker-chip-loader";
import { StuckLoadingNotice } from "@/components/stuck-loading-notice";

export default function Loading() {
  return (
    <div className="flex min-h-[70svh] flex-col items-center justify-center gap-4 px-6 py-28">
      <PokerChipLoader className="h-14 w-14" />
      <p className="text-sm text-[var(--muted-foreground)]">Загружаем турниры…</p>
      <StuckLoadingNotice />
    </div>
  );
}
