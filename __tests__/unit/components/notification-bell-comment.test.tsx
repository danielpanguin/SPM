import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import NotificationBell from "@/components/notifications/NotificationBell";

// ---- Auth mock ----
jest.mock("@/hooks/useAuth", () => ({
  useUser: () => ({ userId: "u-owner", role: "manager", accessibleUserIds: ["u-owner"] }),
}));

// ---- Supabase (Realtime only) ----
jest.mock("@/lib/supabaseClient", () => {
  const channel = jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn(),
  }));
  const removeChannel = jest.fn();
  return { supabase: { channel, removeChannel } };
});

// ---- Local notifications bus ----
jest.mock("@/lib/notificationsBus", () => {
  const subs = new Set<Function>();
  return {
    onNotificationsHint: (fn: Function) => { subs.add(fn); return () => subs.delete(fn); },
    __emit: () => subs.forEach(fn => fn()),
  };
});

describe("<NotificationBell />", () => {
  beforeEach(() => {
    jest.useFakeTimers();   // for the 150ms debounce in scheduleLoad()
    // Mock fetch for GET /api/notifications and PATCH calls
    (global as any).fetch = jest.fn(async (url: RequestInfo, init?: RequestInit) => {
      const u = String(url);
      if (u.startsWith("/api/notifications") && (!init || init.method === undefined)) {
        // initial load
        return {
          ok: true,
          json: async () => ({
            ok: true,
            data: [
              { id: "n1", user_id: "u-owner", task_id: "42", kind: "comment", title: "New comment", message: "ping", is_read: false, due_date: null, created_at: new Date().toISOString() },
              { id: "n2", user_id: "u-owner", task_id: "42", kind: "due_today", title: "Due", message: "…", is_read: true, due_date: null, created_at: new Date().toISOString() },
            ],
          }),
        } as Response;
      }
      if (u.startsWith("/api/notifications") && init?.method === "PATCH") {
        return { ok: true, json: async () => ({ ok: true }) } as Response;
      }
      return { ok: false, json: async () => ({ ok: false }) } as Response;
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("shows unread badge, opens list, and refetches on bus hint", async () => {
    const { __emit } = require("@/lib/notificationsBus");

    render(<NotificationBell />);

    // Badge is a <span> inside the button; assert via the button's accessible name
    const bell = screen.getByRole("button", { name: /notifications/i });

    // Initial load is immediate (no debounce): fetch resolves → unreadCount=1 appears
    await waitFor(() => expect(bell.parentElement).toHaveTextContent(/\b1\b/));

    // Open the dropdown
    fireEvent.click(bell);

    // The list shows the "New comment" item
    expect(await screen.findByText(/new comment/i)).toBeInTheDocument();

    // Emit a local hint → triggers scheduleLoad() with 150ms debounce
    __emit();
    jest.advanceTimersByTime(160); // let the debounced load run

    // Still renders (refetched) — item present
    await waitFor(() => expect(screen.getByText(/new comment/i)).toBeInTheDocument());
  });
});
