import { apiSuccess } from '@/lib/api-response';
import { publicSupportContact } from '@/lib/support/tickets';

export const dynamic = 'force-dynamic';

/** Public support contact details. Only values configured in the environment are returned. */
export async function GET() {
  return apiSuccess(publicSupportContact());
}
