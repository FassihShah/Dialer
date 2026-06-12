import { db } from './db';

export async function audit(params: {
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.auditLog.create({ data: params as any });
  } catch {
    // audit logs must never crash the main flow
  }
}
