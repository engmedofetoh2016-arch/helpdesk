import * as Sentry from "@sentry/node";

const sentryDsn = process.env.SENTRY_DSN?.trim();
const sentryEnabled = Boolean(sentryDsn);

Sentry.init({
  dsn: sentryEnabled ? sentryDsn : undefined,
  environment: process.env.SENTRY_ENVIRONMENT || "development",
  enabled: sentryEnabled,
  tracesSampleRate: 1.0,
});

export default Sentry;
