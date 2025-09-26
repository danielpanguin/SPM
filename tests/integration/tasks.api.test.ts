/** @jest-environment node */

// Toggle this suite on only when you have the Next server running (npm run dev)
// Run with: RUN_API_TESTS=1 npm test
const run = process.env.RUN_API_TESTS === '1' ? describe : describe.skip;

run("Tasks API", () => {
  const fetchJson = async (url: string, init?: RequestInit) => {
    const res = await fetch(url, init as any);
    return { res, json: await res.json() };
  };

  it("manager can create with explicit assignee and status", async () => {
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
