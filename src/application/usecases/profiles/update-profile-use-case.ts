import { HttpUseCase } from "@/application/contracts/use-case";
import { Profile } from "@/application/entities/profile";
import { ResourceNotFound } from "@/application/errors/resource-not-found";
import { ProfileRepository } from "@/infra/database/dynamo/repositories/profile-repository";
import { Injectable } from "@/kernel/decorators/injectable";
import z from "zod";

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Required"),
    birthDate: z.iso.date().transform((date) => new Date(date)),
    gender: z.enum(Profile.Gender),
    weight: z.number().min(1, "Should be at least 1"),
    height: z.number().min(1, "Should be at least 1"),
  }),
});

export namespace UpdateProfileUseCase {
  export type Body = z.infer<typeof updateProfileSchema>["body"];
}

@Injectable()
export class UpdateProfileUseCase implements HttpUseCase<"private"> {
  constructor(private readonly profileRepository: ProfileRepository) {}

  async execute(
    request: HttpUseCase.Request<"private", UpdateProfileUseCase.Body>
  ): Promise<HttpUseCase.Response> {
    const { accountId } = request;

    const profile = await this.profileRepository.findByAccountId(accountId);
    if (!profile) throw new ResourceNotFound("Profile not found");

    profile.name = request.body.name;
    profile.birthDate = request.body.birthDate;
    profile.gender = request.body.gender;
    profile.weight = request.body.weight;
    profile.height = request.body.height;

    await this.profileRepository.save(profile);

    return { status: 204 };
  }
}

export namespace UpdateProfileUseCase {
  export type Input = {};
}
