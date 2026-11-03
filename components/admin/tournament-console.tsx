"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Maximize2, MonitorPlay, Pause, Play, RotateCcw, Save, SkipBack, SkipForward, Plus, Trash2 } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";
import { changeClock, getClockSnapshot, saveBlindLevels, type ClockSnapshot, type ClockCommand } from "@/lib/actions/tournament-clock";
import { blindPreset, clockPosition, totalSeconds, type BlindLevel, type BlindPreset } from "@/lib/tournament-clock";

const number = (value: number) => value.toLocaleString("ru-RU");
const clockText = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const blindText = (level: BlindLevel | null) => !level ? "—" : level.kind === "break" ? "Перерыв" : `${number(level.smallBlind)} / ${number(level.bigBlind)}`;

function secondsToBreak(levels: BlindLevel[], index: number, remainingSeconds: number) {
  if (levels[index]?.kind === "break") return 0;
  let seconds = remainingSeconds;
  for (let i = index + 1; i < levels.length; i++) {
    if (levels[i].kind === "break") return seconds;
    seconds += levels[i].minutes * 60;
  }
  return null;
}

function Stage({ title, format, snapshot, elapsedSeconds, screenMode }: {
  title: string;
  format: string;
  snapshot: ClockSnapshot;
  elapsedSeconds: number;
  screenMode: boolean;
}) {
  const position = clockPosition(snapshot.levels, elapsedSeconds);
  const levelNumber = snapshot.levels.slice(0, position.index + 1).filter((level) => level.kind === "play").length;
  const stateLabel = snapshot.status === "completed" ? "Завершён" : position.finished ? "Структура завершена" : snapshot.running ? "Идёт игра" : snapshot.status === "upcoming" || elapsedSeconds === 0 ? "Ожидание старта" : "Пауза";
  const breakIn = secondsToBreak(snapshot.levels, position.index, position.remainingSeconds);
  return <div className={`royal-clock-stage ${screenMode ? "royal-clock-stage-screen" : "royal-clock-stage-control"} ${position.level.kind === "break" ? "royal-clock-is-break" : ""} ${position.remainingSeconds <= 60 && !position.finished ? "royal-clock-last-minute" : ""}`}>
    <div className="royal-clock-photo" aria-hidden="true" />
    <div className="royal-clock-content">
      <header className="royal-clock-header">
        <div className="royal-clock-brand"><LogoMark className="h-8 w-8 sm:h-10 sm:w-10" /><span className="font-display text-xl font-semibold tracking-tight text-[#f5eee2] sm:text-2xl">Royal63</span><span className="royal-clock-brand-divider" /><span className="royal-clock-brand-caption">Турнирный экран</span></div>
        <div className="royal-clock-status"><span className={`royal-clock-dot ${snapshot.running ? "royal-clock-dot-live" : ""}`} />{stateLabel}</div>
      </header>

      <div className="royal-clock-main">
        <div className="royal-broadcast-heading"><p className="royal-clock-eyebrow">{format}<span className="royal-broadcast-diamond">◆</span>{position.level.kind === "break" ? "Перерыв" : `Уровень ${String(levelNumber).padStart(2, "0")}`}</p><h1 className="royal-clock-title">{title}</h1></div>
        <div className="royal-broadcast-core">
          <p className="royal-broadcast-time-label">{position.level.kind === "break" ? "До конца перерыва" : "До конца уровня"}</p>
          <div className="royal-clock-time" role="timer" aria-label={`${position.level.kind === "break" ? "До конца перерыва" : "До конца уровня"} ${clockText(position.remainingSeconds)}`}>{clockText(position.remainingSeconds)}</div>
          <div className="royal-clock-time-line" aria-hidden="true"><span style={{ width: `${position.level.minutes > 0 ? 100 * (1 - position.remainingSeconds / (position.level.minutes * 60)) : 0}%` }} /></div>
          <div className="royal-broadcast-current"><span>{position.level.kind === "break" ? "Сейчас перерыв" : "Текущие блайнды"}</span><strong>{blindText(position.level)}</strong><small>{position.level.kind === "play" && position.level.ante > 0 ? `Анте ${number(position.level.ante)}` : position.level.kind === "break" ? "Следующий уровень уже скоро" : "Малый / большой блайнд"}</small></div>
        </div>
      </div>

      <footer className="royal-clock-footer">
        <div className="royal-clock-stat"><span>Следующий уровень</span><strong>{blindText(position.next)}</strong><small>{position.next?.kind === "play" && position.next.ante > 0 ? `Анте ${number(position.next.ante)}` : position.next ? `${position.next.minutes} минут` : "Последний уровень"}</small></div>
        <div className="royal-clock-stat royal-clock-stat-players"><span>Игроки в игре</span><strong>{snapshot.remainingPlayers}<em> / {snapshot.totalPlayers}</em></strong><small>Осталось / всего</small></div>
        <div className="royal-clock-stat royal-clock-stat-break"><span>До перерыва</span><strong>{breakIn === null ? "—" : breakIn === 0 ? "Сейчас" : clockText(breakIn)}</strong><small>{breakIn === null ? "Перерывов нет" : "По структуре турнира"}</small></div>
      </footer>
    </div>
  </div>;
}

function LevelEditor({ levels, onChange, disabled }: { levels: BlindLevel[]; onChange: (levels: BlindLevel[]) => void; disabled: boolean }) {
  function update(index: number, changes: Partial<BlindLevel>) { onChange(levels.map((level, i) => i === index ? { ...level, ...changes } : level)); }
  return <div className="space-y-2 overflow-x-auto">
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs text-[#a79d8e]">Готовая структура</span>
      {([ ["turbo", "Турбо · 10 мин"], ["standard", "Стандарт · 20 мин"], ["deep", "Дипстек · 30 мин"] ] as const).map(([key, label]) =>
        <button key={key} type="button" disabled={disabled} onClick={() => onChange(blindPreset(key as BlindPreset))} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-[#e8dac3] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40">{label}</button>
      )}
      <span className="ml-auto text-xs text-[#a79d8e]">Этапов: {levels.length} · {Math.round(totalSeconds(levels) / 60)} мин</span>
    </div>
    <div className="grid min-w-[590px] grid-cols-[2.5rem_1.2fr_1fr_1fr_1fr_1fr_2.5rem] gap-2 px-2 text-center text-[10px] uppercase tracking-[.12em] text-[#8d8375]"><span /> <span>Тип</span><span>SB</span><span>BB</span><span>Анте</span><span>Мин.</span><span /></div>
    {levels.map((level, index) => <div key={index} className="grid min-w-[590px] grid-cols-[2.5rem_1.2fr_1fr_1fr_1fr_1fr_2.5rem] items-center gap-2 rounded-xl border border-white/10 bg-white/[.025] p-2 text-xs">
      <span className="text-center font-medium text-[var(--accent)]">{String(index + 1).padStart(2, "0")}</span>
      <select aria-label={`Тип уровня ${index + 1}`} value={level.kind} disabled={disabled} onChange={(event) => update(index, { kind: event.target.value as BlindLevel["kind"] })} className="min-w-0 rounded-lg border border-white/10 bg-[#171714] px-2 py-2 text-[#eee6d9]"><option value="play">Игра</option><option value="break">Перерыв</option></select>
      <input aria-label={`Малый блайнд уровня ${index + 1}`} type="number" min="0" value={level.smallBlind} disabled={disabled || level.kind === "break"} onChange={(event) => update(index, { smallBlind: Number(event.target.value) })} className="min-w-0 rounded-lg border border-white/10 bg-[#171714] px-2 py-2" />
      <input aria-label={`Большой блайнд уровня ${index + 1}`} type="number" min="0" value={level.bigBlind} disabled={disabled || level.kind === "break"} onChange={(event) => update(index, { bigBlind: Number(event.target.value) })} className="min-w-0 rounded-lg border border-white/10 bg-[#171714] px-2 py-2" />
      <input aria-label={`Анте уровня ${index + 1}`} type="number" min="0" value={level.ante} disabled={disabled || level.kind === "break"} onChange={(event) => update(index, { ante: Number(event.target.value) })} className="min-w-0 rounded-lg border border-white/10 bg-[#171714] px-2 py-2" />
      <input aria-label={`Минуты уровня ${index + 1}`} type="number" min="1" max="120" value={level.minutes} disabled={disabled} onChange={(event) => update(index, { minutes: Number(event.target.value) })} className="min-w-0 rounded-lg border border-white/10 bg-[#171714] px-2 py-2" />
      <button type="button" aria-label={`Удалить уровень ${index + 1}`} disabled={disabled || levels.length <= 1} onClick={() => onChange(levels.filter((_, i) => i !== index))} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#9a9083] hover:bg-white/10 hover:text-white disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
    </div>)}
    <div className="flex flex-wrap gap-2"><button type="button" disabled={disabled || levels.length >= 40} onClick={() => { const last = [...levels].reverse().find((level) => level.kind === "play"); onChange([...levels, { kind: "play", minutes: 20, smallBlind: last ? last.bigBlind : 50, bigBlind: last ? last.bigBlind * 2 : 100, ante: 0 }]); }} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm text-[#e8dac3] hover:border-[var(--accent)] disabled:opacity-40"><Plus className="h-4 w-4" />Добавить уровень</button>
    <button type="button" disabled={disabled || levels.length >= 40} onClick={() => onChange([...levels, { kind: "break", minutes: 10, smallBlind: 0, bigBlind: 0, ante: 0 }])} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm text-[#e8dac3] hover:border-[var(--accent)] disabled:opacity-40"><Plus className="h-4 w-4" />Добавить перерыв</button></div>
  </div>;
}

export function TournamentConsole({ tournamentId, title, format, initial, screenMode }: { tournamentId: number; title: string; format: string; initial: ClockSnapshot; screenMode: boolean }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [receivedAt, setReceivedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [levels, setLevels] = useState(initial.levels);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const elapsedSeconds = snapshot.elapsedSeconds + (snapshot.running ? Math.max(0, Math.floor((now - receivedAt) / 1000)) : 0);

  const accept = useCallback((fresh: ClockSnapshot, syncEditor = false) => { const time = Date.now(); setSnapshot(fresh); if (syncEditor) setLevels(fresh.levels); setReceivedAt(time); setNow(time); }, []);
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 250);
    const poll = window.setInterval(() => { getClockSnapshot(tournamentId).then((fresh) => { accept(fresh); setError((current) => current?.startsWith("Связь с сервером") ? null : current); }).catch(() => setError("Связь с сервером прервалась. Время уточняется…")); }, 5000);
    return () => { window.clearInterval(tick); window.clearInterval(poll); };
  }, [tournamentId, accept]);

  function run(command: ClockCommand) {
    startTransition(async () => {
      try { const result = await changeClock(tournamentId, command); if (result.error) setError(result.error); else if (result.snapshot) { accept(result.snapshot); setError(null); } }
      catch { setError("Не удалось изменить таймер. Попробуйте ещё раз."); }
    });
  }
  function save() {
    startTransition(async () => {
      try { const result = await saveBlindLevels(tournamentId, levels); if (result.error) setError(result.error); else if (result.snapshot) { accept(result.snapshot, true); setError(null); } }
      catch { setError("Не удалось сохранить структуру."); }
    });
  }

  if (screenMode) return <main className="royal-tv-page">
    <Stage title={title} format={format} snapshot={snapshot} elapsedSeconds={elapsedSeconds} screenMode />
    <button type="button" className="royal-tv-fullscreen" onClick={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); }} aria-label="На весь экран" title="На весь экран"><Maximize2 className="h-5 w-5" /></button>
    {error && <p className="royal-tv-error" role="alert">{error}</p>}
  </main>;

  return <main className="min-h-screen bg-[#0b0c0a] pb-20 text-[#f4efe6]">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5"><Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-sm text-[#b7ad9e] hover:text-[var(--accent)]"><ArrowLeft className="h-4 w-4" /> К турнирам</Link><a href={`/admin/tournament/${tournamentId}?screen=1`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/50 px-5 py-2.5 text-sm text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#17130b]"><MonitorPlay className="h-4 w-4" /> Экран для зала</a></div>
    <div className="mx-auto max-w-7xl px-6"><Stage title={title} format={format} snapshot={snapshot} elapsedSeconds={elapsedSeconds} screenMode={false} /></div>
    <div className="mx-auto grid max-w-7xl gap-8 px-6 pt-8 lg:grid-cols-[.75fr_1.25fr]">
      <section className="rounded-2xl border border-white/10 bg-[#171815] p-6"><p className="text-[10px] uppercase tracking-[.22em] text-[var(--accent)]">Управление</p><h2 className="royal-editorial mt-3 text-3xl">Таймер турнира</h2><p className="mt-2 text-sm leading-relaxed text-[#a79d8e]">Время сохраняется на сервере и продолжит идти после перезагрузки страницы.</p>
        {snapshot.status === "upcoming" && <p className="mt-4 text-sm text-[var(--accent)]">Сначала запустите турнир через «Ход игры» в панели организатора.</p>}
        <div className="mt-7 grid grid-cols-2 gap-3"><button type="button" disabled={pending || snapshot.status !== "live"} onClick={() => run("toggle")} className="col-span-2 flex h-14 items-center justify-center gap-2 rounded-full bg-[var(--accent)] font-semibold text-[#17130b] hover:brightness-110 disabled:opacity-50">{snapshot.running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}{snapshot.running ? "Пауза" : "Старт / продолжить"}</button><button type="button" disabled={pending || snapshot.status === "completed"} onClick={() => run("previous")} className="royal-clock-control"><SkipBack className="h-4 w-4" /> Предыдущий</button><button type="button" disabled={pending || snapshot.status === "completed"} onClick={() => run("next")} className="royal-clock-control">Следующий <SkipForward className="h-4 w-4" /></button></div>
        <button type="button" disabled={pending || snapshot.status === "completed"} onClick={() => run("reset")} className="mt-5 inline-flex items-center gap-2 text-xs text-[#9b9081] hover:text-white disabled:opacity-40"><RotateCcw className="h-3.5 w-3.5" /> Сбросить таймер</button>
        {error && <p className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200" role="alert">{error}</p>}
      </section>
      <section className="rounded-2xl border border-white/10 bg-[#171815] p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[.22em] text-[var(--accent)]">Структура</p><h2 className="royal-editorial mt-3 text-3xl">Уровни и перерывы</h2><p className="mt-2 text-sm text-[#a79d8e]">Редактирование доступно на паузе. Сохранение начинает отсчёт заново.</p></div><button type="button" disabled={pending || snapshot.running || snapshot.status === "completed"} onClick={save} className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[#17130b] hover:brightness-110 disabled:opacity-40"><Save className="h-4 w-4" /> Сохранить</button></div><div className="mt-6"><LevelEditor levels={levels} onChange={setLevels} disabled={pending || snapshot.running || snapshot.status === "completed"} /></div></section>
    </div>
  </main>;
}
