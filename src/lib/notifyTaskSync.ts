// fire-and-forget helper used after creating/updating a task
export async function notifyTaskSync(taskId: number) {
  try {
    await fetch("/api/cron/sync-task-notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ taskId }),
      // don't await the response in the UI
      keepalive: true,
    });
  } catch {
    // best-effort; never block the UX
  }
}
