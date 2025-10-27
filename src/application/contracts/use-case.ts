type TRouteType = "public" | "private";

export interface HttpUseCase<TType extends TRouteType> {
  execute(
    request: HttpUseCase.Request<TType, any, any, any>
  ): Promise<HttpUseCase.Response>;
}

export namespace HttpUseCase {
  export type DefaultData = Record<string, unknown> | undefined | unknown;

  export type BaseRequest<
    TBody extends DefaultData = undefined,
    TParams = Record<string, string>,
    TQueryParams = Record<string, string>,
    TInternal = Record<string, unknown>
  > = {
    body: TBody;
    params: TParams;
    query: TQueryParams;
    internal?: TInternal;
  };

  type PublicRequest<
    TBody extends DefaultData = undefined,
    TParams = Record<string, unknown>,
    TQueryParams = Record<string, unknown>
  > = BaseRequest<TBody, TParams, TQueryParams> & {
    accountId: null;
  };

  type PrivateRequest<
    TBody extends DefaultData = undefined,
    TParams = Record<string, unknown>,
    TQueryParams = Record<string, unknown>
  > = BaseRequest<TBody, TParams, TQueryParams> & {
    accountId: string;
  };

  export type Request<
    TType extends TRouteType,
    TBody extends DefaultData = undefined,
    TParams = Record<string, unknown>,
    TQueryParams = Record<string, unknown>
  > = TType extends "public"
    ? PublicRequest<TBody, TParams, TQueryParams>
    : PrivateRequest<TBody, TParams, TQueryParams>;

  export type Response =
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
}
