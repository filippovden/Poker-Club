"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronRight, Club, Crown, ScanLine, Spade, Ticket, Trophy, UserRound, X } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";
import type { Tournament } from "@/lib/db/schema";
import "./mini-app.css";

type Event = Pick<Tournament, "id" | "title" | "format" | "startsAt" | "buyIn" | "maxPlayers" | "status" | "description">;
type Own = { id: number; tournamentId: number; title: string; startsAt: string; status: string; tableNumber: number | null; seatNumber: number | null; place: number | null; checkedIn: boolean; canCancel: boolean };
type Account = { user: { id: number; firstName: string }; profile: { name: string; rating: number; tournamentsPlayed: number } | null; suggestedName: string; suggestedPhone: string; registrations: Own[]; results: { tournamentId: number; title: string; place: number; points: number }[] };
type TelegramApp = { initData: string; ready: () => void; expand: () => void; setHeaderColor?: (color: string) => void; setBackgroundColor?: (color: string) => void; showScanQrPopup?: (params: { text: string }, callback: (value: string) => boolean) => void };

declare global { interface Window { Telegram?: { WebApp?: TelegramApp } } }

const STATUS: Record<string, string> = {
  pending: "На рассмотрении", approved: "Подтверждена", rejected: "Отклонена",
  playing: "В игре", eliminated: "Завершена",
};

function eventDate(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("ru-RU", {
    timeZone: "Europe/Samara", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

export function MiniApp({ tournaments }: { tournaments: Event[] }) {
  const [tab, setTab] = useState<"events" | "mine" | "profile">("events");
  const [initData, setInitData] = useState("");
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [selected, setSelected] = useState<Event | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [age, setAge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function loadAccount(auth: string) {
    const res = await fetch("/api/miniapp", { headers: { Authorization: `tma ${auth}` }, cache: "no-store" });
    if (!res.ok) throw new Error("Не удалось загрузить ваши данные. Откройте приложение из Telegram заново.");
    const data = await res.json() as Account;
    setAccount(data);
    if (!name && data.suggestedName) setName(data.suggestedName);
    if (!phone && data.suggestedPhone) setPhone(data.suggestedPhone);
  }

  useEffect(() => {
    const app = window.Telegram?.WebApp;
    const tournamentId = Number(new URLSearchParams(window.location.search).get("tournament"));
    if (Number.isSafeInteger(tournamentId) && tournamentId > 0) {
      setSelected(tournaments.find((item) => item.id === tournamentId) ?? null);
    }
    if (app?.initData) {
      app.ready(); app.expand();
      app.setHeaderColor?.("#0b0c0a"); app.setBackgroundColor?.("#0b0c0a");
      setInitData(app.initData);
      loadAccount(app.initData).catch((error) => setNotice(String(error.message)));
    }
    setReady(true);
  }, [tournaments]);

  async function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !initData) return;
    setBusy(true); setNotice("");
    try {
      const res = await fetch("/api/miniapp", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `tma ${initData}` },
        body: JSON.stringify({ tournamentId: selected.id, name, phone, consent, ageConfirmed: age }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Не удалось отправить заявку");
      await loadAccount(initData);
      setSelected(null); setTab("mine"); setNotice("Заявка отправлена организатору");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Ошибка отправки"); }
    finally { setBusy(false); }
  }

  async function cancel(row: Own) {
    if (!initData || !window.confirm(`Отменить заявку на «${row.title}»?`)) return;
    setBusy(true); setNotice("");
    try {
      const res = await fetch("/api/miniapp", {
        method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `tma ${initData}` },
        body: JSON.stringify({ id: row.id }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Не удалось отменить заявку");
      await loadAccount(initData); setNotice("Заявка отменена");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Ошибка отмены"); }
    finally { setBusy(false); }
  }

  function scanCheckin() {
    const app = window.Telegram?.WebApp;
    if (!app?.showScanQrPopup) { setNotice("Сканер QR недоступен в этой версии Telegram. Откройте QR у входа обычной камерой."); return; }
    app.showScanQrPopup({ text: "Наведите камеру на QR у входа в клуб" }, (value) => {
      try {
        const url = new URL(value);
        const match = /^\/checkin\/([a-f\d-]{36})$/i.exec(url.pathname);
        if (!match) { setNotice("Это не QR клуба Royal63"); return false; }
        setBusy(true); setNotice("");
        fetch("/api/miniapp", {
          method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `tma ${initData}` },
          body: JSON.stringify({ token: match[1] }),
        }).then(async (res) => {
          const data = await res.json() as { error?: string };
          if (!res.ok) throw new Error(data.error ?? "Не удалось отметиться");
          await loadAccount(initData); setNotice("Вы отмечены на турнире ✓");
        }).catch((error) => setNotice(error instanceof Error ? error.message : "Ошибка отметки"))
          .finally(() => setBusy(false));
        return true;
      } catch { setNotice("Это не QR клуба Royal63"); return false; }
    });
  }

  const upcoming = tournaments.filter((t) => t.status === "live" || new Date(t.startsAt).getTime() >= Date.now() - 60 * 60 * 1000);

  return <main className="miniapp">
    <div className="miniapp-shell">
      <header className="miniapp-head">
        <div className="miniapp-brand"><LogoMark className="h-8 w-8" /><span>Royal63</span></div>
        <span className="miniapp-head-tag"><span /> КЛУБ В TELEGRAM</span>
      </header>

      {tab === "events" && <>
        <section className="miniapp-hero">
          <div className="miniapp-hero-content">
            <span className="miniapp-eyebrow">ТОЛЬЯТТИ · ПОКЕРНЫЙ КЛУБ</span>
            <h1>Твой вечер.<br /><em>Твоя игра.</em></h1>
            <p>Ближайшие турниры Royal63, запись и вся история участия в одном месте.</p>
          </div>
          <div className="miniapp-hero-mark">♠</div>
        </section>
        <div className="miniapp-section-head"><div><span className="miniapp-eyebrow">РАСПИСАНИЕ</span><h2>Ближайшие турниры</h2></div><CalendarDays size={20} /></div>
        {upcoming.length ? <div className="miniapp-event-list">{upcoming.map((t) => <article className="miniapp-event" key={t.id}>
          <div className="miniapp-event-top"><span className="miniapp-format">{t.format}</span><span className="miniapp-event-date">{eventDate(t.startsAt)}</span></div>
          <h3>{t.title}</h3>
          <p>{t.description || "Живая игра в клубе Royal63"}</p>
          <div className="miniapp-event-bottom"><span>{t.buyIn != null ? `${t.buyIn.toLocaleString("ru-RU")} ₽` : "Уточняйте условия"}</span><button type="button" onClick={() => { setSelected(t); setNotice(""); }}>Записаться <ArrowRight size={16} /></button></div>
        </article>)}</div> : <div className="miniapp-empty"><Spade size={30} /><h3>Новые турниры скоро</h3><p>Как только организатор добавит расписание, оно появится здесь.</p></div>}
        {!initData && ready && <div className="miniapp-preview-note">Откройте Mini App из бота Royal63, чтобы записаться и увидеть свои заявки.</div>}
      </>}

      {tab === "mine" && <>
        <div className="miniapp-page-head"><span className="miniapp-eyebrow">ЛИЧНЫЙ КАБИНЕТ</span><h1>Мои заявки</h1><p>Статус участия обновляется после решения организатора.</p></div>
        {!initData ? <div className="miniapp-empty"><Ticket size={30} /><h3>Откройте из Telegram</h3><p>Личные заявки доступны после входа через бота клуба.</p></div> : account?.registrations.length ? <div className="miniapp-event-list">{account.registrations.map((r) => <article className="miniapp-event" key={r.id}>
          <div className="miniapp-event-top"><span className="miniapp-format">{STATUS[r.status] ?? r.status}</span><span className="miniapp-event-date">{eventDate(r.startsAt)}</span></div>
          <h3>{r.title}</h3>
          {r.tableNumber && <p>Стол {r.tableNumber}{r.seatNumber ? ` · место ${r.seatNumber}` : ""}</p>}
          {r.place && <p>Итог: {r.place}-е место</p>}
          <div className="miniapp-event-bottom"><span>{r.checkedIn ? "Вы на месте ✓" : "Royal63"}</span>{r.canCancel && <button type="button" className="miniapp-quiet-button" disabled={busy} onClick={() => cancel(r)}>Отменить заявку</button>}</div>
          {!r.checkedIn && ["approved", "playing"].includes(r.status) && <button type="button" className="miniapp-scan" disabled={busy} onClick={scanCheckin}><ScanLine size={17} /> Сканировать QR на входе</button>}
        </article>)}</div> : <div className="miniapp-empty"><Ticket size={30} /><h3>Пока нет заявок</h3><p>Выберите турнир, чтобы присоединиться к игре.</p><button type="button" onClick={() => setTab("events")}>Смотреть турниры <ChevronRight size={16} /></button></div>}
      </>}

      {tab === "profile" && <>
        <div className="miniapp-page-head"><span className="miniapp-eyebrow">ИСТОРИЯ ИГРЫ</span><h1>Профиль игрока</h1><p>Каждый завершённый турнир влияет на ваш рейтинг.</p></div>
        {!initData ? <div className="miniapp-empty"><UserRound size={30} /><h3>Откройте из Telegram</h3><p>Ваш профиль появится после входа через бота клуба.</p></div> : <><div className="miniapp-profile">
          <div className="miniapp-profile-icon"><Crown size={30} /></div>
          <h2>{account?.profile?.name ?? account?.user.firstName ?? "Игрок Royal63"}</h2>
          {account?.profile ? <div className="miniapp-profile-stats"><div><strong>{Math.round(account.profile.rating)}</strong><span>Рейтинг</span></div><div><strong>{account.profile.tournamentsPlayed}</strong><span>Турниров</span></div></div> : <p>Рейтинг появится после первого завершённого турнира.</p>}
        </div>{account?.results.length ? <section className="miniapp-results"><span className="miniapp-eyebrow">ПОСЛЕДНИЕ РЕЗУЛЬТАТЫ</span>{account.results.map((result) => <div key={result.tournamentId}><span>{result.title}<small>{result.place}-е место</small></span><strong>{result.points >= 0 ? "+" : ""}{Math.round(result.points)}</strong></div>)}</section> : null}</>}
      </>}

      {notice && <div role="alert" className="miniapp-notice">{notice}</div>}
    </div>

    <nav className="miniapp-nav" aria-label="Разделы приложения">
      <button type="button" className={tab === "events" ? "active" : ""} onClick={() => setTab("events")}><Club size={21} /><span>Турниры</span></button>
      <button type="button" className={tab === "mine" ? "active" : ""} onClick={() => setTab("mine")}><Ticket size={21} /><span>Мои заявки</span></button>
      <button type="button" className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}><Trophy size={21} /><span>Профиль</span></button>
    </nav>

    {selected && <div className="miniapp-modal-backdrop" onClick={() => setSelected(null)}><section className="miniapp-modal" role="dialog" aria-modal="true" aria-label="Запись на турнир" onClick={(e) => e.stopPropagation()}>
      <div className="miniapp-modal-handle" /><div className="miniapp-modal-top"><div><span className="miniapp-eyebrow">ЗАПИСЬ НА ТУРНИР</span><h2>{selected.title}</h2><p>{eventDate(selected.startsAt)}</p></div><button type="button" aria-label="Закрыть" onClick={() => setSelected(null)}><X size={20} /></button></div>
      {!initData ? <div className="miniapp-empty"><p>Запись доступна внутри Telegram. Откройте приложение из бота клуба.</p></div> : <form onSubmit={apply} className="miniapp-form">
        <label>Имя или игровой ник<input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Как к вам обращаться" /></label>
        <label>Телефон<input required type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 900 000-00-00" /></label>
        <label className="miniapp-check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>Согласен на обработку персональных данных</span></label>
        <label className="miniapp-check"><input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} /><span>Подтверждаю, что мне есть 18 лет</span></label>
        {notice && <p className="miniapp-form-error" role="alert">{notice}</p>}
        <button className="miniapp-submit" disabled={busy || !consent || !age}>{busy ? "Отправляем…" : "Отправить заявку"}<Check size={18} /></button>
        <p className="miniapp-form-fine">Место подтверждает организатор. Статус появится в «Моих заявках».</p>
      </form>}
    </section></div>}
  </main>;
}
