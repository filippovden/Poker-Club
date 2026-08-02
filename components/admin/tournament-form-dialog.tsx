"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { Tournament } from "@/lib/db/schema";
import { utcIsoToSamaraWallClock } from "@/lib/timezone";

export interface TournamentFormValues {
  title: string;
  format: "NLH" | "PLO" | "MTT";
  startsAt: string;
  buyIn: string;
  description: string;
  status: "upcoming" | "live" | "completed";
}

function TournamentFormFields({
  tournament,
  defaults,
  onSubmit,
  error,
  pending,
}: {
  tournament: Tournament | null;
  defaults?: Tournament | null;
  onSubmit: (formData: FormData) => void;
  error?: string;
  pending?: boolean;
}) {
  // When duplicating a tournament, `tournament` stays null (this is still a
  // create, not an edit) but `defaults` carries the source tournament's
  // values to pre-fill the form with.
  const source = tournament ?? defaults ?? null;
  const [format, setFormat] = useState<TournamentFormValues["format"]>(source?.format ?? "NLH");
  const [status, setStatus] = useState<TournamentFormValues["status"]>(
    source?.status ?? "upcoming",
  );
  const [useTables, setUseTables] = useState(source?.tableCount != null);

  return (
    <form
      action={(formData) => {
        formData.set("format", format);
        formData.set("status", status);
        onSubmit(formData);
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Название</Label>
        <Input id="title" name="title" defaultValue={source?.title} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label>Формат</Label>
          <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NLH">NLH</SelectItem>
              <SelectItem value="PLO">PLO</SelectItem>
              <SelectItem value="MTT">MTT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Статус</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Предстоящий</SelectItem>
              <SelectItem value="live">Идёт сейчас</SelectItem>
              <SelectItem value="completed">Завершён</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startsAt">Дата и время</Label>
          <Input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={utcIsoToSamaraWallClock(source?.startsAt)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="buyIn">Бай-ин, ₽ (пусто = фриролл)</Label>
          <Input
            id="buyIn"
            name="buyIn"
            type="number"
            min={0}
            defaultValue={source?.buyIn ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] p-3">
        <label className="flex items-center gap-2.5 text-sm font-medium">
          <Checkbox
            checked={useTables}
            onCheckedChange={(v) => setUseTables(v === true)}
          />
          Рассадка по столам (сетка мест)
        </label>

        {useTables ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tableCount">Столов</Label>
              <Input
                id="tableCount"
                name="tableCount"
                type="number"
                min={1}
                defaultValue={source?.tableCount ?? 5}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="seatsPerTable">Мест за столом</Label>
              <Input
                id="seatsPerTable"
                name="seatsPerTable"
                type="number"
                min={1}
                defaultValue={source?.seatsPerTable ?? 9}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="maxPlayers">Лимит мест (пусто = без лимита)</Label>
            <Input
              id="maxPlayers"
              name="maxPlayers"
              type="number"
              min={1}
              defaultValue={source?.maxPlayers ?? 60}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={source?.description ?? ""}
        />
      </div>

      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Сохраняем…" : tournament ? "Сохранить" : "Добавить турнир"}
      </Button>
    </form>
  );
}

export function TournamentFormDialog({
  open,
  onOpenChange,
  tournament,
  defaults,
  onSubmit,
  error,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament: Tournament | null;
  defaults?: Tournament | null;
  onSubmit: (formData: FormData) => void;
  error?: string;
  pending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tournament ? "Изменить турнир" : "Новый турнир"}</DialogTitle>
          <DialogDescription>
            Появится на публичной странице турниров сразу после сохранения.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <TournamentFormFields
            tournament={tournament}
            defaults={defaults}
            onSubmit={onSubmit}
            error={error}
            pending={pending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
