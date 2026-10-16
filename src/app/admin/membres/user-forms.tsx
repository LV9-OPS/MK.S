"use client";

import Link from "next/link";
import { createUserAction, resetPasswordAction, updateUserAction } from "@/app/actions/admin";
import { ROLES, ROLE_LABELS } from "@/lib/constants";
import { ActionForm, CheckboxField, Field, SelectField, SubmitButton } from "@/components/forms";

const roleOptions = ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

export function CreateUserForm() {
  return (
    <ActionForm action={createUserAction} className="space-y-4" key="create-user">
      <Field name="displayName" label="Nom affiché" required maxLength={60} />
      <Field name="email" label="E-mail" type="email" required autoComplete="off" />
      <Field name="gamertag" label="Gamertag / Activision ID" maxLength={60} />
      <Field name="password" label="Mot de passe initial" type="password" required autoComplete="new-password" hint="10 caractères minimum. Transmettez-le au membre par un canal sûr." />
      <SelectField name="role" label="Rôle" defaultValue="PLAYER" options={roleOptions} hint="N'accordez le rôle administrateur qu'aux responsables de l'équipe." />
      <SubmitButton>Créer le compte</SubmitButton>
    </ActionForm>
  );
}

export function EditUserForm({ user }: { user: { id: string; displayName: string; gamertag: string | null; role: string; active: boolean } }) {
  return (
    <ActionForm action={updateUserAction.bind(null, user.id)} className="space-y-4">
      <Field name="displayName" label="Nom affiché" required defaultValue={user.displayName} maxLength={60} />
      <Field name="gamertag" label="Gamertag / Activision ID" defaultValue={user.gamertag} maxLength={60} />
      <SelectField name="role" label="Rôle" defaultValue={user.role} options={roleOptions} />
      <CheckboxField name="active" label="Compte actif" defaultChecked={user.active} hint="Un compte désactivé ne peut plus se connecter ; ses sessions sont fermées." />
      <div className="flex gap-2">
        <SubmitButton>Enregistrer</SubmitButton>
        <Link href="/admin/membres" className="btn-ghost">Annuler</Link>
      </div>
    </ActionForm>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  return (
    <ActionForm action={resetPasswordAction.bind(null, userId)} className="space-y-4">
      <Field name="password" label="Nouveau mot de passe" type="password" required autoComplete="new-password" hint="10 caractères minimum." />
      <SubmitButton className="btn-secondary">Réinitialiser le mot de passe</SubmitButton>
    </ActionForm>
  );
}
