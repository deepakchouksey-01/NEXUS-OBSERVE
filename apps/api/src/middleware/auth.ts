import type { FastifyReply, FastifyRequest } from 'fastify';
import { jwtVerify, type JWTPayload } from 'jose';

import { prisma } from '../lib/prisma.js';

type AuthPayload = JWTPayload & {
  userId: string;
  organizationId?: string;
  role?: string;
};

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ??
    'nexus-observe-local-dev-secret-2026-change-this',
);

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthPayload;
  }
}

function unauthorized(request: FastifyRequest, reply: FastifyReply) {
  return reply.status(401).send({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication is required.',
    },
    requestId: request.id,
    timestamp: new Date().toISOString(),
  });
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authorization = request.headers.authorization;
  const cookieToken = request.cookies.nexus_access_token;

  const tokenFromHeader =
    authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : undefined;

  const token = tokenFromHeader ?? cookieToken;

  if (!token) {
    return unauthorized(request, reply);
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    if (typeof payload.userId !== 'string') {
      return unauthorized(request, reply);
    }

    const organizationId =
      typeof payload.organizationId === 'string'
        ? payload.organizationId
        : undefined;

    if (!organizationId) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message:
            'The authentication token is missing organization context.',
        },
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    }

    const organizationUser = await prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: payload.userId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!organizationUser) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'ORGANIZATION_ACCESS_DENIED',
          message: 'You do not have access to this organization.',
        },
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    }

    request.auth = {
      ...payload,
      userId: payload.userId as string,
      organizationId,
      role: organizationUser.role,
    };
  } catch {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'The authentication token is invalid or expired.',
      },
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  }
}