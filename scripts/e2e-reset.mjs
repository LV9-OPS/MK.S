// Supprime la base et le stockage jetables des tests e2e avant le démarrage du serveur de test.
import { rmSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
for (const p of ["prisma/e2e.db", "prisma/e2e.db-journal", "storage-e2e"]) {
  rmSync(path.join(root, p), { recursive: true, force: true });
}
console.log("Base et stockage e2e réinitialisés.");
