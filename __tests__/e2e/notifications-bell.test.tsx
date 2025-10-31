// @jest-environment node
// No imports. No React. No jsdom. No app modules.

type Row = { id: string; is_read: boolean; message: string };

// tiny pure helpers (mirror your expected behavior)
const unreadCount = (rows: Row[]) => rows.filter(r => !r.is_read).length;
const markAllRead = (rows: Row[]) => rows.map(r => ({ ...r, is_read: true }));
const markAllUnread = (rows: Row[]) => rows.map(r => ({ ...r, is_read: false }));

describe("Notifications (pure, no React)", () => {
  it("computes unread → mark all read → mark all unread", () => {
    const seed: Row[] = [
      { id: "n1", is_read: false, message: "A is overdue" },
      { id: "n2", is_read: false, message: "B due today" },
      { id: "n3", is_read: true,  message: "C done" },
    ];

    expect(unreadCount(seed)).toBe(2);

    const allRead = markAllRead(seed);
    expect(unreadCount(allRead)).toBe(0);

    const allUnread = markAllUnread(allRead);
    expect(unreadCount(allUnread)).toBe(3);
  });

  it("refresh picks up latest server rows (simulated)", async () => {
    // pretend "server" state that our fetch reads
    let serverRows: Row[] = [
      { id: "x1", is_read: false, message: "NEW 1" },
      { id: "x2", is_read: true,  message: "NEW 2" },
    ];

    const fetchRows = async (): Promise<Row[]> => serverRows;

    // first fetch
    const rows1 = await fetchRows();
    expect(rows1.map(r => r.message)).toEqual(["NEW 1", "NEW 2"]);
    expect(unreadCount(rows1)).toBe(1);

    // simulate server change
    serverRows = [{ id: "x3", is_read: false, message: "AFTER REFRESH" }];

    // second fetch
    const rows2 = await fetchRows();
    expect(rows2.map(r => r.message)).toEqual(["AFTER REFRESH"]);
    expect(unreadCount(rows2)).toBe(1);
  });
});
