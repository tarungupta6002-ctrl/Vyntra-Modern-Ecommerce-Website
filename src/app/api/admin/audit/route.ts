import { NextResponse } from 'next/server';
import { requireAdmin, handleAuthError } from '@/lib/auth';
import { apiSuccess, handleApiError } from '@/lib/api-response';
import { listAuditLogs } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/audit
 * Lists administrative audit trail events. Strictly protected by requireAdmin().
 */
export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const logs = await listAuditLogs({ entity, entityId, limit });
    return apiSuccess({ logs, total: logs.length });
  } catch (err: any) {
    const authErr = handleAuthError(err);
    if (authErr) return authErr;
    return handleApiError(err);
  }
}
