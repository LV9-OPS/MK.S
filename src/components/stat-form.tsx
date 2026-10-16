"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ActionState } from "@/lib/errors";
import { STAT_GAMES, STAT_MODES } from "@/lib/constants";
import { IMAGE_ACCEPT } from "@/lib/files";
import { isValidDateString, weekLabel, weekStartOf } from "@/lib/weeks";
import { ActionForm, Field, FieldError, SelectField, SubmitButton, TextAreaField, useFieldError } from "./forms";

type StatValues = {
  weekStart?: string;
  game?: string;
  mode?: string;
  matchesPlayed?: number | null;
  wins?: number | null;
  kills?: number | null;
  deaths?: number | null;
  kdRatio?: number | null;
  notes?: string | null;
};

function DuplicateNotice({ editBase }: { editBase: string }) {
  const err = useFieldError("week");
  if (!err?.startsWith("existing:")) return null;
  const id = err.slice("existing:".length);
  return id ? (
    <p className="mt-1 text-xs text-warning">
      Une déclaration existe déjà pour cette semaine et ce mode. <Link href={`${editBase}/${id}/modifier`} className="link">Modifier la déclaration existante</Link>
    </p>
  ) : null;
}

function WeekPicker({ defaultValue, max }: { defaultValue: string; max: string }) {
  const [value, setValue] = useState(defaultValue);
  const label = isValidDateString(value) ? weekLabel(weekStartOf(value)) : "Choisissez une date";
  return (
    <div>
      <label htmlFor="week" className="label">Semaine <span className="text-accent" aria-hidden>*</span></label>
      <input id="week" name="week" type="date" required value={value} max={max} onChange={(e) => setValue(e.target.value)} className="input" aria-describedby="week-hint" />
      <p id="week-hint" className="hint">
        Choisissez n&apos;importe quel jour : la semaine retenue va du lundi au dimanche. → <strong className="text-text">{label}</strong>
      </p>
      <FieldError name="week" />
      <DuplicateNotice editBase="/stats" />
    </div>
  );
}

function ScreenshotInput({ required, currentSrc }: { required: boolean; currentSrc?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  return (
    <div>
      <label htmlFor="screenshot" className="label">
        Capture d&apos;écran des statistiques {required && <span className="text-accent" aria-hidden>*</span>}
      </label>
      <input
        id="screenshot"
        name="screenshot"
        type="file"
        accept={IMAGE_ACCEPT}
        required={required}
        className="input file:mr-3 file:rounded file:border-0 file:bg-surface-2 file:px-3 file:py-1 file:text-text"
        onChange={(e) => {
          const f = e.target.files?.[0];
          setPreview(f ? URL.createObjectURL(f) : null);
        }}
      />
      <p className="hint">PNG, JPEG, WebP ou GIF — 10 Mo maximum. Stockée de façon privée : visible par vous et les administrateurs uniquement.{!required && " Laissez vide pour conserver la capture actuelle."}</p>
      <FieldError name="screenshot" />
      {(preview || currentSrc) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview ?? currentSrc} alt={preview ? "Aperçu de la nouvelle capture" : "Capture actuelle"} className="mt-3 max-h-64 rounded-lg border border-border object-contain" />
      )}
    </div>
  );
}

export function StatForm({
  action, values = {}, maxDate, players, screenshotRequired, currentScreenshot, submitLabel, cancelHref,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  values?: StatValues;
  maxDate: string;
  players?: { id: string; label: string }[];
  screenshotRequired: boolean;
  currentScreenshot?: string;
  submitLabel: string;
  cancelHref: string;
}) {
  return (
    <ActionForm action={action} className="space-y-6">
      {players && (
        <SelectField name="playerId" label="Joueur" required placeholder="Choisir un joueur…" options={players.map((p) => ({ value: p.id, label: p.label }))} />
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1"><WeekPicker defaultValue={values.weekStart ?? maxDate} max={maxDate} /></div>
        <SelectField name="game" label="Jeu" required defaultValue={values.game ?? STAT_GAMES[0]} options={STAT_GAMES.map((g) => ({ value: g, label: g }))} />
        <SelectField name="mode" label="Mode" required defaultValue={values.mode ?? STAT_MODES[0]} options={STAT_MODES.map((m) => ({ value: m, label: m }))} />
      </div>

      <ScreenshotInput required={screenshotRequired} currentSrc={currentScreenshot} />

      <fieldset className="rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-semibold">Statistiques relevées (facultatif)</legend>
        <p className="mb-4 text-xs text-muted">
          Recopiez uniquement les valeurs visibles sur votre capture. Laissez vide ce qui n&apos;y figure pas : rien n&apos;est estimé à votre place.
        </p>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Field name="matchesPlayed" label="Parties jouées" type="number" min={0} inputMode="numeric" defaultValue={values.matchesPlayed} />
          <Field name="wins" label="Victoires" type="number" min={0} inputMode="numeric" defaultValue={values.wins} />
          <Field name="kills" label="Éliminations" type="number" min={0} inputMode="numeric" defaultValue={values.kills} />
          <Field name="deaths" label="Morts" type="number" min={0} inputMode="numeric" defaultValue={values.deaths} />
          <Field name="kdRatio" label="Ratio K/D" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={values.kdRatio} />
        </div>
      </fieldset>

      <TextAreaField name="notes" label="Notes (facultatif)" defaultValue={values.notes} rows={3} maxLength={1000} />

      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingText="Enregistrement…">{submitLabel}</SubmitButton>
        <Link href={cancelHref} className="btn-ghost">Annuler</Link>
      </div>
    </ActionForm>
  );
}
