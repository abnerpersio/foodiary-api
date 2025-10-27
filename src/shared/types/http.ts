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

export type JWTClaims = {
  auth_time: string;
  client_id: string;
  event_id: string;
  exp: string;
  iat: string;
  iss: string;
  jti: string;
  origin_jti: string;
  scope: string;
  sub: string;
  token_use: string;
  username: string;
  internalId: string;
};
