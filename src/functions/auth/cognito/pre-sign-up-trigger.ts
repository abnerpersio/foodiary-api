import { AuthGateway } from "@/infra/gateways/auth-gateway";
import { Registry } from "@/kernel/di/registry";
import type { PreSignUpTriggerEvent } from "aws-lambda";

const EXTERNAL_TRIGGER = "PreSignUp_ExternalProvider" as const;
const authGateway = Registry.getInstance().resolve(AuthGateway);

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
    const result = await authGateway.createUser({
      email,
      firstName: given_name,
      lastName: family_name,
      userPoolId,
      profileImage: null,
    });

    user = result.user;
  }

  const nativeUserId = user.Attributes?.find(
    ({ Name }) => Name === "sub"
  )?.Value;

  if (!nativeUserId) {
    throw new Error("Cannot link External Provider to the native account.");
  }

  const [providerName, providerUserId] = userName.split("_");

  await authGateway.linkProvider({
    userPoolId,
    nativeUserId,
    providerName,
    providerUserId,
  });

  return event;
};
