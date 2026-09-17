import type { FastifyReply, FastifyRequest } from 'fastify';

export async function requestContext(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const startTime = performance.now();

  reply.header('x-request-id', request.id);

  reply.raw.on('finish', () => {
    const durationMs = performance.now() - startTime;

    request.log.info({
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    });
  });
}