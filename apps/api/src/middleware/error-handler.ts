import type {
  FastifyError,
  FastifyReply,
  FastifyRequest,
} from 'fastify';

type DatabaseError = Error & {
  code?: string;
  meta?: Record<string, unknown>;
};

function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof Error && 'code' in error;
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  request.log.error({
    err: error,
    requestId: request.id,
    method: request.method,
    url: request.url,
  });

  let statusCode =
    error.statusCode && error.statusCode >= 400 && error.statusCode < 600
      ? error.statusCode
      : 500;

  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected server error occurred.';

  /*
   * Fastify validation errors.
   */
  if (error.validation) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'The request contains invalid or missing fields.';
  }

  /*
   * Standard HTTP errors.
   */
  else if (statusCode === 400) {
    code = 'BAD_REQUEST';
    message = error.message;
  }

  else if (statusCode === 401) {
    code = 'UNAUTHORIZED';
    message = 'Authentication is required.';
  }

  else if (statusCode === 403) {
    code = 'FORBIDDEN';
    message = 'You do not have permission to perform this action.';
  }

  else if (statusCode === 404) {
    code = 'NOT_FOUND';
    message = 'The requested resource was not found.';
  }

  else if (statusCode === 409) {
    code = 'CONFLICT';
    message = 'The request conflicts with existing data.';
  }

  else if (statusCode === 422) {
    code = 'UNPROCESSABLE_ENTITY';
    message = 'The request could not be processed.';
  }

  else if (statusCode === 429) {
    code = 'RATE_LIMITED';
    message = 'Too many requests. Please try again later.';
  }

  /*
   * Prisma/database errors.
   *
   * We intentionally inspect the Prisma error code without importing
   * Prisma internals, keeping the API package independent from generated
   * Prisma runtime types.
   */
  if (isDatabaseError(error)) {
    switch (error.code) {
      /*
       * Unique constraint violation.
       */
      case 'P2002':
        statusCode = 409;
        code = 'DUPLICATE_RESOURCE';
        message = 'A resource with the same unique value already exists.';
        break;

      /*
       * Foreign key constraint violation.
       */
      case 'P2003':
        statusCode = 400;
        code = 'INVALID_REFERENCE';
        message = 'The request contains an invalid resource reference.';
        break;

      /*
       * Required record not found.
       */
      case 'P2025':
        statusCode = 404;
        code = 'NOT_FOUND';
        message = 'The requested resource was not found.';
        break;

      /*
       * Database connection failure.
       */
      case 'P1001':
      case 'P1002':
        statusCode = 503;
        code = 'DATABASE_UNAVAILABLE';
        message = 'The database service is temporarily unavailable.';
        break;

      /*
       * Database timeout.
       */
      case 'P2024':
        statusCode = 503;
        code = 'DATABASE_TIMEOUT';
        message = 'The database request timed out. Please try again.';
        break;
    }
  }

  /*
   * Never expose internal server/database details for 5xx errors.
   */
  if (statusCode >= 500) {
    if (statusCode === 503) {
      // Keep the safe database/service-unavailable message above.
    } else {
      statusCode = 500;
      code = 'INTERNAL_SERVER_ERROR';
      message = 'An unexpected server error occurred.';
    }
  }

  /*
   * Avoid sending another response if Fastify has already started
   * writing the response.
   */
  if (reply.sent) {
    return;
  }

  return reply.status(statusCode).send({
    success: false,
    error: {
      code,
      message,
    },
    requestId: request.id,
    timestamp: new Date().toISOString(),
  });
}