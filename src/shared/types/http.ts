import { type Request } from "@middy/core";
import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  Context,
} from "aws-lambda";

export type MiddyRequest<TEvent> = Request<TEvent>;

export type MiddyEvent = Omit<
  APIGatewayProxyEventV2WithJWTAuthorizer,
  "body"
> & {
  body?: Record<string, unknown>;
};

export type MiddyContext = Context & {
  internal?: Record<string, unknown>;
};

export type HttpMetadata = {
  route: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "ANY";
  authorizer?: "jwt";
};

export type HandlerWithMetadata = Function & {
  metadata?: HttpMetadata;
};
