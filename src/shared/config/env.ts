import { AppError } from "@/infra/errors/app-error";
import { ErrorCode } from "@/infra/errors/error-code";
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
  cognitoPoolId: process.env.COGNITO_POOL_ID,
  cognitoClientId: process.env.COGNITO_CLIENT_ID,
  cognitoClientSecret: process.env.COGNITO_CLIENT_SECRET,
  cognitoPoolDomain: process.env.COGNITO_POOL_DOMAIN,
  clientAppUrl: process.env.CLIENT_APP_URL,
  mainTableName: process.env.MAIN_TABLE_NAME,
  storageBucketName: process.env.STORAGE_BUCKET_NAME,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(","),
  sentryDSN: process.env.SENTRY_DSN,
  sentryEnv: process.env.SENTRY_ENV,
  nodeEnv: process.env.NODE_ENV,
});

if (error?.issues?.length) {
  const message = JSON.stringify(error?.issues, null, 2);
  console.error(`[Env] invalid variables: ${message}`);
  Sentry.captureMessage(`[Env] invalid variables: ${message}`);
  throw new AppError(500, "Internal server error", ErrorCode.SYSTEM_CONFIG);
}

export const Env = data!;
