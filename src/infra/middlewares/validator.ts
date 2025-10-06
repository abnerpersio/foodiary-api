import type { MiddyEvent } from "@/shared/types/http";
import { middlewareResponse } from "@/shared/utils/middleware-response";
import type { MiddlewareObj } from "@middy/core";
import type { z } from "zod";

export function validator(schema: z.ZodSchema): MiddlewareObj<MiddyEvent> {
  return {
    before: async (request) => {
      const { body, queryStringParameters, pathParameters } = request.event;

      const { error } = schema.safeParse({
        query: queryStringParameters,
        body: body ?? {},
        params: pathParameters,
      });

      if (!error?.issues) return;

      const errors = error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return middlewareResponse(request, 400, { errors });
    },
  };
}
