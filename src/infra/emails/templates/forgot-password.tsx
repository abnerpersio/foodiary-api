import { Column } from "@react-email/column";
import { Heading } from "@react-email/heading";
import { Html } from "@react-email/html";
import { Row } from "@react-email/row";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";
import React from "react";
import { TailwindConfig } from "../components/tailwind-config";

type ForgotPasswordProps = {
  confirmationCode: string;
};

export default function ForgotPassword({
  confirmationCode,
}: ForgotPasswordProps) {
  return (
    <TailwindConfig>
      <Html>
        <Section className="font-sans">
          <Row>
            <Column className="text-center">
              <Heading as="h1" className="text-2xl leading-tight pt-10 m-0">
                Recupere a sua conta
              </Heading>

              <Heading as="h2" className="font-normal text-base text-gray-600">
                Resete a sua senha e volte ao foco!
              </Heading>
            </Column>
          </Row>

          <Row>
            <Column className="text-center pt-4">
              <span className="bg-gray-200 inline-block px-8 py-4 text-3xl font-bold tracking-[16px] text-center">
                {confirmationCode}
              </span>
            </Column>
          </Row>

          <Row>
            <Column className="text-center pt-10">
              <Text className="text-sm text-gray-600 max-w-[260px] mx-auto">
                Se você não solicitou essa troca, fique tranquilo, sua conta
                está segura!
              </Text>
            </Column>
          </Row>
        </Section>
      </Html>
    </TailwindConfig>
  );
}

ForgotPassword.PreviewProps = {
  confirmationCode: "145123",
};
