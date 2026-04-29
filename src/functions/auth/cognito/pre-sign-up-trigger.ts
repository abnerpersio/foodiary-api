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

    const externalId = created.user.Attributes?.find(
      (attr) => attr.Name === "sub",
    )?.Value;

    if (!externalId) {
      throw new Error("Cannot create user to the native account.");
    }

    accountToCreate.externalId = externalId;
    user = created.user;
  }

  const externalId = user?.Attributes?.find(
    (attr) => attr.Name === "sub",
  )?.Value;

  if (!externalId) {
    throw new Error("Cannot link External Provider to the native account.");
  }

  const [providerName, providerUserId] = userName.split("_");

  saga.addCompensation(() => authGateway.deleteUser({ externalId }));

  await saga.run(async () => {
    if (accountToCreate) {
      await accountRepo.save(accountToCreate);
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
      nativeUserId: externalId,
      providerName,
      providerUserId,
    });
  });

  return event;
};
