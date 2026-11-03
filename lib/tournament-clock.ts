export type BlindLevel = {
  kind: "play" | "break";
  minutes: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
};

export const DEFAULT_BLIND_LEVELS: BlindLevel[] = [
  { kind: "play", minutes: 20, smallBlind: 50, bigBlind: 100, ante: 0 },
  { kind: "play", minutes: 20, smallBlind: 100, bigBlind: 200, ante: 0 },
  { kind: "play", minutes: 20, smallBlind: 150, bigBlind: 300, ante: 0 },
  { kind: "break", minutes: 10, smallBlind: 0, bigBlind: 0, ante: 0 },
  { kind: "play", minutes: 20, smallBlind: 200, bigBlind: 400, ante: 0 },
  { kind: "play", minutes: 20, smallBlind: 300, bigBlind: 600, ante: 0 },
  { kind: "play", minutes: 20, smallBlind: 400, bigBlind: 800, ante: 0 },
  { kind: "break", minutes: 10, smallBlind: 0, bigBlind: 0, ante: 0 },
  { kind: "play", minutes: 20, smallBlind: 500, bigBlind: 1000, ante: 100 },
  { kind: "play", minutes: 20, smallBlind: 600, bigBlind: 1200, ante: 100 },
  { kind: "play", minutes: 20, smallBlind: 800, bigBlind: 1600, ante: 200 },
  { kind: "play", minutes: 20, smallBlind: 1000, bigBlind: 2000, ante: 200 },
];

export function totalSeconds(levels: BlindLevel[]) {
  return levels.reduce((sum, level) => sum + level.minutes * 60, 0);
}

export function clockPosition(levels: BlindLevel[], elapsedSeconds: number) {
  const total = totalSeconds(levels);
  const elapsed = Math.min(Math.max(0, Math.floor(elapsedSeconds)), total);
  let before = 0;
  for (let index = 0; index < levels.length; index++) {
    const duration = levels[index].minutes * 60;
    if (elapsed < before + duration || index === levels.length - 1) {
      return {
        index,
        level: levels[index],
        next: levels[index + 1] ?? null,
        remainingSeconds: Math.max(0, before + duration - elapsed),
        finished: elapsed >= total,
      };
    }
    before += duration;
  }
  throw new Error("Структура блайндов пуста");
}

export function levelStartSeconds(levels: BlindLevel[], index: number) {
  return levels.slice(0, Math.min(Math.max(index, 0), levels.length)).reduce((sum, level) => sum + level.minutes * 60, 0);
}

export function elapsedAt(now: number, elapsedSeconds: number, runningSince: string | null) {
  return elapsedSeconds + (runningSince ? Math.max(0, Math.floor((now - Date.parse(runningSince)) / 1000)) : 0);
}

export function parseBlindLevels(value: unknown): BlindLevel[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 40) return null;
  const levels: BlindLevel[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") return null;
    const item = row as Record<string, unknown>;
    const kind = item.kind;
    const minutes = Number(item.minutes);
    const smallBlind = Number(item.smallBlind);
    const bigBlind = Number(item.bigBlind);
    const ante = Number(item.ante);
    if (kind !== "play" && kind !== "break") return null;
    if (![minutes, smallBlind, bigBlind, ante].every(Number.isSafeInteger)) return null;
    if (minutes < 1 || minutes > 120) return null;
    if (kind === "play" && (smallBlind < 1 || bigBlind < smallBlind || bigBlind > 1_000_000 || ante < 0 || ante > 1_000_000)) return null;
    levels.push({ kind, minutes, smallBlind: kind === "break" ? 0 : smallBlind, bigBlind: kind === "break" ? 0 : bigBlind, ante: kind === "break" ? 0 : ante });
  }
  return levels;
}
