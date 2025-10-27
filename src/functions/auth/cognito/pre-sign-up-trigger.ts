import { Account } from "@/application/entities/account";
import { AccountRepository } from "@/infra/database/dynamo/repositories/account-repository";
import { AuthGateway } from "@/infra/gateways/auth-gateway";
import { Registry } from "@/kernel/di/registry";
import type { PreSignUpTriggerEvent } from "aws-lambda";

const EXTERNAL_TRIGGER = "PreSignUp_ExternalProvider" as const;
const authGateway = Registry.getInstance().resolve(AuthGateway);
const accountRepository = Registry.getInstance().resolve(AccountRepository);

const createUser = async ({
  email,
  familyName,
  givenName,
  userPoolId,
}: {
  email: string;
  userPoolId: string;
  givenName: string;
  familyName: string;
}) => {
  const account = new Account({ email });

  const result = await authGateway.createUser({
    internalId: account.id,
    email,
    firstName: givenName,
    lastName: familyName,
    userPoolId,
    profileImage: null,
  });

  const externalId = result.user.Attributes?.find(
    (attr) => attr.Name === "sub"
  )?.Value;

  if (!externalId) {
    throw new Error("Cannot create user to the native account.");
  }

  account.externalId = externalId;
  await accountRepository.create(account);
  return result.user;
};

export const handler = async (event: PreSignUpTriggerEvent) => {
  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;

  if (event.triggerSource !== EXTERNAL_TRIGGER) {
    return event;
  }

  const { userPoolId, userName } = event;
  const { email, given_name, family_name } = event.request.userAttributes;

  let { user } = await authGateway.getUserByEmail({ email, userPoolId });

  if (!user) {
    user = await createUser({
      email,
      userPoolId,
      familyName: family_name,
      givenName: given_name,
    });
  }

  const externalId = user.Attributes?.find(
    (attr) => attr.Name === "sub"
  )?.Value;

  if (!externalId) {
    throw new Error("Cannot link External Provider to the native account.");
  }

  const [providerName, providerUserId] = userName.split("_");

  await authGateway.linkProvider({
    userPoolId,
    nativeUserId: externalId,
    providerName,
    providerUserId,
  });

  return event;
};
