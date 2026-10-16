import { prisma } from "./db";

export async function audit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  details?: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: { actorId, action, entityType, entityId: entityId ?? null, details: details ? JSON.stringify(details) : null },
  });
}
