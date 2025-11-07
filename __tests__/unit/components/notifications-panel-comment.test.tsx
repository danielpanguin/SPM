/** @jest-environment jsdom */
import { render, screen, within } from "@testing-library/react";
import React from "react";
import NotificationsPanel, { NotificationRow } from "@/components/notifications/NotificationsPanel";

describe("<NotificationsPanel /> comment kind", () => {
  it("renders New comment title and message", () => {
    const items: NotificationRow[] = [
      {
        id: "t42:u1:comment:c1",
        user_id: "u1",
        task_id: 42,
        kind: "comment",
        title: "New comment on “Design Spec” from alice",
        message: "Please check the API boundaries",
        is_read: false,
        due_date: null,
        created_at: new Date().toISOString(),
      },
    ];

    render(<NotificationsPanel items={items} onToggleAll={() => {}} isMutating={false} />);
    
    const row = screen.getAllByRole("listitem")[0];

    expect(within(row).getByText(/new comment/i)).toBeInTheDocument();
    expect(within(row).getByText(/Design Spec/)).toBeInTheDocument();
    expect(within(row).getByText(/Please check the API/)).toBeInTheDocument();
  });
});
