export const register = async () => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { createLogger, printBanner, resolveLogLevel } = await import(
    "@/app/_utils/logger"
  );
  const { isDocker } = await import("@/app/_server/actions/global");
  const log = createLogger("system");

  printBanner();

  log.info("Cr*nMaster starting", {
    nodeEnv: process.env.NODE_ENV,
    logLevel: resolveLogLevel(),
    logFormat: process.env.LOG_FORMAT || "text",
    docker: await isDocker(),
    appUrl: process.env.APP_URL || "(auto)",
    locale: process.env.LOCALE || "en",
    localLogin: !!process.env.AUTH_PASSWORD,
    ssoMode: process.env.SSO_MODE || "none",
    bearerAuth: !!process.env.API_KEY,
    https: process.env.HTTPS === "true",
    hostCrontabUser: process.env.HOST_CRONTAB_USER || "(auto)",
    liveUpdates: process.env.LIVE_UPDATES !== "false",
    systemStats: process.env.DISABLE_SYSTEM_STATS !== "true",
    maxLogsPerJob: process.env.MAX_LOGS_PER_JOB || "50",
    maxLogAgeDays: process.env.MAX_LOG_AGE_DAYS || "30",
  });

  const { API_KEY_ONLY_WARNING, isApiKeyOnlyAuth } = await import(
    "@/app/_utils/server-action-auth"
  );
  if (isApiKeyOnlyAuth()) {
    log.warn(API_KEY_ONLY_WARNING);
  }
};
