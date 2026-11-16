import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiSuccess, apiError } from '@/lib/api-response';

// Force Node.js runtime as required for database-dependent APIs
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbStatus: 'connected' | 'disconnected' | 'unconfigured' = 'disconnected';
  let dbLatencyMs: number | null = null;
  let dbMessage: string | null = null;

  const isConfigured =
    process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes('your-project-ref') &&
    !process.env.DATABASE_URL.includes('placeholder');

  if (!isConfigured) {
    dbStatus = 'unconfigured';
    dbMessage = 'DATABASE_URL contains placeholder values. Connect actual Supabase credentials in .env.';
  } else {
    try {
      const dbCheckStart = Date.now();
      // Execute a quick raw SQL query to verify roundtrip to Supabase PostgreSQL
      await prisma.$queryRaw`SELECT 1 as health_check`;
      dbLatencyMs = Date.now() - dbCheckStart;
      dbStatus = 'connected';
      dbMessage = 'Successfully connected to Supabase PostgreSQL database.';
    } catch (err: unknown) {
      dbStatus = 'disconnected';
      dbMessage = 'Database connectivity check failed.';
      const diagnosticErr = err instanceof Error ? err.message : 'Unknown database error';
      console.warn('[Health Check Warning]: Database connection check failed:', diagnosticErr);
    }
  }

  const payload = {
    service: 'Vyntra Marketplace API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    runtime: 'Node.js (Next.js Route Handlers)',
    responseTimeMs: Date.now() - startTime,
    database: {
      provider: 'Supabase PostgreSQL',
      status: dbStatus,
      latencyMs: dbLatencyMs,
      message: dbMessage,
    },
  };

  return apiSuccess(payload, undefined, 200);
}
