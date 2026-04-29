import { type HttpUseCase } from "@/application/contracts/use-case";
import { ResourceNotFound } from "@/application/errors/resource-not-found";
import { AccountRepository } from "@/infra/database/dynamo/repositories/account-repository";
import { AccountFileStorageGateway } from "@/infra/gateways/account-file-storage-gateway";
import { Injectable } from "@/kernel/decorators/injectable";

@Injectable()
export class UpdateProfilePictureUseCase implements HttpUseCase<"private"> {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly accountFileStorageGateway: AccountFileStorageGateway
  ) {}

  async execute(
    request: HttpUseCase.Request<"private">
  ): Promise<HttpUseCase.Response> {
    const { accountId } = request;

    const account = await this.accountRepository.findById(accountId);
    if (!account) throw new ResourceNotFound("Account not found");

    const key = this.accountFileStorageGateway.generateFileKey(accountId);
    const { uploadSignature } = await this.accountFileStorageGateway.createPOST({ key, accountId });

    account.profileImage = key;
    await this.accountRepository.save(account);

    return {
      status: 200,
      data: { uploadSignature },
    };
  }
}
