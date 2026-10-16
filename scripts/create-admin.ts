// Usage : npm run create-admin -- <email> <nom affiché> <mot de passe>
// Crée un administrateur, ou promeut/réactive un compte existant et remplace son mot de passe.
import { PrismaClient } from "@prisma/client";
import { hashPassword, PASSWORD_MIN_LENGTH } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const [emailArg, name, password] = process.argv.slice(2);
  if (!emailArg || !name || !password) throw new Error("Usage : npm run create-admin -- <email> <nom affiché> <mot de passe>");
  if (password.length < PASSWORD_MIN_LENGTH) throw new Error(`Mot de passe : ${PASSWORD_MIN_LENGTH} caractères minimum.`);
  const email = emailArg.trim().toLowerCase();
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, displayName: name, role: "ADMIN", passwordHash },
    update: { role: "ADMIN", active: true, passwordHash },
  });
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await prisma.auditLog.create({ data: { action: "user.cli_admin", entityType: "User", entityId: user.id, details: JSON.stringify({ email }) } });
  console.log(`Administrateur prêt : ${email}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
