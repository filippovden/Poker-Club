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
}
