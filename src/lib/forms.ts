import { z } from "zod";
import { AppError } from "./errors";

const emptyToUndefined = (v: unknown) => {
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? undefined : t;
  }
  return v ?? undefined;
};

export const reqStr = (max: number, label: string) =>
  z.preprocess(emptyToUndefined, z.string({ error: `${label} est obligatoire.` }).max(max, `${label} : ${max} caractères maximum.`));

export const optStr = (max: number, label = "Ce champ") =>
  z.preprocess(emptyToUndefined, z.string().max(max, `${label} : ${max} caractères maximum.`).optional());

export const optInt = (min: number, max: number, label: string) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: `${label} doit être un nombre.` })
      .int(`${label} doit être un nombre entier.`)
      .min(min, `${label} doit être ≥ ${min}.`)
      .max(max, `${label} doit être ≤ ${max}.`)
      .optional(),
  );

export const optNum = (min: number, max: number, label: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? emptyToUndefined(v.replace(",", ".")) : v),
    z.coerce
      .number({ error: `${label} doit être un nombre.` })
      .min(min, `${label} doit être ≥ ${min}.`)
      .max(max, `${label} doit être ≤ ${max}.`)
      .optional(),
  );

export const oneOf = <T extends readonly [string, ...string[]]>(values: T, label: string) =>
  z.enum(values, { error: `${label} : valeur invalide.` });

export const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

/** Convertit un FormData en objet simple (les fichiers sont ignorés). */
export function formToObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

/** Valide des données ; lève une AppError VALIDATION avec erreurs par champ. */
export function parseInput<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    fieldErrors[key] ??= issue.message;
  }
  throw new AppError("Certains champs sont invalides.", "VALIDATION", fieldErrors);
}
