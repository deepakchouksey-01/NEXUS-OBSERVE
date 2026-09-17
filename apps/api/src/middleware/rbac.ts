import type { FastifyReply, FastifyRequest } from 'fastify';

export const ROLES = [
  'OWNER',
  'ADMIN',
  'ENGINEER',
  'INCIDENT_RESPONDER',
  'VIEWER',
] as const;

export type Role = (typeof ROLES)[number];

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

function forbidden(request: FastifyRequest, reply: FastifyReply) {
  return reply.status(403).send({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'You do not have permission to perform this action.',
    },
    requestId: request.id,
    timestamp: new Date().toISOString(),
  });
}

export function requireRole(...allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.auth) {
      return unauthorized(request, reply);
    }

    const role = request.auth.role;

    if (
      typeof role !== 'string' ||
      !ROLES.includes(role as Role)
    ) {
      return forbidden(request, reply);
    }

    if (!allowedRoles.includes(role as Role)) {
      return forbidden(request, reply);
    }
  };
}