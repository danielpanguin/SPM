// tests/unit/notifyTaskSync.unit.test.ts
import { notifyTaskSync, notifyTaskSyncByUser } from "@/lib/notifyTaskSync";
import { emitNotificationsHint } from "@/lib/notificationsBus";

jest.mock("@/lib/notificationsBus", () => ({
  emitNotificationsHint: jest.fn(),
}));

describe("notifyTaskSync helpers", () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn(async () => ({ ok: true }));
    (emitNotificationsHint as jest.Mock).mockClear();
  });

  it("POSTs a task sync and emits UI hint", async () => {
    await notifyTaskSync(123);

    expect(fetch).toHaveBeenCalledWith(
      "/api/notifications/sync-task",
      expect.objectContaining({ method: "POST" })
    );
    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body).toEqual({ taskId: 123 });

    expect(emitNotificationsHint).toHaveBeenCalled();
  });

  it("POSTs a user sync and emits UI hint", async () => {
    await notifyTaskSyncByUser("user-1");
    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body).toEqual({ userId: "user-1" });
    expect(emitNotificationsHint).toHaveBeenCalled();
  });

  it("skips when userId is falsy", async () => {
    (fetch as jest.Mock).mockClear();
    await notifyTaskSyncByUser("" as any);
    expect(fetch).not.toHaveBeenCalled();
  });
});
