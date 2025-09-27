import * as Sentry from "@sentry/node";
import { z } from "zod";

const schema = z.object({
  // cognitoPoolId: z.string(),
  // cognitoClientId: z.string(),
  // cognitoClientSecret: z.string(),
  // cognitoPoolDomain: z.string(),
  // clientAppUrl: z.string().optional(),
  storageBucketName: z.string(),
  allowedOrigins: z.array(z.string()),
  sentryDSN: z.string().optional(),
  sentryEnv: z.string().optional().default("production"),
  nodeEnv: z.string().default("development"),
});

const { error, data } = schema.safeParse({
  // cognitoPoolId: process.env.COGNITO_POOL_ID,
  // cognitoClientId: process.env.COGNITO_CLIENT_ID,
  // cognitoClientSecret: process.env.COGNITO_CLIENT_SECRET,
  // cognitoPoolDomain: process.env.COGNITO_POOL_DOMAIN,
  // clientAppUrl: process.env.CLIENT_APP_URL,
  storageBucketName: process.env.STORAGE_BUCKET_NAME,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(","),
  sentryDSN: process.env.SENTRY_DSN,
  sentryEnv: process.env.SENTRY_ENV,
  nodeEnv: process.env.NODE_ENV,
});

if (error?.issues?.length) {
  const message = JSON.stringify(error?.issues, null, 2);
  const thrownError = new Error(`[Env] invalid variables: ${message}`);
  Sentry.captureException(thrownError);
  throw thrownError;
}

export const Env = data!;
