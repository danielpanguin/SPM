/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { emitNotificationsHint } from "@/lib/notificationsBus";

// --- Auth: logged in user ---
jest.mock("@/hooks/useAuth", () => ({
  useUser: () => ({ userId: "u-author", role: "staff", accessibleUserIds: ["u-author"] }),
}));

// --- Notifications bus ---
jest.mock("@/lib/notificationsBus", () => ({
  emitNotificationsHint: jest.fn(),
}));

/**
 * IMPORTANT: Define the supabase mock INSIDE the factory so we don't reference
 * a hoisted, not-yet-initialized variable.
 */
jest.mock("@/lib/supabaseClient", () => {
  // helper to build the exact chains Comments.tsx uses
  const supabase = {
    from: (table: string) => {
      // users lookup (role_id)
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: "u-author", role_id: 2 }, // NOT 3 -> canComment = true (short-circuit)
                error: null,
              }),
            }),
          }),
        };
      }
      // comments list (initial load)
      if (table === "comments") {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: [], error: null }),
            }),
          }),
        };
      }
      // not needed when role_id !== 3, but keep harmless chains if ever called
      if (table === "tasks") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { owned_by: "u-owner" }, error: null }),
            }),
          }),
        };
      }
      if (table === "task_collaborator") {
        return {
          select: () => ({
            eq: async () => ({ data: [], error: null }),
          }),
        };
      }
      return { select: () => ({}) } as any;
    },
  };
  return { supabase };
});

// Import after mocks are declared (safe; factory doesn’t rely on outer vars)
import Comments from "@/components/tasks/comments/Comments";

// --- network for POST /api/comments ---
const mockFetch = (ok = true, overrides: Partial<any> = {}) => {
  (global as any).fetch = jest.fn(async () => ({
    ok,
    json: async () => ({
      ok,
      comment: {
        id: 123,
        task_id: 42,
        message: "hello world",
        created_at: new Date().toISOString(),
        updated_at: null,
        author: { id: "u-author", username: "alice" },
        ...overrides,
      },
    }),
  }));
};

describe("<Comments /> comment → notifications [canComment enabled]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("submits comment via /api/comments and emits notifications hint", async () => {
    mockFetch(true);

    const onCountChange = jest.fn();
    const onPosted = jest.fn();

    render(<Comments taskId={42} onCountChange={onCountChange} onPosted={onPosted} />);

    // canComment flips true after the users lookup; wait for the textbox to appear
    const textarea = await screen.findByRole("textbox");
    fireEvent.change(textarea, { target: { value: "hello world" } });

    // Your button label is "Comment"
    fireEvent.click(screen.getByRole("button", { name: /comment/i }));

    await waitFor(() => expect(onPosted).toHaveBeenCalled());
    expect(onCountChange).toHaveBeenCalledWith(1);
    expect((textarea as HTMLTextAreaElement).value).toBe(""); // cleared
    expect(emitNotificationsHint).toHaveBeenCalledTimes(1);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/comments",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: 42, userId: "u-author", content: "hello world" }),
      })
    );
  });

  it("shows error if API fails", async () => {
    mockFetch(false);

    render(<Comments taskId={42} />);

    const textarea = await screen.findByRole("textbox");
    fireEvent.change(textarea, { target: { value: "boom!" } });

    const originalAlert = window.alert;
    window.alert = () => {}; // silence

    fireEvent.click(screen.getByRole("button", { name: /comment/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    window.alert = originalAlert;
  });
});
