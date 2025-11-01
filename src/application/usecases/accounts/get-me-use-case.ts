import { HttpUseCase } from "@/application/contracts/use-case";
import { GetProfileAndGoalQuery } from "@/application/query/get-profile-and-goal-query";
import { Injectable } from "@/kernel/decorators/injectable";

@Injectable()
export class GetMeUseCase implements HttpUseCase<"private"> {
  constructor(
    private readonly getProfileAndGoalQuery: GetProfileAndGoalQuery
  ) {}

  async execute({
    accountId,
  }: HttpUseCase.Request<"private">): Promise<HttpUseCase.Response> {
    const result = await this.getProfileAndGoalQuery.execute({ accountId });

    return {
      status: 200,
      data: result,
    };
  }
}
