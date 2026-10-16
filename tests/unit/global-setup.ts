import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

// Base SQLite jetable dédiée aux tests (prisma/test.db) : le fichier est supprimé puis
// recréé en appliquant les migrations, ce qui valide aussi les migrations elles-mêmes.
export default function setup() {
  const root = path.resolve(__dirname, "../..");
  rmSync(path.join(root, "prisma", "test.db"), { force: true });
  rmSync(path.join(root, "prisma", "test.db-journal"), { force: true });
  execSync("npx prisma migrate deploy", {
    cwd: root,
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  });
  rmSync(path.join(root, "storage-test"), { recursive: true, force: true });
}
