"use client";

import { reviewStatAction } from "@/app/actions/stats";
import { VERIFICATION_STATUSES, VERIFICATION_STATUS_LABELS } from "@/lib/constants";
import { ActionForm, SelectField, SubmitButton } from "./forms";

export function ReviewForm({ statId, current, note, returnTo }: { statId: string; current: string; note: string | null; returnTo: string }) {
  return (
    <ActionForm action={reviewStatAction.bind(null, statId, returnTo)} className="space-y-3 rounded-lg border border-border p-4">
      <p className="text-sm font-semibold">Vérification (administrateur)</p>
      <SelectField name="status" label="Statut" defaultValue={current} options={VERIFICATION_STATUSES.map((s) => ({ value: s, label: VERIFICATION_STATUS_LABELS[s] }))} />
      <div>
        <label htmlFor={`note-${statId}`} className="label">Note pour le joueur</label>
        <input id={`note-${statId}`} name="reviewNote" defaultValue={note ?? ""} maxLength={500} className="input" />
      </div>
      <SubmitButton className="btn-secondary btn-sm">Enregistrer la vérification</SubmitButton>
    </ActionForm>
  );
}
