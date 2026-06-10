import { prisma } from "@/lib/db";

export function audit(actorId: string | null, action: string, targetType?: string, targetId?: string, metadata?: unknown) {
  return prisma.auditLog.create({
    data: {
      actorId,
      action,
      targetType,
      targetId,
      metadata: metadata === undefined ? undefined : JSON.parse(JSON.stringify(metadata)),
    },
  });
}
