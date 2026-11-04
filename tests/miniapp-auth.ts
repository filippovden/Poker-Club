import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyMiniAppInitData } from "../lib/telegram/miniapp-auth";

process.env.TELEGRAM_BOT_TOKEN = "local-test-only";

function signed(date: number, user = { id: 123, first_name: "Анна" }) {
  const params = new URLSearchParams({ auth_date: String(date), user: JSON.stringify(user), query_id: "test" });
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const key = createHmac("sha256", "WebAppData").update(process.env.TELEGRAM_BOT_TOKEN!).digest();
  params.set("hash", createHmac("sha256", key).update(check).digest("hex"));
  return params;
}

const now = Math.floor(Date.now() / 1000);
const valid = signed(now);
assert.deepEqual(verifyMiniAppInitData(valid.toString()), { id: 123, firstName: "Анна", username: null });
const forged = new URLSearchParams(valid);
forged.set("user", JSON.stringify({ id: 999, first_name: "Чужой" }));
assert.equal(verifyMiniAppInitData(forged.toString()), null, "forged identity must fail");
assert.equal(verifyMiniAppInitData(signed(now - 25 * 60 * 60).toString()), null, "expired data must fail");
assert.equal(verifyMiniAppInitData(`${valid.toString()}&user=%7B%7D`), null, "duplicate fields must fail");
console.log("Mini App signature checks passed");
