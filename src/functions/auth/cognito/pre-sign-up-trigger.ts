import { Account } from "@/application/entities/account";
import { AccountRepository } from "@/infra/database/dynamo/repositories/account-repository";
import { AuthGateway } from "@/infra/gateways/auth-gateway";
import { Registry } from "@/kernel/di/registry";
import { Saga } from "@/shared/saga/saga";
import type { PreSignUpTriggerEvent } from "aws-lambda";

const EXTERNAL_TRIGGER = "PreSignUp_ExternalProvider" as const;

export const handler = async (event: PreSignUpTriggerEvent) => {
  const authGateway = Registry.getInstance().resolve(AuthGateway);
  const saga = Registry.getInstance().resolve(Saga);
  const accountRepo = Registry.getInstance().resolve(AccountRepository);

  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;

  if (event.triggerSource !== EXTERNAL_TRIGGER) {
    return event;
  }

  const { userPoolId, userName } = event;
  const { email, given_name, family_name, picture } =
    event.request.userAttributes;

  let { user } = await authGateway.getUserByEmail({ email, userPoolId });
  let accountToCreate: Account | undefined;

  if (!user) {
    accountToCreate = new Account({ email });

    const created = await authGateway.createUser({
      internalId: accountToCreate.id,
      email,
      firstName: given_name,
      lastName: family_name,
      userPoolId,
      profileImage: picture,
    });

    user = created.user;
  }

  const [providerName, providerUserId] = userName.split("_");

  saga.addCompensation(async () => {
    if (!user.Username) return;
    return await authGateway.deleteUser({ externalId: user.Username });
  });

  await saga.run(async () => {
    if (!user.Username) {
      throw new Error("Cannot link External Provider to the native account.");
    }

    if (accountToCreate) {
      accountToCreate.externalId = user.Username;
      await accountRepo.create(accountToCreate);
    }

    await authGateway.updateUser({
      userPoolId,
      email,
      firstName: given_name,
      lastName: family_name,
      profileImage: picture,
    });
    await authGateway.linkProvider({
      userPoolId,
      nativeUserId: user.Username,
      providerName,
      providerUserId,
    });
  });

  return event;
};
