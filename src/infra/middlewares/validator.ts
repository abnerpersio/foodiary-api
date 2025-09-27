import { middlewareResponse } from '@/lib/utils/middleware-response';
import type { MiddyEvent } from '@/types/http';
import type { MiddlewareObj } from '@middy/core';
import type { z } from 'zod';

export function validator(schema: z.ZodSchema): MiddlewareObj<MiddyEvent> {
  return {
    before: async (request) => {
      const { body, queryStringParameters, pathParameters, requestContext } = request.event;
      const userId = (requestContext.authorizer?.jwt?.claims?.username as string | null) ?? null;

      const { error } = schema.safeParse({
        query: queryStringParameters,
        body: body ?? {},
        params: pathParameters,
        userId,
      });

      if (!error?.issues) {
        return;
      }

      const errors = error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return middlewareResponse(request, 400, { errors });
    },
  };
}
