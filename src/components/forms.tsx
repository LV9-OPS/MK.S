"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { ActionState } from "@/lib/errors";

type Action = (state: ActionState, fd: FormData) => Promise<ActionState>;

const FormStateContext = createContext<ActionState>(undefined);

const noopSubscribe = () => () => {};
/** false pendant le rendu serveur et avant l'hydratation, true ensuite. */
function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
const PendingContext = createContext(false);

type ActionFormProps = {
  action: Action;
  children: ReactNode;
  className?: string;
  encType?: "multipart/form-data";
  resetOnSuccess?: boolean;
  ariaLabel?: string;
};

/**
 * Formulaire relié à une server action.
 * - Les erreurs renvoyées par le serveur sont affichées et la saisie est conservée.
 * - Aucun message de succès n'est affiché tant que le serveur n'a pas confirmé l'opération.
 * - L'action est appelée directement (pas de useActionState, dont la file d'actions restait bloquée
 *   en « Envoi… » après une redirection serveur). En cas de succès, l'action renvoie `redirectTo`
 *   (URL interne unique, cf. lib/action-redirect.ts) et le formulaire fait une navigation complète.
 * - Le formulaire est remonté à chaque changement d'URL (sécurité supplémentaire).
 */
export function ActionForm(props: ActionFormProps) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  return <ActionFormInner key={`${pathname}?${search}`} {...props} />;
}


function ActionFormInner({ action, children, className, encType, resetOnSuccess, ariaLabel }: ActionFormProps) {
  const [state, setState] = useState<ActionState>(undefined);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <FormStateContext.Provider value={state}>
      <PendingContext.Provider value={pending}>
      <form
        ref={ref}
        // method="post" : si un envoi natif survenait malgré tout, les champs (mots de passe
        // compris) ne finiraient jamais dans l'URL.
        method="post"
        className={className}
        encType={encType}
        aria-label={ariaLabel}
        aria-busy={pending}
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy.current) return;
          busy.current = true;
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          const fd = new FormData(e.currentTarget, submitter);
          setPending(true);
          let navigating = false;
          try {
            const result = await action(state, fd);
            const to = result?.redirectTo;
            if (to && to.startsWith("/") && !to.startsWith("//")) {
              // Succès confirmé par le serveur : navigation complète vers la page de résultat.
              // (Les transitions du routeur client — redirect() serveur, router.push — ne se
              // terminaient pas toujours avec Next 15.5 : URL et données restaient inchangées.)
              navigating = true;
              window.location.assign(to);
              return;
            }
            setState(result);
          } catch (err) {
            console.error(err);
            setState({ error: "Le serveur n'a pas répondu. Vérifiez votre connexion puis réessayez." });
          } finally {
            if (!navigating) {
              busy.current = false;
              setPending(false);
            }
          }
        }}
      >
        {state?.error && (
          <div role="alert" className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {state.error}
          </div>
        )}
        {state?.ok && (
          <div role="status" className="mb-4 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
            {state.ok}
          </div>
        )}
        {children}
      </form>
      </PendingContext.Provider>
    </FormStateContext.Provider>
  );
}

export function useFieldError(name: string): string | undefined {
  return useContext(FormStateContext)?.fieldErrors?.[name];
}

export function FieldError({ name, id }: { name: string; id?: string }) {
  const err = useFieldError(name);
  if (!err || err.startsWith("existing:")) return null;
  return (
    <p id={id ?? `${name}-error`} className="mt-1 text-xs text-danger">
      {err}
    </p>
  );
}

/** Champ texte avec libellé, aide et erreur liés (accessibilité). */
export function Field({
  name, label, type = "text", defaultValue, required, hint, placeholder, autoComplete, min, max, step, maxLength, accept, inputMode,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | number | null;
  required?: boolean;
  hint?: ReactNode;
  placeholder?: string;
  autoComplete?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  maxLength?: number;
  accept?: string;
  inputMode?: "numeric" | "decimal" | "email" | "text" | "url";
}) {
  const err = useFieldError(name);
  // Identifiant unique : plusieurs formulaires d'une même page peuvent avoir un champ du même nom.
  const id = `${name}-${useId()}`;
  const describedBy = [hint ? `${id}-hint` : null, err ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-accent" aria-hidden>*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue ?? undefined}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        min={min}
        max={max}
        step={step}
        maxLength={maxLength}
        accept={accept}
        inputMode={inputMode}
        aria-invalid={err ? true : undefined}
        aria-describedby={describedBy}
        className={type === "file" ? "input file:mr-3 file:rounded file:border-0 file:bg-surface-2 file:px-3 file:py-1 file:text-text" : "input"}
      />
      {hint && <p id={`${id}-hint`} className="hint">{hint}</p>}
      <FieldError name={name} id={`${id}-error`} />
    </div>
  );
}

export function SelectField({
  name, label, options, defaultValue, required, hint, placeholder,
}: {
  name: string;
  label: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string | null;
  required?: boolean;
  hint?: ReactNode;
  placeholder?: string;
}) {
  const err = useFieldError(name);
  const id = `${name}-${useId()}`;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-accent" aria-hidden>*</span>}
      </label>
      <select id={id} name={name} defaultValue={defaultValue ?? ""} required={required} aria-invalid={err ? true : undefined} className="input">
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="hint">{hint}</p>}
      <FieldError name={name} />
    </div>
  );
}

export function TextAreaField({ name, label, defaultValue, rows = 4, hint, maxLength }: { name: string; label: string; defaultValue?: string | null; rows?: number; hint?: ReactNode; maxLength?: number }) {
  const err = useFieldError(name);
  const id = `${name}-${useId()}`;
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <textarea id={id} name={name} rows={rows} defaultValue={defaultValue ?? ""} maxLength={maxLength} aria-invalid={err ? true : undefined} className="input" />
      {hint && <p className="hint">{hint}</p>}
      <FieldError name={name} />
    </div>
  );
}

export function CheckboxField({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: ReactNode }) {
  return (
    <div>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-[var(--color-accent)]" />
        {label}
      </label>
      {hint && <p className="hint ml-6">{hint}</p>}
    </div>
  );
}

export function SubmitButton({ children, className = "btn-primary", pendingText = "Envoi…" }: { children: ReactNode; className?: string; pendingText?: string }) {
  const pending = useContext(PendingContext);
  const hydrated = useHydrated(); // pas d'envoi avant que le formulaire soit interactif
  return (
    <button type="submit" disabled={pending || !hydrated} aria-busy={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}

/** Bouton qui demande confirmation dans une boîte de dialogue avant de soumettre son formulaire. */
export function ConfirmSubmit({
  children, title, message, confirmLabel = "Confirmer", className = "btn-danger btn-sm",
}: {
  children: ReactNode;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const pending = useContext(PendingContext);
  const hydrated = useHydrated();
  return (
    <>
      <button ref={btnRef} type="button" className={className} disabled={pending || !hydrated} onClick={() => dialogRef.current?.showModal()}>
        {pending ? "Traitement…" : children}
      </button>
      <dialog ref={dialogRef} className="m-auto w-[min(92vw,28rem)] rounded-xl border border-border bg-surface p-6 text-text" aria-labelledby="confirm-title">
        <h2 id="confirm-title" className="mb-2 text-lg font-bold">{title}</h2>
        <div className="mb-6 text-sm text-muted">{message}</div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => dialogRef.current?.close()} autoFocus>
            Annuler
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              dialogRef.current?.close();
              btnRef.current?.form?.requestSubmit();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}

/** Affiche une information éphémère à partir d'un message connu (paramètre ?ok=… après redirection). */
export function DismissibleNotice({ message }: { message: string }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div role="status" className="mb-6 flex items-start justify-between gap-4 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
      <span>{message}</span>
      <button type="button" onClick={() => setOpen(false)} className="text-success/80 hover:text-success" aria-label="Fermer le message">
        ✕
      </button>
    </div>
  );
}

/** Petit formulaire à un bouton (publier, archiver, supprimer…), avec confirmation facultative. */
export function InlineAction({
  action, children, className = "btn-secondary btn-sm", confirm,
}: {
  action: (s: ActionState) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  confirm?: { title: string; message: ReactNode; confirmLabel?: string };
}) {
  return (
    <ActionForm action={action as Action} className="inline-block">
      {confirm ? (
        <ConfirmSubmit title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} className={className}>
          {children}
        </ConfirmSubmit>
      ) : (
        <SubmitButton className={className} pendingText="…">{children}</SubmitButton>
      )}
    </ActionForm>
  );
}
