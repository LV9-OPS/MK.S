"use client";

import Link from "next/link";
import { useState } from "react";
import type { ActionState } from "@/lib/errors";
import { META_TIERS, META_TREND_LABELS, META_TRENDS, WEAPON_CATEGORIES, WEAPON_CATEGORY_LABELS } from "@/lib/constants";
import { IMAGE_ACCEPT } from "@/lib/files";
import { saveLoadoutAction, deleteLoadoutAction } from "@/app/actions/admin";
import { ActionForm, CheckboxField, ConfirmSubmit, Field, FieldError, SelectField, SubmitButton, TextAreaField } from "@/components/forms";

type Weapon = {
  id: string; name: string; category: string; game: string; mode: string; tier: string; trend: string;
  sourceName: string; sourceUrl: string; lastVerifiedAtInput: string; notes: string | null; published: boolean; imageKey: string | null;
};

const SUGGESTED_GAMES = ["Warzone", "Black Ops 7", "Black Ops 6"];
const SUGGESTED_MODES = ["Battle Royale", "Résurgence", "Classé", "Multijoueur"];

export function WeaponForm({ action, weapon, nowInput }: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; weapon?: Weapon; nowInput: string }) {
  return (
    <ActionForm action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Nom de l'arme" required defaultValue={weapon?.name} maxLength={80} />
        <SelectField name="category" label="Catégorie" required defaultValue={weapon?.category ?? "ASSAULT_RIFLE"} options={WEAPON_CATEGORIES.map((c) => ({ value: c, label: WEAPON_CATEGORY_LABELS[c] }))} />
        <Field name="game" label="Jeu" required defaultValue={weapon?.game ?? "Warzone"} maxLength={60} hint={`Ex. : ${SUGGESTED_GAMES.join(", ")}`} />
        <Field name="mode" label="Mode" required defaultValue={weapon?.mode ?? "Battle Royale"} maxLength={60} hint={`Ex. : ${SUGGESTED_MODES.join(", ")}`} />
        <SelectField name="tier" label="Classement" required defaultValue={weapon?.tier ?? "A"} options={META_TIERS.map((t) => ({ value: t, label: `Tier ${t}` }))} />
        <SelectField
          name="trend"
          label="Statut méta"
          required
          defaultValue={weapon?.trend ?? "CURRENT_META"}
          options={META_TRENDS.map((t) => ({ value: t, label: META_TREND_LABELS[t] }))}
          hint="« En hausse / En baisse » = évolution de la place dans la méta, pas un buff/nerf. Mentionnez tout patch officiel dans les notes avec sa source."
        />
      </div>
      <fieldset className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
        <legend className="px-1 text-sm font-semibold">Source et vérification</legend>
        <Field name="sourceName" label="Nom de la source" required defaultValue={weapon?.sourceName ?? "WZStats"} maxLength={80} />
        <Field name="sourceUrl" label="URL de la source" type="url" required defaultValue={weapon?.sourceUrl ?? "https://wzstats.gg/"} hint="Lien HTTPS vers la page consultée (ex. la fiche de l'arme sur WZStats)." />
        <Field name="lastVerifiedAt" label="Vérifiée le" type="datetime-local" required defaultValue={weapon?.lastVerifiedAtInput ?? nowInput} max={nowInput} hint="Date à laquelle vous avez contrôlé la source." />
      </fieldset>
      <TextAreaField name="notes" label="Notes éditoriales" defaultValue={weapon?.notes} rows={4} maxLength={3000} />
      <div>
        <Field name="image" label="Visuel (facultatif)" type="file" accept={IMAGE_ACCEPT} hint="PNG, JPEG, WebP ou GIF, 3 Mo max. N'utilisez que des visuels dont l'équipe a les droits." />
        {weapon?.imageKey && (
          <div className="mt-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/meta/${weapon.id}/image`} alt="Visuel actuel" className="h-16 rounded border border-border bg-surface-2 object-contain p-1" />
            <CheckboxField name="removeImage" label="Retirer le visuel actuel" />
          </div>
        )}
      </div>
      <CheckboxField name="published" label="Publier la fiche" defaultChecked={weapon?.published ?? false} hint="Une fiche non publiée n'est visible que des administrateurs." />
      <div className="flex gap-2">
        <SubmitButton pendingText="Enregistrement…">{weapon ? "Enregistrer la fiche" : "Créer la fiche"}</SubmitButton>
        <Link href="/admin/meta" className="btn-ghost">Annuler</Link>
      </div>
    </ActionForm>
  );
}

type Slot = { slot: string; name: string };
const ATTACHMENT_SLOTS = ["Bouche", "Canon", "Optique", "Laser", "Crosse", "Poignée arrière", "Sous-canon", "Chargeur", "Munitions", "Kit de conversion"];
const EQUIPMENT_SLOTS = ["Létal", "Tactique", "Atout 1", "Atout 2", "Atout 3", "Atout 4", "Arme secondaire"];

function SlotsEditor({ name, label, initial, suggestions, min }: { name: string; label: string; initial: Slot[]; suggestions: string[]; min: number }) {
  const [rows, setRows] = useState<Slot[]>(initial.length ? initial : Array.from({ length: min }, () => ({ slot: "", name: "" })));
  const listId = `${name}-slots-${suggestions.length}`;
  const update = (i: number, patch: Partial<Slot>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <datalist id={listId}>{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
      <input type="hidden" name={name} value={JSON.stringify(rows.filter((r) => r.slot.trim() || r.name.trim()))} />
      <ul className="space-y-2">
        {rows.map((row, i) => (
          <li key={i} className="flex gap-2">
            <input aria-label={`${label} ${i + 1} — emplacement`} list={listId} value={row.slot} onChange={(e) => update(i, { slot: e.target.value })} placeholder="Emplacement" className="input w-2/5" maxLength={40} />
            <input aria-label={`${label} ${i + 1} — nom`} value={row.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Nom" className="input flex-1" maxLength={80} />
            <button type="button" className="btn-ghost btn-sm" aria-label={`Retirer la ligne ${i + 1}`} onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>✕</button>
          </li>
        ))}
      </ul>
      {rows.length < 12 && (
        <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => setRows((r) => [...r, { slot: "", name: "" }])}>+ Ajouter une ligne</button>
      )}
      <FieldError name={name} />
    </fieldset>
  );
}

export function LoadoutForm({ weaponId, loadout }: { weaponId: string; loadout?: { id: string; name: string; attachments: Slot[]; equipment: Slot[]; notes: string | null; position: number } }) {
  return (
    <div className="card p-5">
      <ActionForm action={saveLoadoutAction.bind(null, weaponId, loadout?.id ?? null)} className="space-y-4" resetOnSuccess={!loadout}>
        <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
          <Field name="name" label="Nom de la configuration" required defaultValue={loadout?.name} maxLength={80} placeholder="ex. Longue portée" />
          <Field name="position" label="Ordre" type="number" min={0} max={99} defaultValue={loadout?.position ?? 0} />
        </div>
        <SlotsEditor key={`a-${loadout?.id ?? "new"}`} name="attachments" label="Accessoires" initial={loadout?.attachments ?? []} suggestions={ATTACHMENT_SLOTS} min={5} />
        <SlotsEditor key={`e-${loadout?.id ?? "new"}`} name="equipment" label="Équipement & atouts (facultatif)" initial={loadout?.equipment ?? []} suggestions={EQUIPMENT_SLOTS} min={0} />
        <TextAreaField name="notes" label="Notes" defaultValue={loadout?.notes} rows={2} maxLength={1000} />
        <SubmitButton className="btn-secondary">{loadout ? "Enregistrer la configuration" : "Ajouter la configuration"}</SubmitButton>
      </ActionForm>
      {loadout && (
        <div className="mt-3 border-t border-border pt-3">
          <ActionForm action={deleteLoadoutAction.bind(null, weaponId, loadout.id)}>
            <ConfirmSubmit title="Supprimer cette configuration ?" message={`« ${loadout.name} » sera supprimée de la fiche.`} confirmLabel="Supprimer">
              Supprimer la configuration
            </ConfirmSubmit>
          </ActionForm>
        </div>
      )}
    </div>
  );
}
