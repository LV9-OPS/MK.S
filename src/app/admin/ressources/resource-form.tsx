"use client";

import Link from "next/link";
import type { ActionState } from "@/lib/errors";
import { RESOURCE_ACCESS, RESOURCE_ACCESS_LABELS, RESOURCE_CATEGORIES, RESOURCE_CATEGORY_LABELS } from "@/lib/constants";
import { IMAGE_ACCEPT, RESOURCE_ACCEPT } from "@/lib/files";
import { ActionForm, CheckboxField, Field, SelectField, SubmitButton, TextAreaField } from "@/components/forms";

type Values = {
  id: string; name: string; description: string | null; category: string; version: string | null; access: string; published: boolean;
  originalName: string; hasPreview: boolean; previewIsCustom: boolean;
};

export function ResourceForm({ action, values }: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; values?: Values }) {
  return (
    <ActionForm action={action} className="space-y-5" encType="multipart/form-data">
      <Field name="name" label="Nom" required defaultValue={values?.name} maxLength={120} />
      <TextAreaField name="description" label="Description" defaultValue={values?.description} rows={3} maxLength={2000} />
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField name="category" label="Catégorie" required defaultValue={values?.category ?? "OTHER"} options={RESOURCE_CATEGORIES.map((c) => ({ value: c, label: RESOURCE_CATEGORY_LABELS[c] }))} />
        <Field name="version" label="Version" defaultValue={values?.version} maxLength={40} placeholder="ex. 2.1" />
        <SelectField name="access" label="Accès" required defaultValue={values?.access ?? "MEMBERS"} options={RESOURCE_ACCESS.map((a) => ({ value: a, label: RESOURCE_ACCESS_LABELS[a] }))} />
      </div>
      <Field
        name="file"
        label={values ? `Remplacer le fichier (actuel : ${values.originalName})` : "Fichier"}
        type="file"
        required={!values}
        accept={RESOURCE_ACCEPT}
        hint="PNG, JPEG, WebP, GIF, PDF, ZIP, PSD, MP4/MOV, WebM, OTF, TTF — 100 Mo maximum. Le type réel du fichier est contrôlé ; SVG refusé pour raisons de sécurité (à livrer dans un ZIP)."
      />
      <div>
        <Field name="preview" label="Image d'aperçu (facultatif)" type="file" accept={IMAGE_ACCEPT} hint="Recommandé pour les ZIP, PSD, vidéos et PDF. Une image envoyée comme fichier principal sert d'aperçu par défaut. 5 Mo max." />
        {values?.previewIsCustom && <div className="mt-2"><CheckboxField name="removePreview" label="Retirer l'aperçu personnalisé actuel" /></div>}
      </div>
      <CheckboxField name="published" label="Publier pour les membres" defaultChecked={values?.published ?? false} />
      <div className="flex gap-2">
        <SubmitButton pendingText="Envoi en cours…">{values ? "Enregistrer" : "Ajouter la ressource"}</SubmitButton>
        <Link href="/admin/ressources" className="btn-ghost">Annuler</Link>
      </div>
    </ActionForm>
  );
}
