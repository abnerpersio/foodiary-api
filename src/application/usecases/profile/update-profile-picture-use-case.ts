import { type HttpUseCase } from "@/application/contracts/use-case";
import { ResourceNotFound } from "@/application/errors/resource-not-found";
import { ProfileRepository } from "@/infra/database/dynamo/repositories/profile-repository";
import { AccountFileStorageGateway } from "@/infra/gateways/account-file-storage-gateway";
import { Injectable } from "@/kernel/decorators/injectable";
import { MB } from "@/shared/utils/file";
import z from "zod";

export const updateProfilePictureSchema = z.object({
  body: z.object({
    file: z.object({
      type: z.enum(["image/jpeg", "image/png"]),
      size: z
        .number()
        .min(1, "Should have at least 1 byte")
        .max(10 * MB, "Max file size is 10MB"),
    }),
  }),
});

export namespace UpdateProfilePictureUseCase {
  export type Body = z.infer<typeof updateProfilePictureSchema>["body"];

  export type Output = {
    uploadSignature: string;
  };
}

@Injectable()
export class UpdateProfilePictureUseCase implements HttpUseCase<"private"> {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly accountFileStorageGateway: AccountFileStorageGateway,
  ) {}

  async execute(
    request: HttpUseCase.Request<"private", UpdateProfilePictureUseCase.Body>,
  ): Promise<HttpUseCase.Response<UpdateProfilePictureUseCase.Output>> {
    const { accountId } = request;

    const profile = await this.profileRepository.findByAccountId(accountId);
    if (!profile) throw new ResourceNotFound("Profile not found");

    const key = this.accountFileStorageGateway.generateFileKey(accountId);
    const { uploadSignature } = await this.accountFileStorageGateway.createPOST(
      { key, accountId },
    );

    profile.profileImage = key;
    await this.profileRepository.save(profile);

    return {
      status: 200,
      data: { uploadSignature },
    };
  }
}
