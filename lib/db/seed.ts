import { seedAdmin, seedSampleData } from "./seed-data";

async function main() {
  await seedAdmin();
  await seedSampleData();
  console.log("[seed] Done.");
}

main();
