import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { readStoredFile, storedFileExists } from "@/lib/storage";
import {
  createResource, deleteResource, getResource, listResources, listUploadFailures, resolveResourceFile, setResourcePublished, updateResource,
} from "@/server/resources";
import { file, form, makeUser, PDF_BYTES, PNG_BYTES } from "./helpers";

const base = { name: "Overlay Warzone", description: "Pack overlay", category: "STREAM_OVERLAYS", access: "MEMBERS", published: "on" };

describe("bibliothèque de ressources", () => {
  it("refuse toute opération aux visiteurs non connectés et aux joueurs pour l'administration", async () => {
    const player = await makeUser();
    await expect(listResources(null)).rejects.toThrow(/Connexion requise/);
    await expect(resolveResourceFile(null, "x", "file")).rejects.toThrow(/Connexion requise/);
    await expect(createResource(player, form({ ...base, file: file(PNG_BYTES, "a.png") }))).rejects.toThrow(/droits/);
  });

  it("stocke le vrai fichier, le sert aux membres et applique publication + niveau d'accès", async () => {
    const admin = await makeUser("ADMIN");
    const player = await makeUser();
    const r = await createResource(admin, form({ ...base, file: file(PNG_BYTES, "overlay.png") }));
    expect(r.mimeType).toBe("image/png");
    expect(r.sizeBytes).toBe(PNG_BYTES.length);
    expect(await storedFileExists(r.fileKey)).toBe(true);

    const f = await resolveResourceFile(player, r.id, "file");
    expect((await readStoredFile(f.key)).equals(PNG_BYTES)).toBe(true);
    expect(f.filename).toBe("overlay.png");
    // une image sert d'aperçu à elle-même
    expect((await resolveResourceFile(player, r.id, "preview")).mime).toBe("image/png");

    await setResourcePublished(admin, r.id, false);
    await expect(resolveResourceFile(player, r.id, "file")).rejects.toThrow(/introuvable/);
    await expect(getResource(player, r.id)).rejects.toThrow(/introuvable/);
    expect((await resolveResourceFile(admin, r.id, "file")).key).toBe(r.fileKey); // l'admin peut vérifier un brouillon

    const adminOnly = await createResource(admin, form({ ...base, access: "ADMINS", file: file(PDF_BYTES, "charte.pdf") }));
    await expect(resolveResourceFile(player, adminOnly.id, "file")).rejects.toThrow(/introuvable/);
    const list = await listResources(player);
    expect(list.items.find((i) => i.id === adminOnly.id)).toBeUndefined();
    // un PDF sans aperçu dédié n'a pas d'aperçu
    await expect(resolveResourceFile(admin, adminOnly.id, "preview")).rejects.toThrow(/Aperçu introuvable/);
  });

  it("recherche, filtre par catégorie et trie", async () => {
    const admin = await makeUser("ADMIN");
    await createResource(admin, form({ ...base, name: "Logo principal unique-xyz", category: "LOGOS", file: file(PNG_BYTES, "logo.png") }));
    const player = await makeUser();
    const byQ = await listResources(player, { q: "unique-xyz" });
    expect(byQ.items.map((i) => i.name)).toEqual(["Logo principal unique-xyz"]);
    const byCat = await listResources(player, { category: "LOGOS" });
    expect(byCat.items.every((i) => i.category === "LOGOS")).toBe(true);
    const bad = await listResources(player, { category: "PAS_UNE_CATEGORIE", sort: "n'importe" });
    expect(bad.query.category).toBeUndefined();
    expect(bad.query.sort).toBe("recent");
  });

  it("rejette les fichiers invalides et journalise l'échec", async () => {
    const admin = await makeUser("ADMIN");
    const svg = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>");
    await expect(createResource(admin, form({ ...base, file: file(svg, "x.svg") }))).rejects.toThrow(/non pris en charge/);
    await expect(createResource(admin, form({ ...base, file: file(PDF_BYTES, "x.png") }))).rejects.toThrow(/extension/);
    await expect(createResource(admin, form({ ...base, file: file(PNG_BYTES, "a.png"), preview: file(PDF_BYTES, "p.pdf") }))).rejects.toThrow(/aperçu doit être une image/);
    await expect(createResource(admin, form({ ...base }))).rejects.toThrow(/Aucun fichier/);
    const failures = await listUploadFailures(admin);
    expect(failures.length).toBeGreaterThanOrEqual(4);
    expect(failures.some((f) => f.details?.includes("x.svg"))).toBe(true);
  });

  it("remplace le fichier, met à jour l'aperçu et supprime proprement", async () => {
    const admin = await makeUser("ADMIN");
    const r = await createResource(admin, form({ ...base, file: file(PNG_BYTES, "v1.png") }));
    const updated = await updateResource(admin, r.id, form({ ...base, version: "2.0", file: file(PDF_BYTES, "v2.pdf"), preview: file(PNG_BYTES, "apercu.png") }));
    expect(updated.mimeType).toBe("application/pdf");
    expect(updated.version).toBe("2.0");
    expect(await storedFileExists(r.fileKey)).toBe(false); // l'ancien fichier est supprimé
    expect(updated.previewKey).not.toBeNull();
    await deleteResource(admin, r.id);
    expect(await prisma.resource.findUnique({ where: { id: r.id } })).toBeNull();
    expect(await storedFileExists(updated.fileKey)).toBe(false);
    expect(await storedFileExists(updated.previewKey!)).toBe(false);
  });
});
