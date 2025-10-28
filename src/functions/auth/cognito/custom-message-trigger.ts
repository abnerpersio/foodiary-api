import ForgotPassword from "@/infra/emails/templates/forgot-password";
import { render } from "@react-email/render";
import type { CustomMessageTriggerEvent } from "aws-lambda";

export const handler = async (event: CustomMessageTriggerEvent) => {
  if (event.triggerSource === "CustomMessage_ForgotPassword") {
    const code = event.request.codeParameter;

    const html = await render(ForgotPassword({ confirmationCode: code }));

    event.response.emailSubject = "foodiary | Recupere sua conta";
    event.response.emailMessage = html;
  }

  return event;
};
