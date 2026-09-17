import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';

export async function overviewRoutes(app: FastifyInstance) {
  app.get(
    '/overview',
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

      const [
        services,
        hosts,
        containers,
        activeIncidents,
        firingAlerts,
        recentDeployments,
        recentIncidents,
      ] = await Promise.all([
        prisma.service.findMany({
          where: {
            project: {
              organizationId,
            },
          },
          select: {
            id: true,
            name: true,
            status: true,
          },
        }),

        prisma.host.findMany({
          where: {
            organizationId,
          },
          select: {
            id: true,
            status: true,
            cpuUsage: true,
            memoryUsage: true,
            diskUsage: true,
          },
        }),

        prisma.container.findMany({
          where: {
            organizationId,
          },
          select: {
            id: true,
            status: true,
            cpuUsage: true,
            memoryUsage: true,
          },
        }),

        prisma.incident.findMany({
          where: {
            service: {
              project: {
                organizationId,
              },
            },
            status: {
              in: ['OPEN', 'INVESTIGATING', 'MITIGATING'],
            },
          },
          orderBy: {
            startedAt: 'desc',
          },
          take: 10,
          select: {
            id: true,
            number: true,
            title: true,
            severity: true,
            status: true,
            startedAt: true,
            service: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        }),

        prisma.alert.findMany({
          where: {
            organizationId,
            status: 'FIRING',
            enabled: true,
          },
          orderBy: {
            triggeredAt: 'desc',
          },
          take: 10,
          select: {
            id: true,
            name: true,
            condition: true,
            status: true,
            triggeredAt: true,
            service: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        }),

        prisma.deployment.findMany({
          where: {
            service: {
              project: {
                organizationId,
              },
            },
          },
          orderBy: {
            deployedAt: 'desc',
          },
          take: 10,
          select: {
            id: true,
            version: true,
            deployedAt: true,
            status: true,
            commitSha: true,
            deployedBy: true,
            service: {
              select: {
                id: true,
                name: true,
                version: true,
                status: true,
              },
            },
          },
        }),

        prisma.incident.findMany({
          where: {
            service: {
              project: {
                organizationId,
              },
            },
          },
          orderBy: {
            startedAt: 'desc',
          },
          take: 10,
          select: {
            id: true,
            number: true,
            title: true,
            severity: true,
            status: true,
            startedAt: true,
            resolvedAt: true,
            service: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
      ]);

      const healthyServices = services.filter(
        (service) => service.status === 'HEALTHY',
      ).length;

      const healthyHosts = hosts.filter(
        (host) => host.status === 'HEALTHY',
      ).length;

      const runningContainers = containers.filter(
        (container) => container.status === 'RUNNING',
      ).length;

      const systemHealth =
        services.length > 0
          ? Number(((healthyServices / services.length) * 100).toFixed(1))
          : 100;

      const averageCpu =
        hosts.length > 0
          ? Number(
              (
                hosts.reduce(
                  (sum, host) => sum + (host.cpuUsage ?? 0),
                  0,
                ) / hosts.length
              ).toFixed(1),
            )
          : 0;

      const averageMemory =
        hosts.length > 0
          ? Number(
              (
                hosts.reduce(
                  (sum, host) => sum + (host.memoryUsage ?? 0),
                  0,
                ) / hosts.length
              ).toFixed(1),
            )
          : 0;

      return reply.send({
        success: true,
        data: {
          summary: {
            systemHealth,
            services: {
              total: services.length,
              healthy: healthyServices,
            },
            hosts: {
              total: hosts.length,
              healthy: healthyHosts,
            },
            containers: {
              total: containers.length,
              running: runningContainers,
            },
            activeIncidents: activeIncidents.length,
            firingAlerts: firingAlerts.length,
            averageCpu,
            averageMemory,
          },

          services,
          hosts,
          containers,
          activeIncidents,
          firingAlerts,
          recentDeployments,
          recentIncidents,
        },
        requestId: request.id,
      });
    },
  );
}