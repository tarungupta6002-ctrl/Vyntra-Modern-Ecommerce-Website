import { GET as getAuthProfile } from '@/app/api/auth/sync/route';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return await getAuthProfile(request);
}
