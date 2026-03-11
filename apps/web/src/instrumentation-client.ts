import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://e0dc77a37a00301d9d038e56681c538d@o4511022857191424.ingest.us.sentry.io/4511022858043392",

  sendDefaultPii: true,

  integrations: [Sentry.replayIntegration()],

  // 100% in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  enableLogs: true,

  // Session Replay: 10% of all sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
