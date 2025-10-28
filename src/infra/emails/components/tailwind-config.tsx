import { Tailwind } from "@react-email/tailwind";
import React from "react";

type TailwindConfigProps = {
  children: React.ReactNode;
};

export function TailwindConfig({ children }: TailwindConfigProps) {
  return (
    <Tailwind
      config={{
        theme: {
          extend: {
            colors: {
              gray: {
                600: "#A1A1AA",
              },
            },
          },
        },
      }}
    >
      {children}
    </Tailwind>
  );
}
