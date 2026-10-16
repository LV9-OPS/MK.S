import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import type { Actor } from "@/server/auth";

let n = 0;

export async function makeUser(role: "PLAYER" | "ADMIN" = "PLAYER", password = "motdepasse-test-123"): Promise<Actor & { password: string }> {
  n++;
  const u = await prisma.user.create({
    data: {
      email: `user${n}-${Date.now()}@test.local`,
      displayName: `${role === "ADMIN" ? "Admin" : "Joueur"} ${n}`,
      role,
      passwordHash: await hashPassword(password),
    },
  });
  return { id: u.id, role: u.role, email: u.email, displayName: u.displayName, gamertag: u.gamertag, password };
}

// Images minimales valides (signatures réelles).
export const PNG_BYTES = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f8cf00000301010018dd8db40000000049454e44ae426082",
  "hex",
);
export const PDF_BYTES = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

export function file(bytes: Buffer, name: string, type = "application/octet-stream") {
  return new File([new Uint8Array(bytes)], name, { type });
}

export function form(fields: Record<string, string | File | undefined>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) fd.append(k, v);
  return fd;
}
