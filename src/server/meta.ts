import { z } from "zod";
import type { MetaWeapon, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { AppError, notFound } from "@/lib/errors";
import { checkbox, formToObject, oneOf, optInt, optStr, parseInput, reqStr } from "@/lib/forms";
import { META_STALE_DAYS, META_TIERS, META_TRENDS, WEAPON_CATEGORIES, type MetaTrend } from "@/lib/constants";
import { isFilled, META_IMAGE_RULES, UploadError, validateUpload } from "@/lib/files";
import { deleteStoredFile, saveFile } from "@/lib/storage";
import { safeExternalUrl } from "@/lib/urls";
import { parseLocalDateTime } from "@/lib/format";
import { assertAdmin, isAdmin, type Actor } from "./auth";

export type SlotItem = { slot: string; name: string };

/** Libellé affiché : une fiche non revérifiée depuis META_STALE_DAYS jours passe « À VÉRIFIER ». */
export function displayTrend(w: Pick<MetaWeapon, "trend" | "lastVerifiedAt">, now = new Date()): { trend: MetaTrend; stale: boolean } {
  const stale = now.getTime() - w.lastVerifiedAt.getTime() > META_STALE_DAYS * 86400000;
  return { trend: stale ? "TO_VERIFY" : (w.trend as MetaTrend), stale };
}

export function parseSlots(json: string): SlotItem[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => x && typeof x.slot === "string" && typeof x.name === "string") : [];
  } catch {
    return [];
  }
}

const listSchema = z.object({
  q: optStr(80),
  category: z.enum(WEAPON_CATEGORIES).optional().catch(undefined),
  game: optStr(60),
  mode: optStr(60),
});

export async function listPublishedMeta(query: Record<string, unknown> = {}) {
  const q = listSchema.parse(query);
  const where: Prisma.MetaWeaponWhereInput = { published: true };
  if (q.category) where.category = q.category;
  if (q.game) where.game = q.game;
  if (q.mode) where.mode = q.mode;
  if (q.q) where.name = { contains: q.q };
  const [items, facets] = await Promise.all([
    prisma.metaWeapon.findMany({
      where,
      orderBy: [{ tier: "asc" }, { lastVerifiedAt: "desc" }, { name: "asc" }],
      include: { loadouts: { orderBy: { position: "asc" }, take: 1 } },
    }),
    prisma.metaWeapon.findMany({ where: { published: true }, select: { game: true, mode: true }, distinct: ["game", "mode"] }),
  ]);
  const lastUpdate = items.reduce<Date | null>((acc, w) => (!acc || w.lastVerifiedAt > acc ? w.lastVerifiedAt : acc), null);
  return {
    items,
    games: [...new Set(facets.map((f) => f.game))].sort(),
    modes: [...new Set(facets.map((f) => f.mode))].sort(),
    lastUpdate,
    query: q,
  };
}

/** Fiche publique ; un administrateur peut prévisualiser un brouillon. */
export async function getMetaWeapon(actor: Actor | null, slug: string) {
  const w = await prisma.metaWeapon.findUnique({ where: { slug }, include: { loadouts: { orderBy: { position: "asc" } } } });
  if (!w || (!w.published && !isAdmin(actor))) throw notFound("Arme");
  return w;
}

// ——— Administration ———

const weaponSchema = z.object({
  name: reqStr(80, "Le nom"),
  category: oneOf(WEAPON_CATEGORIES, "Catégorie"),
  game: reqStr(60, "Le jeu"),
  mode: reqStr(60, "Le mode"),
  tier: oneOf(META_TIERS, "Classement"),
  trend: oneOf(META_TRENDS, "Statut"),
  sourceName: reqStr(80, "Le nom de la source"),
  sourceUrl: reqStr(500, "L'URL de la source").refine((u) => safeExternalUrl(u) !== null, "L'URL de la source doit être une adresse HTTPS valide."),
  lastVerifiedAt: reqStr(16, "La date de vérification"),
  notes: optStr(3000, "Les notes"),
  published: checkbox,
});

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "arme";
}

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = base;
  for (let i = 2; ; i++) {
    const hit = await prisma.metaWeapon.findUnique({ where: { slug } });
    if (!hit || hit.id === excludeId) return slug;
    slug = `${base}-${i}`;
  }
}

function parseWeapon(fd: FormData) {
  const d = parseInput(weaponSchema, formToObject(fd));
  const verifiedAt = parseLocalDateTime(d.lastVerifiedAt);
  if (!verifiedAt) throw new AppError("Date de vérification invalide.", "VALIDATION", { lastVerifiedAt: "Date invalide." });
  if (verifiedAt.getTime() > Date.now() + 5 * 60000) {
    throw new AppError("La date de vérification ne peut pas être dans le futur.", "VALIDATION", { lastVerifiedAt: "Date future." });
  }
  return { ...d, notes: d.notes ?? null, sourceUrl: safeExternalUrl(d.sourceUrl)!.toString(), lastVerifiedAt: verifiedAt };
}

async function readImage(fd: FormData) {
  const input = fd.get("image");
  if (!isFilled(input)) return null;
  try {
    return await validateUpload(input, META_IMAGE_RULES);
  } catch (err) {
    if (err instanceof UploadError) throw new AppError(err.message, "VALIDATION", { image: err.message });
    throw err;
  }
}

export async function adminListMeta(actor: Actor | null) {
  assertAdmin(actor);
  return prisma.metaWeapon.findMany({ orderBy: { updatedAt: "desc" }, include: { _count: { select: { loadouts: true } } } });
}

export async function adminGetMeta(actor: Actor | null, id: string) {
  assertAdmin(actor);
  const w = await prisma.metaWeapon.findUnique({ where: { id }, include: { loadouts: { orderBy: { position: "asc" } } } });
  if (!w) throw notFound("Arme");
  return w;
}

export async function createMetaWeapon(actor: Actor | null, fd: FormData) {
  assertAdmin(actor);
  const data = parseWeapon(fd);
  const image = await readImage(fd);
  const imageKey = image ? await saveFile("meta-images", image.ext, image.bytes) : null;
  try {
    const w = await prisma.metaWeapon.create({
      data: {
        ...data,
        slug: await uniqueSlug(slugify(`${data.name}-${data.game}-${data.mode}`)),
        imageKey,
        imageMime: image?.kind.mime ?? null,
      },
    });
    await audit(actor.id, "meta.create", "MetaWeapon", w.id, { name: w.name, published: w.published });
    return w;
  } catch (err) {
    await deleteStoredFile(imageKey);
    throw err;
  }
}

export async function updateMetaWeapon(actor: Actor | null, id: string, fd: FormData) {
  const existing = await adminGetMeta(actor, id);
  const data = parseWeapon(fd);
  const image = await readImage(fd);
  const removeImage = fd.get("removeImage") === "on";
  const imageKey = image ? await saveFile("meta-images", image.ext, image.bytes) : null;
  try {
    const w = await prisma.metaWeapon.update({
      where: { id },
      data: {
        ...data,
        ...(imageKey ? { imageKey, imageMime: image!.kind.mime } : removeImage ? { imageKey: null, imageMime: null } : {}),
      },
    });
    if (imageKey || removeImage) await deleteStoredFile(existing.imageKey);
    await audit(actor!.id, "meta.update", "MetaWeapon", id, {
      tier: { from: existing.tier, to: w.tier }, trend: { from: existing.trend, to: w.trend }, published: w.published,
    });
    return w;
  } catch (err) {
    await deleteStoredFile(imageKey);
    throw err;
  }
}

export async function setMetaPublished(actor: Actor | null, id: string, published: boolean) {
  await adminGetMeta(actor, id);
  const w = await prisma.metaWeapon.update({ where: { id }, data: { published } });
  await audit(actor!.id, published ? "meta.publish" : "meta.unpublish", "MetaWeapon", id);
  return w;
}

/** Marque la fiche comme revérifiée maintenant (après contrôle de la source). */
export async function markMetaVerified(actor: Actor | null, id: string) {
  await adminGetMeta(actor, id);
  const w = await prisma.metaWeapon.update({ where: { id }, data: { lastVerifiedAt: new Date() } });
  await audit(actor!.id, "meta.verify", "MetaWeapon", id);
  return w;
}

export async function deleteMetaWeapon(actor: Actor | null, id: string) {
  const existing = await adminGetMeta(actor, id);
  await prisma.metaWeapon.delete({ where: { id } });
  await deleteStoredFile(existing.imageKey);
  await audit(actor!.id, "meta.delete", "MetaWeapon", id, { name: existing.name });
}

const slotsSchema = z
  .string()
  .transform((s, ctx) => {
    try {
      return JSON.parse(s);
    } catch {
      ctx.addIssue({ code: "custom", message: "Liste invalide." });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .array(z.object({ slot: z.string().trim().min(1, "Emplacement obligatoire.").max(40), name: z.string().trim().min(1, "Nom obligatoire.").max(80) }))
      .max(12, "12 éléments maximum."),
  );

const loadoutSchema = z.object({
  name: reqStr(80, "Le nom de la configuration"),
  attachments: slotsSchema.refine((a) => a.length > 0, "Ajoutez au moins un accessoire."),
  equipment: z.preprocess((v) => (v === undefined || v === "" ? "[]" : v), slotsSchema),
  notes: optStr(1000, "Les notes"),
  position: optInt(0, 99, "L'ordre"),
});

export async function saveLoadout(actor: Actor | null, weaponId: string, loadoutId: string | null, input: unknown) {
  await adminGetMeta(actor, weaponId);
  const d = parseInput(loadoutSchema, input);
  const data = {
    name: d.name,
    attachments: JSON.stringify(d.attachments),
    equipment: JSON.stringify(d.equipment),
    notes: d.notes ?? null,
    position: d.position ?? 0,
  };
  let id = loadoutId;
  if (loadoutId) {
    const existing = await prisma.metaLoadout.findFirst({ where: { id: loadoutId, weaponId } });
    if (!existing) throw notFound("Configuration");
    await prisma.metaLoadout.update({ where: { id: loadoutId }, data });
  } else {
    id = (await prisma.metaLoadout.create({ data: { ...data, weaponId } })).id;
  }
  // Modifier une configuration est une mise à jour éditoriale de la fiche.
  await prisma.metaWeapon.update({ where: { id: weaponId }, data: { updatedAt: new Date() } });
  await audit(actor!.id, loadoutId ? "meta.loadout_update" : "meta.loadout_create", "MetaLoadout", id, { weaponId });
}

export async function deleteLoadout(actor: Actor | null, weaponId: string, loadoutId: string) {
  await adminGetMeta(actor, weaponId);
  const res = await prisma.metaLoadout.deleteMany({ where: { id: loadoutId, weaponId } });
  if (res.count === 0) throw notFound("Configuration");
  await audit(actor!.id, "meta.loadout_delete", "MetaLoadout", loadoutId, { weaponId });
}

export async function resolveMetaImage(actor: Actor | null, id: string) {
  const w = await prisma.metaWeapon.findUnique({ where: { id }, select: { imageKey: true, imageMime: true, published: true } });
  if (!w || !w.imageKey || !w.imageMime || (!w.published && !isAdmin(actor))) throw notFound("Image");
  return { key: w.imageKey, mime: w.imageMime };
}
