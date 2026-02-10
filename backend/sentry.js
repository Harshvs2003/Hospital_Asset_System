import dotenv from "dotenv";
import * as Sentry from "@sentry/node";

dotenv.config();

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.2);

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT,
    tracesSampleRate,
    integrations: [Sentry.httpIntegration(), Sentry.expressIntegration()],
  });
}
