import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * Journalisation des actions super_admin (table `admin_audit_log`, RLS verrouillée,
 * écriture via le rôle service). Fail-open : une erreur d'audit ne doit jamais
 * faire échouer l'action métier — elle est seulement loguée/Sentry.
 */
export interface AuditEntry {
  actorId: string | null;
  actorEmail?: string | null;
  action: string; // ex. 'sdis.onboard', 'sdis.suspend', 'sdis.plan_change', 'sdis.reset_admin_password'
  targetType?: string | null; // ex. 'sdis', 'subscription', 'profile'
  targetId?: string | null;
  targetLabel?: string | null; // libellé lisible (ex. « 06 — SDIS des Alpes-Maritimes »)
  details?: Record<string, unknown> | null;
}

export async function logAdminAction(entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('admin_audit_log').insert({
      actor_id: entry.actorId,
      actor_email: entry.actorEmail ?? null,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      target_label: entry.targetLabel ?? null,
      details: entry.details ?? null,
    });
    if (error) logger.error('Audit log insert error:', error);
  } catch (error) {
    logger.error('Audit log error:', error);
  }
}
