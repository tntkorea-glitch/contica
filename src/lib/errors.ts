import { NextResponse } from 'next/server';

export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL',
  DELETED: 'DELETED',
} as const;

type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

const STATUS_MAP: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  CONFLICT: 409,
  INTERNAL: 500,
  DELETED: 410,
};

export function apiError(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    { error: { code, message, details } },
    { status: STATUS_MAP[code] }
  );
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiPaginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return NextResponse.json({
    data,
    meta: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    },
  });
}
