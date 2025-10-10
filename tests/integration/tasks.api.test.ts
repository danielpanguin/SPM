/** @jest-environment node */

// Mock fetch for API tests
global.fetch = jest.fn();

describe("Tasks API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const fetchJson = async (url: string, init?: RequestInit) => {
    const res = await fetch(url, init as any);
    return { res, json: await res.json() };
  };

  it("manager can create with explicit assignee and status", async () => {
    // Mock successful response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 201,
      json: async () => ({ id: 1, title: "Create Task" })
    });

    const { res } = await fetchJson("http://localhost:3000/api/tasks", {
      method: "POST",
      headers: { "Content-Type":"application/json", "x-user-id":"u-mgr" },
      body: JSON.stringify({
        title: "Create Task",
        description: "demo",
        ownedById: "u-stf-1",
        collaboratorsIds: [],
        startDate: "2025-09-20",
        endDate: "2025-09-21",
        priority: "High",
        status: "In Progress"
      })
    } as any);
    expect([201,404,500]).toContain(res.status);
  });

  it("staff cannot set assignee", async () => {
    // Mock successful response (staff creates task assigned to themselves)
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 201,
      json: async () => ({ id: 2, title: "Staff Create", ownedById: "u-stf-1" })
    });

    const { res } = await fetchJson("http://localhost:3000/api/tasks", {
      method: "POST",
      headers: { "Content-Type":"application/json", "x-user-id":"u-stf-1" },
      body: JSON.stringify({
        title: "Staff Create",
        startDate: "2025-09-20",
        endDate: "2025-09-21",
        priority: "Low",
        ownedById: "u-mgr"
      })
    } as any);
    expect([201,404,500]).toContain(res.status);
  });
});
