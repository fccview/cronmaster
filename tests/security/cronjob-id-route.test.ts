import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const actions = vi.hoisted(() => ({
  fetchCronJobs: vi.fn(),
  editCronJob: vi.fn(),
  removeCronJob: vi.fn(),
}));

vi.mock("@/app/_server/actions/cronjobs", () => actions);
vi.mock("@/app/_utils/api-auth-utils", () => ({ requireAuth: vi.fn(async () => null) }));

import { DELETE, PATCH } from "@/app/api/cronjobs/[id]/route";

const job = {
  id: "abcd-1234",
  schedule: "*/5 * * * *",
  command: "/usr/bin/backup.sh",
  comment: "nightly",
  user: "deploy",
  logsEnabled: true,
};

const props = (id: string) => ({ params: Promise.resolve({ id }) });
const patch = (body: unknown) =>
  new NextRequest("http://localhost/api/cronjobs/abcd-1234", {
    method: "PATCH",
    body: JSON.stringify(body),
  });

beforeEach(() => {
  actions.fetchCronJobs.mockReset().mockResolvedValue([job]);
  actions.editCronJob.mockReset().mockResolvedValue({ success: true, message: "ok" });
  actions.removeCronJob.mockReset().mockResolvedValue({ success: true, message: "ok" });
});

describe("DELETE /api/cronjobs/[id]", () => {
  it("removes the real job, user included", async () => {
    const res = await DELETE(new NextRequest("http://localhost/x", { method: "DELETE" }), props("abcd-1234"));
    expect(res.status).toBe(200);
    expect(actions.removeCronJob).toHaveBeenCalledWith(job);
  });

  it("returns 404 for unknown ids", async () => {
    const res = await DELETE(new NextRequest("http://localhost/x", { method: "DELETE" }), props("nope-nope"));
    expect(res.status).toBe(404);
    expect(actions.removeCronJob).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/cronjobs/[id]", () => {
  it("fills unspecified fields from the existing job", async () => {
    const res = await PATCH(patch({ comment: "renamed" }), props("abcd-1234"));
    expect(res.status).toBe(200);

    const form = actions.editCronJob.mock.calls[0][0] as FormData;
    expect(Object.fromEntries(form.entries())).toEqual({
      id: "abcd-1234",
      schedule: "*/5 * * * *",
      command: "/usr/bin/backup.sh",
      comment: "renamed",
      logsEnabled: "true",
    });
  });

  it("keeps explicit values", async () => {
    await PATCH(patch({ schedule: "0 1 * * *", command: "echo hi", comment: "", logsEnabled: false }), props("abcd-1234"));
    const form = actions.editCronJob.mock.calls[0][0] as FormData;
    expect(Object.fromEntries(form.entries())).toEqual({
      id: "abcd-1234",
      schedule: "0 1 * * *",
      command: "echo hi",
      comment: "",
      logsEnabled: "false",
    });
  });

  it("returns 404 for unknown ids", async () => {
    const res = await PATCH(patch({ comment: "x" }), props("nope-nope"));
    expect(res.status).toBe(404);
    expect(actions.editCronJob).not.toHaveBeenCalled();
  });
});
