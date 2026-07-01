import { createServiceClient, createAnonServiceClient } from "@/lib/supabase/admin";

function getClient() {
  try {
    return createServiceClient();
  } catch {
    return createAnonServiceClient();
  }
}

export class AuditLogService {
  async log(params: {
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldData?: unknown;
    newData?: unknown;
    ipAddress?: string;
  }): Promise<void> {
    try {
      const supabase = getClient();
      await supabase.from("audit_logs").insert({
        user_id: params.userId ?? null,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId ?? null,
        old_data: params.oldData ?? null,
        new_data: params.newData ?? null,
        ip_address: params.ipAddress ?? null,
      });
    } catch {
      console.log(`[AUDIT] ${params.action} on ${params.entityType}:${params.entityId}`);
    }
  }
}

export const auditLogService = new AuditLogService();
