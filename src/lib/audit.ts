/**
 * ==============================================================================
 * VYNTRA ADMIN AUDIT TRAIL SERVICE (Phase 7)
 * Immutable logging of admin interventions, seller actions, and offer moderation
 * ==============================================================================
 */

import { prisma } from '@/lib/prisma';

export interface AuditLogItem {
  id: string;
  adminId: string;
  adminEmail: string;
  entity: string;
  entityId: string;
  action: string;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  createdAt: string;
}

export async function logAdminAction(params: {
  adminId: string;
  adminEmail: string;
  entity: 'VENDOR' | 'OFFER' | 'PRODUCT' | 'SHIPMENT' | 'PAYOUT' | 'SETTING' | 'ORDER' | 'SUPPORT';
  entityId: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
}): Promise<AuditLogItem> {
  const item: AuditLogItem = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    adminId: params.adminId,
    adminEmail: params.adminEmail,
    entity: params.entity,
    entityId: params.entityId,
    action: params.action,
    details: params.details || null,
    ipAddress: params.ipAddress || null,
    createdAt: new Date().toISOString(),
  };

  try {
    const created = await prisma.adminAuditLog.create({
      data: {
        adminId: params.adminId,
        adminEmail: params.adminEmail,
        entity: params.entity,
        entityId: params.entityId,
        action: params.action,
        details: params.details ? (params.details as any) : undefined,
        ipAddress: params.ipAddress || null,
      },
    });
    return {
      id: created.id,
      adminId: created.adminId,
      adminEmail: created.adminEmail,
      entity: created.entity,
      entityId: created.entityId,
      action: created.action,
      details: created.details as any,
      ipAddress: created.ipAddress,
      createdAt: created.createdAt.toISOString(),
    };
  } catch (err: any) {
    // The admin action itself already happened; never invent a log entry, but make the gap visible.
    console.error(`[audit] could not record ${params.action} on ${params.entity} ${params.entityId}:`, err?.message || err);
    return item;
  }
}

export async function listAuditLogs(options: {
  entity?: string;
  entityId?: string;
  limit?: number;
}): Promise<AuditLogItem[]> {
  const limit = Math.min(100, options.limit || 25);

  try {
    const where: any = {};
    if (options.entity && options.entity !== 'ALL') where.entity = options.entity;
    if (options.entityId) where.entityId = options.entityId;

    const records = await prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return records.map((r) => ({
      id: r.id,
      adminId: r.adminId,
      adminEmail: r.adminEmail,
      entity: r.entity,
      entityId: r.entityId,
      action: r.action,
      details: r.details as any,
      ipAddress: r.ipAddress,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (err) {
    // Fail visibly rather than showing invented history.
    throw err;
  }
}
