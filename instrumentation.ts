export async function register() {
  // node:sqlite is Node-only — never load this in the Edge runtime
  // (e.g. when instrumentation is invoked for proxy.ts's edge bundle).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { seedAdmin, seedSampleData } = await import("./lib/db/seed-data");
  try {
    await seedAdmin();
    await seedSampleData();
  } catch (err) {
    console.error("[instrumentation] Seeding failed:", err);
  }

  // Telegram bot is entirely optional — everything here is a no-op unless
  // TELEGRAM_BOT_TOKEN is set, so the site behaves exactly as before when
  // it isn't configured.
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const { startTelegramBot } = await import("./lib/telegram/bot");
    startTelegramBot();

    const { checkReminders } = await import("./lib/telegram/reminders");
    const runReminderCheck = () =>
      checkReminders().catch((err) =>
        console.error("[instrumentation] Reminder check failed:", err),
      );
    runReminderCheck();
    setInterval(runReminderCheck, 15 * 60 * 1000);
  }
}
