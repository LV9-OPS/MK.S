"use client";

import { loginAction } from "@/app/actions/auth";
import { ActionForm, Field, SubmitButton } from "@/components/forms";

export function LoginForm({ next }: { next: string }) {
  return (
    <ActionForm action={loginAction} className="space-y-4" ariaLabel="Formulaire de connexion">
      <input type="hidden" name="suite" value={next} />
      <Field name="email" label="E-mail" type="email" autoComplete="email" required />
      <Field name="password" label="Mot de passe" type="password" autoComplete="current-password" required />
      <SubmitButton className="btn-primary w-full" pendingText="Connexion…">Se connecter</SubmitButton>
    </ActionForm>
  );
}
