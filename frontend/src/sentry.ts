import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Setting this option to true will send default PII data to Sentry.
    sendDefaultPii: true,
    integrations: [Sentry.browserTracingIntegration()],
    // Tracing
    tracesSampleRate: 0.2,
    // Adjust this list for your API domain(s)
    tracePropagationTargets: ['localhost']
  })
}
