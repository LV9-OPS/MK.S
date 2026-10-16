// Stockage privé sur disque. Les fichiers vivent hors de /public et ne sont servis
// que par des routes qui vérifient la session et les droits à chaque requête.
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export type StorageBucket = "resources" | "previews" | "screenshots" | "meta-images";
const KEY_RE = /^(resources|previews|screenshots|meta-images)\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/;

function root(): string {
  return path.resolve(process.env.STORAGE_DIR || "./storage");
}

function resolveKey(key: string): string {
  if (!KEY_RE.test(key)) throw new Error("Clé de stockage invalide");
  const full = path.resolve(root(), key);
  if (!full.startsWith(root() + path.sep)) throw new Error("Chemin hors du stockage");
  return full;
}

export async function saveFile(bucket: StorageBucket, ext: string, data: Buffer): Promise<string> {
  const key = `${bucket}/${randomUUID()}.${ext.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data, { flag: "wx" });
  return key;
}

export async function readStoredFile(key: string): Promise<Buffer> {
  return readFile(resolveKey(key));
}

export async function storedFileExists(key: string): Promise<boolean> {
  try {
    await stat(resolveKey(key));
    return true;
  } catch {
    return false;
  }
}

export async function deleteStoredFile(key: string | null | undefined): Promise<void> {
  if (!key) return;
  try {
    await rm(resolveKey(key), { force: true });
  } catch (err) {
    console.error("Suppression de fichier impossible", key, err);
  }
}
