"use client";

import { changePasswordAction } from "@/app/actions/auth";
import { ActionForm, Field, SubmitButton } from "@/components/forms";

export function PasswordForm() {
  return (
    <ActionForm action={changePasswordAction} className="space-y-4">
      <Field name="current" label="Mot de passe actuel" type="password" autoComplete="current-password" required />
      <Field name="next" label="Nouveau mot de passe" type="password" autoComplete="new-password" required hint="10 caractères minimum." />
      <Field name="confirm" label="Confirmer le nouveau mot de passe" type="password" autoComplete="new-password" required />
      <p className="text-xs text-muted">Toutes vos sessions seront fermées ; vous devrez vous reconnecter.</p>
      <SubmitButton>Modifier le mot de passe</SubmitButton>
    </ActionForm>
  );
}
