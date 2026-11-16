import { NextResponse } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/auth';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { getUserCuratedBoards, createUserCuratedBoard } from '@/lib/wishlist';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireAuth();
    const boards = await getUserCuratedBoards(auth.userId);
    return apiSuccess({ boards });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const { title, name, theme, isPublic } = body;

    const boardName = title || name;
    if (!boardName || typeof boardName !== 'string' || !boardName.trim()) {
      return apiError('Board name is required', 400);
    }

    const board = await createUserCuratedBoard(
      auth.userId,
      boardName.trim(),
      theme,
      isPublic !== false
    );

    return apiSuccess({
      message: 'Board created successfully.',
      board,
    });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiError('Missing required field "id"', 400);
    }

    const deleted = await prisma.curatedBoard.deleteMany({
      where: {
        id,
        userId: auth.userId,
      },
    });

    if (deleted.count === 0) {
      return apiError('Board not found or does not belong to user.', 404);
    }

    return apiSuccess({ message: 'Board deleted successfully.' });
  } catch (err: any) {
    if (err.name === 'AuthError') {
      return handleAuthError(err);
    }
    return handleApiError(err);
  }
}
