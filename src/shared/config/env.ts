import * as Sentry from "@sentry/node";
import { z } from "zod";

const schema = z.object({
  cognitoPoolId: z.string(),
  cognitoClientId: z.string(),
  cognitoClientSecret: z.string(),
  cognitoPoolDomain: z.string(),
  clientAppUrl: z.string().optional(),
  mainTableName: z.string(),
  storageBucketName: z.string(),
  allowedOrigins: z.array(z.string()),
  sentryDSN: z.string().optional(),
  sentryEnv: z.string().optional().default("prod"),
  nodeEnv: z.string().default("development"),
});

const { error, data } = schema.safeParse({
  cognitoPoolId: process.env.COGNITO_POOL_ID || "",
  cognitoClientId: process.env.COGNITO_CLIENT_ID || "",
  cognitoClientSecret: process.env.COGNITO_CLIENT_SECRET || "",
  cognitoPoolDomain: process.env.COGNITO_POOL_DOMAIN || "",
  clientAppUrl: process.env.CLIENT_APP_URL || "",
  mainTableName: process.env.MAIN_TABLE_NAME || "",
  storageBucketName: process.env.STORAGE_BUCKET_NAME || "",
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(","),
  sentryDSN: process.env.SENTRY_DSN,
  sentryEnv: process.env.SENTRY_ENV,
  nodeEnv: process.env.NODE_ENV,
});

const ENV_IGNORE_SETUP = process.env.ENV_IGNORE_SETUP;

if (error?.issues?.length && ENV_IGNORE_SETUP !== "true") {
  const message = JSON.stringify(error?.issues, null, 2);
  console.error(`[Env] invalid variables: ${message}`);
  Sentry.captureMessage(`[Env] invalid variables: ${message}`);
}

export const Env = (data || {}) as z.infer<typeof schema>;
