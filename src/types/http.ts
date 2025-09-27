import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  Context,
} from "aws-lambda";

export type MiddyEvent = Omit<
  APIGatewayProxyEventV2WithJWTAuthorizer,
  "body"
> & {
  body?: Record<string, unknown>;
};

export type MiddyContext = Context & {
  internal?: Record<string, unknown>;
};

export type DefaultData = Record<string, unknown> | undefined | unknown;

export type HttpRequest<
  TData extends DefaultData = undefined,
  TParams extends Record<string, string> = Record<string, string>,
  TQuery extends Record<string, string> = Record<string, string>,
  TInternal = Record<string, unknown>
> = {
  body: TData;
  params: TParams;
  query: TQuery;
  userId: string | null;
  internal?: TInternal;
};

export type HttpResponse =
  | {
      status: number;
      data?: Record<string, any> | Record<string, any>[];
      message?: never;
    }
  | {
      status: number;
      message?: string;
      data?: never;
    };

export type HttpMetadata = {
  route: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "ANY";
  authorizer?: "jwt";
};

export type HandlerWithMetadata = Function & {
  metadata?: HttpMetadata;
};

export interface HttpUseCase {
  execute(request: HttpRequest<any>): Promise<HttpResponse>;
}
