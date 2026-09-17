import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

export async function organizationRoutes(app: FastifyInstance) {
  app.get(
    '/organizations',
    {
      preHandler: [
        authenticate,
        requireRole(
          'OWNER',
          'ADMIN',
          'ENGINEER',
          'INCIDENT_RESPONDER',
          'VIEWER',
        ),
      ],
    },
    async (request, reply) => {
      const organizationId = request.auth!.organizationId;

      const organization = await prisma.organization.findUnique({
        where: {
          id: organizationId,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!organization) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'ORGANIZATION_NOT_FOUND',
            message: 'The requested organization was not found.',
          },
          requestId: request.id,
          timestamp: new Date().toISOString(),
        });
      }

      return reply.send({
        success: true,
        data: organization,
        requestId: request.id,
      });
    },
  );
}