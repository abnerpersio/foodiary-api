import { Env } from "@/shared/config/env";
import * as Sentry from "@sentry/aws-serverless";
// import { nodeProfilingIntegration } from '@sentry/profiling-node';

if (Env.sentryDSN) {
  Sentry.init({
    dsn: Env.sentryDSN,
    // integrations: [nodeProfilingIntegration()],
    environment: Env.sentryEnv,
    tracesSampleRate: 1.0,
  });
}
