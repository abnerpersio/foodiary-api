import { type HttpUseCase } from "@/application/contracts/use-case";
import { ListMealsByDateQuery } from "@/application/query/list-meals-by-date-query";
import { Injectable } from "@/kernel/decorators/injectable";
import z from "zod";

export const listMealsByDateSchema = z.object({
  query: z.object({
    date: z.iso.date().transform((date) => new Date(date)),
  }),
});

export namespace ListMealsByDateUseCase {
  export type Query = z.infer<typeof listMealsByDateSchema>["query"];
}

@Injectable()
export class ListMealsByDateUseCase implements HttpUseCase<"private"> {
  constructor(private readonly listMealsByDateQuery: ListMealsByDateQuery) {}

  async execute(
    request: HttpUseCase.Request<
      "private",
      undefined,
      undefined,
      ListMealsByDateUseCase.Query
    >
  ): Promise<HttpUseCase.Response> {
    const { accountId } = request;
    const date = request.query.date;

    return {
      status: 200,
      data: await this.listMealsByDateQuery.execute({ accountId, date }),
    };
  }
}
