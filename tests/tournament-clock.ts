import assert from "node:assert/strict";
import { blindPreset, clockPosition, elapsedAt, levelStartSeconds, parseBlindLevels, type BlindLevel } from "../lib/tournament-clock";

const levels: BlindLevel[] = [
  { kind: "play", minutes: 1, smallBlind: 50, bigBlind: 100, ante: 0 },
  { kind: "break", minutes: 1, smallBlind: 0, bigBlind: 0, ante: 0 },
  { kind: "play", minutes: 2, smallBlind: 100, bigBlind: 200, ante: 25 },
];

assert.equal(clockPosition(levels, 0).remainingSeconds, 60);
assert.equal(clockPosition(levels, 59).index, 0);
assert.equal(clockPosition(levels, 60).level.kind, "break");
assert.equal(clockPosition(levels, 120).index, 2);
assert.equal(clockPosition(levels, 9999).remainingSeconds, 0);
assert.equal(clockPosition(levels, 9999).finished, true);
assert.equal(levelStartSeconds(levels, 2), 120);
assert.equal(elapsedAt(Date.parse("2026-11-03T12:00:30Z"), 42, "2026-11-03T12:00:00Z"), 72);
assert.equal(elapsedAt(Date.parse("2026-11-03T12:00:30Z"), 42, null), 42);
assert.equal(parseBlindLevels(levels)?.length, 3);
assert.equal(parseBlindLevels([{ ...levels[0], bigBlind: 10 }]), null);
assert.equal(parseBlindLevels([]), null);
assert.equal(blindPreset("turbo").find((level) => level.kind === "play")?.minutes, 10);
assert.equal(blindPreset("deep").find((level) => level.kind === "break")?.minutes, 15);

console.log("Tournament clock checks passed");
