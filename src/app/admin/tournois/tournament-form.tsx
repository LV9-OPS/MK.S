"use client";

import Link from "next/link";
import type { ActionState } from "@/lib/errors";
import {
  CURRENCIES, PARTICIPANT_TYPES, PARTICIPANT_TYPE_LABELS, TOURNAMENT_PLATFORMS, TOURNAMENT_PLATFORM_LABELS, TOURNAMENT_STATUSES, TOURNAMENT_STATUS_LABELS,
} from "@/lib/constants";
import { ActionForm, CheckboxField, Field, SelectField, SubmitButton, TextAreaField } from "@/components/forms";

export type TournamentValues = {
  name: string; platform: string; game: string; format: string | null; participantType: string; teamSize: number | null;
  startsAt: string; registrationDeadline: string; prizeAmount: string; prizeCurrency: string | null; status: string; region: string | null;
  externalUrl: string; lastVerifiedAt: string; notes: string | null; published: boolean; dataSource: string;
};

export function TournamentForm({ action, values, nowInput, allowedHosts }: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; values?: TournamentValues; nowInput: string; allowedHosts: string[] }) {
  return (
    <ActionForm action={action} className="space-y-5">
      {values?.dataSource === "FACEIT_API" && (
        <p className="rounded-lg border border-info/40 bg-info/10 px-4 py-3 text-sm text-info">
          Importé depuis l&apos;API FACEIT : une prochaine synchronisation peut écraser le nom, les dates, le statut et le lien. Le cashprize, le format et la participation restent manuels.
        </p>
      )}
      <Field name="name" label="Nom du tournoi" required defaultValue={values?.name} maxLength={140} />
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField name="platform" label="Plateforme" required defaultValue={values?.platform ?? "FACEIT"} options={TOURNAMENT_PLATFORMS.map((p) => ({ value: p, label: TOURNAMENT_PLATFORM_LABELS[p] }))} />
        <Field name="game" label="Jeu" required defaultValue={values?.game ?? "Warzone"} maxLength={60} />
        <Field name="format" label="Format" defaultValue={values?.format} maxLength={60} placeholder="ex. Quads, Kill Race, 2v2…" />
      </div>
      <Field
        name="externalUrl"
        label="Lien officiel (page d'inscription ou de détails)"
        type="url"
        required
        defaultValue={values?.externalUrl}
        hint={`HTTPS uniquement. Hôtes autorisés : ${allowedHosts.join(", ")}. Le lien est revérifié à chaque clic sur « Participer ».`}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField name="participantType" label="Participation" required defaultValue={values?.participantType ?? "UNKNOWN"} options={PARTICIPANT_TYPES.map((p) => ({ value: p, label: PARTICIPANT_TYPE_LABELS[p] }))} />
        <Field name="teamSize" label="Taille d'équipe" type="number" min={1} max={100} defaultValue={values?.teamSize} hint="Équipe uniquement ; vide si inconnue." />
        <Field name="region" label="Région" defaultValue={values?.region} maxLength={60} placeholder="ex. EU, NA" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="startsAt" label="Début" type="datetime-local" required defaultValue={values?.startsAt} />
        <Field name="registrationDeadline" label="Clôture des inscriptions" type="datetime-local" defaultValue={values?.registrationDeadline} hint="Vide si non communiquée." />
        <SelectField name="status" label="Statut" required defaultValue={values?.status ?? "UNKNOWN"} options={TOURNAMENT_STATUSES.map((s) => ({ value: s, label: TOURNAMENT_STATUS_LABELS[s] }))} hint="Ne choisissez un statut que s'il est indiqué par la plateforme." />
      </div>
      <fieldset className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
        <legend className="px-1 text-sm font-semibold">Cashprize</legend>
        <Field name="prizeAmount" label="Montant" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={values?.prizeAmount} hint="Vide si non communiqué (affiché « Non communiqué »)." />
        <SelectField name="prizeCurrency" label="Devise" defaultValue={values?.prizeCurrency ?? ""} placeholder="—" options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="lastVerifiedAt" label="Informations vérifiées le" type="datetime-local" required defaultValue={values?.lastVerifiedAt ?? nowInput} max={nowInput} />
      </div>
      <TextAreaField name="notes" label="Notes (règlement, conditions…)" defaultValue={values?.notes} rows={3} maxLength={2000} />
      <CheckboxField name="published" label="Publier dans l'annuaire" defaultChecked={values?.published ?? false} />
      <div className="flex gap-2">
        <SubmitButton pendingText="Enregistrement…">{values ? "Enregistrer" : "Créer le tournoi"}</SubmitButton>
        <Link href="/admin/tournois" className="btn-ghost">Annuler</Link>
      </div>
    </ActionForm>
  );
}
