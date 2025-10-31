// Example MSW handlers (adapt to your file if names differ)
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const server = setupServer(
  http.get("/api/tasks", () => {
    return HttpResponse.json({ ok: true, data: [] });
  }),

  http.post("/api/tasks", async ({ request }) => {
    const body: any = await request.json();
    const created = {
      id: 30,
      title: body.title,
      description: body.description ?? "",
      start_date: body.startDate ?? body.start_date,
      end_date: body.endDate ?? body.end_date,
      status_id: body.status_id ?? 1,
      priority_id: body.priority_id ?? 3,
    };
    return HttpResponse.json({ ok: true, data: created }, { status: 201 });
  }),

  http.put("/api/tasks/:id", async ({ params, request }) => {
    const id = Number(params.id);
    const body: any = await request.json();
    const updated = {
      id,
      title: body.title ?? "Updated",
      description: body.description ?? "",
      start_date: body.startDate ?? body.start_date,
      end_date: body.endDate ?? body.end_date,
      status_id: body.status_id ?? 1,
      priority_id: body.priority_id ?? 3,
    };
    return HttpResponse.json({ ok: true, data: updated });
  }),

  // Optional PATCH fallback, if your app calls it
  http.patch("/api/tasks/:id", async ({ params, request }) => {
    const id = Number(params.id);
    const body: any = await request.json();
    const updated = {
      id,
      title: body.title ?? "Updated",
      description: body.description ?? "",
      start_date: body.startDate ?? body.start_date,
      end_date: body.endDate ?? body.end_date,
      status_id: body.status_id ?? 1,
      priority_id: body.priority_id ?? 3,
    };
    return HttpResponse.json({ ok: true, data: updated });
  }),

  // If your UI hits /api/users for the assignee list
  http.get("/api/users", () => {
    return HttpResponse.json({
      ok: true,
      data: [
        { id: "26e3b155-8d25-4c05-bbbe-0492401d97ad", email: "chris@staff.com" },
        { id: "c9869941-f048-49ba-8931-4c7251de47d8", email: "francis@staff.com" },
        { id: "8a8b5ed4-7f43-4a6a-be78-ff5dfb268704", email: "bob@staff.com" },
        { id: "7d590135-0f8b-4476-a08f-3351f59c80be", email: "david@admin.com" },
        { id: "c079ec14-e5ad-44f2-a581-153644267334", email: "ellie@admin.com" },
        { id: "032be066-b495-4c85-a78f-81b9c5200734", email: "alice@manager.com" },
      ],
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

export { server };
