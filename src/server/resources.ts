import { z } from "zod";
import type { Prisma, Resource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { AppError, notFound } from "@/lib/errors";
import { checkbox, formToObject, oneOf, optStr, parseInput, reqStr } from "@/lib/forms";
import { RESOURCE_ACCESS, RESOURCE_CATEGORIES } from "@/lib/constants";
import { isFilled, PREVIEW_RULES, RESOURCE_FILE_RULES, UploadError, validateUpload } from "@/lib/files";
import { deleteStoredFile, saveFile } from "@/lib/storage";
import { assertAdmin, assertUser, isAdmin, type Actor } from "./auth";

const RASTER = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

/** Clé et type de l'image d'aperçu : aperçu dédié, sinon le fichier lui-même s'il s'agit d'une image. */
export function previewOf(r: Pick<Resource, "previewKey" | "previewMime" | "fileKey" | "mimeType">) {
  if (r.previewKey && r.previewMime) return { key: r.previewKey, mime: r.previewMime };
  if (RASTER.has(r.mimeType)) return { key: r.fileKey, mime: r.mimeType };
  return null;
}

/** Règle de visibilité appliquée à toutes les lectures côté membre. */
function visibleWhere(actor: Actor): Prisma.ResourceWhereInput {
  if (isAdmin(actor)) return { published: true };
  return { published: true, access: "MEMBERS" };
}

const listSchema = z.object({
  q: optStr(100),
  category: z.enum(RESOURCE_CATEGORIES).optional().catch(undefined),
  sort: z.enum(["recent", "name", "size"]).catch("recent"),
});

export type ResourceListQuery = Record<string, unknown>;

export async function listResources(actor: Actor | null, query: ResourceListQuery = {}) {
  assertUser(actor);
  const q = listSchema.parse(query);
  const where: Prisma.ResourceWhereInput = { ...visibleWhere(actor) };
  if (q.category) where.category = q.category;
  if (q.q) where.OR = [{ name: { contains: q.q } }, { description: { contains: q.q } }];
  const orderBy: Prisma.ResourceOrderByWithRelationInput[] =
    q.sort === "name" ? [{ name: "asc" }] : q.sort === "size" ? [{ sizeBytes: "desc" }] : [{ publishedAt: "desc" }, { createdAt: "desc" }];
  const [items, counts] = await Promise.all([
    prisma.resource.findMany({ where, orderBy }),
    prisma.resource.groupBy({ by: ["category"], where: visibleWhere(actor), _count: { _all: true } }),
  ]);
  return { items, counts: Object.fromEntries(counts.map((c) => [c.category, c._count._all])) as Record<string, number>, query: q };
}

export async function getResource(actor: Actor | null, id: string) {
  assertUser(actor);
  const r = await prisma.resource.findFirst({ where: { id, ...visibleWhere(actor) } });
  // Même réponse pour « inexistant » et « non autorisé » : on ne révèle pas l'existence.
  if (!r) throw notFound("Ressource");
  return r;
}

/** Résout un accès fichier (téléchargement ou aperçu). Lève une erreur si l'acteur n'y a pas droit. */
export async function resolveResourceFile(actor: Actor | null, id: string, kind: "file" | "preview") {
  assertUser(actor);
  const r = isAdmin(actor)
    ? await prisma.resource.findUnique({ where: { id } }) // les admins peuvent vérifier les brouillons
    : await prisma.resource.findFirst({ where: { id, ...visibleWhere(actor) } });
  if (!r) throw notFound("Ressource");
  if (kind === "preview") {
    const p = previewOf(r);
    if (!p) throw notFound("Aperçu");
    return { key: p.key, mime: p.mime, filename: `apercu-${r.originalName}`, inline: true };
  }
  return { key: r.fileKey, mime: r.mimeType, filename: r.originalName, inline: false };
}

// ——— Administration ———

const metaSchema = z.object({
  name: reqStr(120, "Le nom"),
  description: optStr(2000, "La description"),
  category: oneOf(RESOURCE_CATEGORIES, "Catégorie"),
  version: optStr(40, "La version"),
  access: oneOf(RESOURCE_ACCESS, "Accès"),
  published: checkbox,
});

export async function adminListResources(actor: Actor | null) {
  assertAdmin(actor);
  return prisma.resource.findMany({ orderBy: { updatedAt: "desc" }, include: { uploadedBy: { select: { displayName: true } } } });
}

export async function adminGetResource(actor: Actor | null, id: string) {
  assertAdmin(actor);
  const r = await prisma.resource.findUnique({ where: { id } });
  if (!r) throw notFound("Ressource");
  return r;
}

async function recordUploadFailure(actor: Actor, err: unknown, fd: FormData, resourceId?: string) {
  const file = fd.get("file");
  await audit(actor.id, "resource.upload_failed", "Resource", resourceId ?? null, {
    reason: err instanceof Error ? err.message : "inconnue",
    filename: isFilled(file) ? file.name.slice(0, 150) : null,
    size: isFilled(file) ? file.size : null,
  });
}

function toAppError(err: unknown, field: string): never {
  if (err instanceof UploadError) throw new AppError(err.message, "VALIDATION", { [field]: err.message });
  throw err;
}

export async function createResource(actor: Actor | null, fd: FormData) {
  assertAdmin(actor);
  const meta = parseInput(metaSchema, formToObject(fd));
  let fileKey: string | null = null;
  let previewKey: string | null = null;
  try {
    const file = await validateUpload(fd.get("file"), RESOURCE_FILE_RULES).catch((e) => toAppError(e, "file"));
    const previewInput = fd.get("preview");
    const preview = isFilled(previewInput)
      ? await validateUpload(previewInput, PREVIEW_RULES).catch((e) => toAppError(e, "preview"))
      : null;
    fileKey = await saveFile("resources", file.ext, file.bytes);
    if (preview) previewKey = await saveFile("previews", preview.ext, preview.bytes);
    const r = await prisma.resource.create({
      data: {
        ...meta,
        description: meta.description ?? null,
        version: meta.version ?? null,
        fileKey,
        originalName: file.originalName,
        mimeType: file.kind.mime,
        sizeBytes: file.size,
        previewKey,
        previewMime: preview?.kind.mime ?? null,
        publishedAt: meta.published ? new Date() : null,
        uploadedById: actor.id,
      },
    });
    await audit(actor.id, "resource.create", "Resource", r.id, { name: r.name, published: r.published, size: r.sizeBytes });
    return r;
  } catch (err) {
    await deleteStoredFile(fileKey);
    await deleteStoredFile(previewKey);
    await recordUploadFailure(actor, err, fd);
    throw err;
  }
}

export async function updateResource(actor: Actor | null, id: string, fd: FormData) {
  assertAdmin(actor);
  const existing = await adminGetResource(actor, id);
  const meta = parseInput(metaSchema, formToObject(fd));
  const removePreview = fd.get("removePreview") === "on";
  const newKeys: string[] = [];
  try {
    const fileInput = fd.get("file");
    const previewInput = fd.get("preview");
    const file = isFilled(fileInput) ? await validateUpload(fileInput, RESOURCE_FILE_RULES).catch((e) => toAppError(e, "file")) : null;
    const preview = isFilled(previewInput) ? await validateUpload(previewInput, PREVIEW_RULES).catch((e) => toAppError(e, "preview")) : null;

    const data: Prisma.ResourceUpdateInput = {
      ...meta,
      description: meta.description ?? null,
      version: meta.version ?? null,
      publishedAt: meta.published ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
    };
    if (file) {
      const key = await saveFile("resources", file.ext, file.bytes);
      newKeys.push(key);
      Object.assign(data, { fileKey: key, originalName: file.originalName, mimeType: file.kind.mime, sizeBytes: file.size });
    }
    if (preview) {
      const key = await saveFile("previews", preview.ext, preview.bytes);
      newKeys.push(key);
      Object.assign(data, { previewKey: key, previewMime: preview.kind.mime });
    } else if (removePreview) {
      Object.assign(data, { previewKey: null, previewMime: null });
    }
    const r = await prisma.resource.update({ where: { id }, data });
    // Les anciens fichiers ne sont supprimés qu'après la mise à jour réussie.
    if (file) await deleteStoredFile(existing.fileKey);
    if (preview || removePreview) await deleteStoredFile(existing.previewKey);
    await audit(actor.id, "resource.update", "Resource", id, {
      replacedFile: !!file, replacedPreview: !!preview, removedPreview: removePreview && !preview, published: r.published,
    });
    return r;
  } catch (err) {
    for (const k of newKeys) await deleteStoredFile(k);
    await recordUploadFailure(actor, err, fd, id);
    throw err;
  }
}

export async function setResourcePublished(actor: Actor | null, id: string, published: boolean) {
  assertAdmin(actor);
  const existing = await adminGetResource(actor, id);
  const r = await prisma.resource.update({
    where: { id },
    data: { published, publishedAt: published ? (existing.publishedAt ?? new Date()) : existing.publishedAt },
  });
  await audit(actor.id, published ? "resource.publish" : "resource.unpublish", "Resource", id);
  return r;
}

export async function deleteResource(actor: Actor | null, id: string) {
  assertAdmin(actor);
  const existing = await adminGetResource(actor, id);
  await prisma.resource.delete({ where: { id } });
  await deleteStoredFile(existing.fileKey);
  await deleteStoredFile(existing.previewKey);
  await audit(actor.id, "resource.delete", "Resource", id, { name: existing.name, originalName: existing.originalName });
}

export async function listUploadFailures(actor: Actor | null, take = 20) {
  assertAdmin(actor);
  return prisma.auditLog.findMany({
    where: { action: "resource.upload_failed" },
    orderBy: { createdAt: "desc" },
    take,
    include: { actor: { select: { displayName: true } } },
  });
}
