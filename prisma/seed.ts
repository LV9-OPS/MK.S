// Crée le premier compte administrateur à partir des variables d'environnement.
// Aucune donnée de démonstration (méta, tournois, statistiques) n'est générée :
// tout le contenu doit provenir de sources réelles saisies par les administrateurs.
import { PrismaClient } from "@prisma/client";
import { hashPassword, PASSWORD_MIN_LENGTH } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const displayName = process.env.ADMIN_NAME?.trim() || "Admin MK.S";
  if (!email || password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`ADMIN_EMAIL et ADMIN_PASSWORD (${PASSWORD_MIN_LENGTH} caractères min.) doivent être définis.`);
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Compte ${email} déjà présent — aucune modification.`);
    return;
  }
  await prisma.user.create({ data: { email, displayName, role: "ADMIN", passwordHash: await hashPassword(password) } });
  console.log(`Administrateur ${email} créé.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
