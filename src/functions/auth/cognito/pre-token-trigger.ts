import type { PreTokenGenerationV2TriggerEvent } from "aws-lambda";

export const handler = async (event: PreTokenGenerationV2TriggerEvent) => {
  event.response = {
    claimsAndScopeOverrideDetails: {
      accessTokenGeneration: {
        claimsToAddOrOverride: {
          internalId: event.request.userAttributes["custom:internalId"],
        },
      },
    },
  };

  return event;
};
