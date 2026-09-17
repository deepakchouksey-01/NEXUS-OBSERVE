import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (request) => {
    return {
      success: true,
      data: {
        status: 'ok',
        service: 'nexus-api',
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    };
  });
}