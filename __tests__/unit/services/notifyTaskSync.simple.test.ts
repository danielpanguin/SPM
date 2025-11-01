// tests/unit/notifyTaskSync.simple.test.ts
import { notifyTaskSync, notifyTaskSyncByUser } from "@/lib/notifyTaskSync";
import { emitNotificationsHint } from "@/lib/notificationsBus";

// silence any console noise just in case
const noop = () => {};
beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(noop);
  jest.spyOn(console, "warn").mockImplementation(noop);
  jest.spyOn(console, "error").mockImplementation(noop);
});

jest.mock("@/lib/notificationsBus", () => ({
  emitNotificationsHint: jest.fn(),
}));

describe("notifyTaskSync (simple)", () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn(async () => ({ ok: true })) as any;
    (emitNotificationsHint as jest.Mock).mockClear();
  });

  it("POSTs taskId to /api/notifications/sync-task and emits hint", async () => {
    await notifyTaskSync(42);

    expect(fetch).toHaveBeenCalledWith(
      "/api/notifications/sync-task",
      expect.objectContaining({ method: "POST" })
    );

    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body).toEqual({ taskId: 42 });

    expect(emitNotificationsHint).toHaveBeenCalledTimes(1);
  });

  it("POSTs userId to /api/notifications/sync-task and emits hint", async () => {
    await notifyTaskSyncByUser("alice");

    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body).toEqual({ userId: "alice" });

    expect(emitNotificationsHint).toHaveBeenCalledTimes(1);
  });

  it("skips when userId is falsy", async () => {
    (fetch as jest.Mock).mockClear();
    await notifyTaskSyncByUser("" as any);
    expect(fetch).not.toHaveBeenCalled();
    expect(emitNotificationsHint).not.toHaveBeenCalled();
  });
});
