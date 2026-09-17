import type { FastifyInstance } from 'fastify';
import { SignJWT } from 'jose';
import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import {
  hashPassword,
  verifyPassword,
} from '../../lib/password.js';

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  organizationId: z.string().min(1),
});

const signupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  organizationName: z.string().trim().min(2).max(100),
});

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ??
    'nexus-observe-local-dev-secret-2026-change-this',
);

const ACCESS_TOKEN_TTL = '1h';

export async function authRoutes(app: FastifyInstance) {
  /**
   * SIGNUP
   *
   * Creates:
   * - Organization
   * - User
   * - Organization membership
   *
   * In development:
   * - Project
   * - Environment
   * - Services
   * - Hosts
   * - Containers
   *
   * The new user becomes the OWNER of the organization.
   */
  app.post('/auth/signup', async (request, reply) => {
    const parsed = signupSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message:
            'Name, email, organization name and a valid password are required.',
        },
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    }

    const {
      name,
      email,
      password,
      organizationName,
    } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email already exists.',
        },
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    }

    const slugBase = organizationName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const organizationSlug =
      slugBase || `org-${crypto.randomUUID().slice(0, 8)}`;

    const existingOrganization =
      await prisma.organization.findUnique({
        where: {
          slug: organizationSlug,
        },
        select: {
          id: true,
        },
      });

    if (existingOrganization) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'ORGANIZATION_ALREADY_EXISTS',
          message:
            'An organization with this name already exists. Please choose another name.',
        },
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    }

    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      /*
       * 1. Organization
       */
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug: organizationSlug,
        },
      });

      /*
       * 2. User
       */
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
        },
      });

      /*
       * 3. Organization membership
       */
      await tx.organizationUser.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: 'OWNER',
        },
      });

      /*
       * 4. Development starter topology
       *
       * We only create starter observability data
       * for local development.
       *
       * Production organizations start clean.
       */
      if (process.env.NODE_ENV !== 'production') {
        /*
         * Project
         */
        const project = await tx.project.create({
          data: {
            organizationId: organization.id,
            name: 'NEXUS Platform',
            slug: 'nexus-platform',
          },
        });

        /*
         * Environment
         */
        const environment = await tx.environment.create({
          data: {
            projectId: project.id,
            name: 'Development',
            kind: 'DEVELOPMENT',
          },
        });

        /*
         * Services
         */
        const apiService = await tx.service.create({
          data: {
            projectId: project.id,
            environmentId: environment.id,
            name: 'API Gateway',
            slug: 'api-gateway',
            status: 'HEALTHY',
            version: '1.0.0',
            description:
              'Primary API gateway and request entry point.',
          },
        });

        const webService = await tx.service.create({
          data: {
            projectId: project.id,
            environmentId: environment.id,
            name: 'Web Console',
            slug: 'web-console',
            status: 'HEALTHY',
            version: '1.0.0',
            description:
              'NEXUS Observe web console.',
          },
        });

        const workerService = await tx.service.create({
          data: {
            projectId: project.id,
            environmentId: environment.id,
            name: 'Telemetry Worker',
            slug: 'telemetry-worker',
            status: 'HEALTHY',
            version: '1.0.0',
            description:
              'Background telemetry processing worker.',
          },
        });

        /*
         * Hosts
         */
        const apiHost = await tx.host.create({
          data: {
            organizationId: organization.id,
            environmentId: environment.id,
            name: 'nexus-dev-01',
            hostname: 'nexus-dev-01',
            ipAddress: '10.10.0.11',
            region: 'local',
            status: 'HEALTHY',
            cpuUsage: 34.2,
            memoryUsage: 48.6,
            diskUsage: 41.3,
            networkMbps: 22.8,
            lastSeenAt: new Date(),
          },
        });

        const webHost = await tx.host.create({
          data: {
            organizationId: organization.id,
            environmentId: environment.id,
            name: 'nexus-dev-02',
            hostname: 'nexus-dev-02',
            ipAddress: '10.10.0.12',
            region: 'local',
            status: 'HEALTHY',
            cpuUsage: 27.8,
            memoryUsage: 42.1,
            diskUsage: 38.7,
            networkMbps: 18.4,
            lastSeenAt: new Date(),
          },
        });

        const workerHost = await tx.host.create({
          data: {
            organizationId: organization.id,
            environmentId: environment.id,
            name: 'nexus-dev-03',
            hostname: 'nexus-dev-03',
            ipAddress: '10.10.0.13',
            region: 'local',
            status: 'HEALTHY',
            cpuUsage: 19.5,
            memoryUsage: 36.4,
            diskUsage: 29.8,
            networkMbps: 14.7,
            lastSeenAt: new Date(),
          },
        });

        /*
         * Service → Host relationships
         */
        await tx.serviceHost.createMany({
          data: [
            {
              serviceId: apiService.id,
              hostId: apiHost.id,
            },
            {
              serviceId: webService.id,
              hostId: webHost.id,
            },
            {
              serviceId: workerService.id,
              hostId: workerHost.id,
            },
          ],
        });

        /*
         * Containers
         */
        await tx.container.create({
          data: {
            organizationId: organization.id,
            environmentId: environment.id,
            serviceId: apiService.id,
            hostId: apiHost.id,
            name: 'api-gateway',
            image: 'nexus/api-gateway',
            imageTag: '1.0.0',
            containerId: `dev-api-${crypto.randomUUID().slice(0, 12)}`,
            status: 'RUNNING',
            cpuUsage: 18.4,
            memoryUsage: 31.2,
            restartCount: 0,
            startedAt: new Date(),
            lastSeenAt: new Date(),
          },
        });

        await tx.container.create({
          data: {
            organizationId: organization.id,
            environmentId: environment.id,
            serviceId: webService.id,
            hostId: webHost.id,
            name: 'web-console',
            image: 'nexus/web-console',
            imageTag: '1.0.0',
            containerId: `dev-web-${crypto.randomUUID().slice(0, 12)}`,
            status: 'RUNNING',
            cpuUsage: 12.7,
            memoryUsage: 27.8,
            restartCount: 0,
            startedAt: new Date(),
            lastSeenAt: new Date(),
          },
        });

        await tx.container.create({
          data: {
            organizationId: organization.id,
            environmentId: environment.id,
            serviceId: workerService.id,
            hostId: workerHost.id,
            name: 'telemetry-worker',
            image: 'nexus/telemetry-worker',
            imageTag: '1.0.0',
            containerId: `dev-worker-${crypto.randomUUID().slice(0, 12)}`,
            status: 'RUNNING',
            cpuUsage: 9.6,
            memoryUsage: 22.4,
            restartCount: 0,
            startedAt: new Date(),
            lastSeenAt: new Date(),
          },
        });
      }

      return {
        user,
        organization,
      };
    });

    /*
     * JWT
     */
    const token = await new SignJWT({
      userId: result.user.id,
      organizationId: result.organization.id,
    })
      .setProtectedHeader({
        alg: 'HS256',
        typ: 'JWT',
      })
      .setSubject(result.user.id)
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_TTL)
      .sign(secret);

    /*
     * Secure HTTP-only authentication cookie
     */
    reply.setCookie('nexus_access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    });

    return reply.status(201).send({
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: 'OWNER',
        },
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          slug: result.organization.slug,
        },
      },
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * LOGIN
   */
  app.post('/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message:
            'Email, password and organizationId are required.',
        },
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    }

    const {
      email,
      password,
      organizationId,
    } = parsed.data;

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        organizations: {
          where: {
            organizationId,
          },
          select: {
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (
      !user ||
      !user.passwordHash ||
      user.organizations.length === 0
    ) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message:
            'Invalid email, password or organization.',
        },
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    }

    const passwordValid = await verifyPassword(
      user.passwordHash,
      password,
    );

    if (!passwordValid) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message:
            'Invalid email, password or organization.',
        },
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    }

    const membership = user.organizations[0];

    const token = await new SignJWT({
      userId: user.id,
      organizationId,
    })
      .setProtectedHeader({
        alg: 'HS256',
        typ: 'JWT',
      })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_TTL)
      .sign(secret);

    reply.setCookie('nexus_access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    });

    return reply.status(200).send({
      success: true,
      data: {
        accessToken: token,
        tokenType: 'Bearer',
        expiresIn: ACCESS_TOKEN_TTL,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: membership.role,
        },
        organization: membership.organization,
      },
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * LOGOUT
   */
  app.post('/auth/logout', async (request, reply) => {
    reply.clearCookie('nexus_access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return reply.status(200).send({
      success: true,
      data: {
        message: 'Logged out successfully.',
      },
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });
}