import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function main() {
  const previous = process.cwd();
  const temp = mkdtempSync(join(tmpdir(), "royal-miniapp-test-"));
  process.chdir(temp);
  process.env.TELEGRAM_BOT_TOKEN = "local-test-only";
  delete process.env.TELEGRAM_ADMIN_CHAT_ID;
  try {
    const { db } = await import("../lib/db/client");
    const { tournaments, registrations } = await import("../lib/db/schema");
    const { GET, POST, DELETE, PATCH } = await import("../app/api/miniapp/route");
    const checkinToken = "00000000-0000-4000-8000-000000000123";
    const [tournament] = await db.insert(tournaments).values({ title: "Тестовый турнир", format: "NLH", startsAt: "2027-03-01T15:00:00Z", checkinToken }).returning();
    const fields = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: 123, first_name: "Анна" }) });
    const check = [...fields.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
    const key = createHmac("sha256", "WebAppData").update(process.env.TELEGRAM_BOT_TOKEN).digest();
    fields.set("hash", createHmac("sha256", key).update(check).digest("hex"));
    const auth = `tma ${fields.toString()}`;
    const request = (method: string, body?: unknown, authorization = auth) => new Request("http://localhost/api/miniapp", {
      method, headers: { authorization, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined,
    });

    assert.equal((await GET(request("GET", undefined, ""))).status, 401);
    const invalid = await POST(request("POST", { tournamentId: tournament.id, name: "Анна", phone: "89990000001", consent: false, ageConfirmed: true }));
    assert.equal(invalid.status, 400);
    assert.equal((await db.select().from(registrations)).length, 0);
    const created = await POST(request("POST", { tournamentId: tournament.id, name: "Анна", phone: "89990000001", consent: true, ageConfirmed: true }));
    assert.equal(created.status, 200);
    const own = await (await GET(request("GET"))).json();
    assert.equal(own.registrations.length, 1);
    assert.equal(own.registrations[0].title, "Тестовый турнир");
    const [row] = await db.select().from(registrations);
    assert.equal(row.telegramChatId, "123");
    assert.equal((await PATCH(request("PATCH", { token: checkinToken }))).status, 404, "pending application cannot check in");
    const { eq } = await import("drizzle-orm");
    await db.update(registrations).set({ status: "approved" }).where(eq(registrations.id, row.id));
    assert.equal((await PATCH(request("PATCH", { token: checkinToken }))).status, 200);
    assert.equal((await db.select().from(registrations))[0].checkedIn, true);

    const otherFields = new URLSearchParams(fields);
    otherFields.set("user", JSON.stringify({ id: 999, first_name: "Чужой" }));
    assert.equal((await DELETE(request("DELETE", { id: row.id }, `tma ${otherFields}`))).status, 401);
    assert.equal((await db.select().from(registrations)).length, 1);
    assert.equal((await DELETE(request("DELETE", { id: row.id }))).status, 200);
    assert.equal((await db.select().from(registrations)).length, 0);
    console.log("Mini App registration, identity isolation and cancellation passed");
  } finally {
    process.chdir(previous);
    rmSync(temp, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
