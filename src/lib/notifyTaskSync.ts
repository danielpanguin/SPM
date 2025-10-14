// src/lib/notifyTaskSync.ts
import { emitNotificationsHint } from "./notificationsBus";

async function postSync(body: Record<string, unknown>) {
  try {
    await fetch("/api/notifications/sync-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // ignore network errors – UI will still update via other triggers
  } finally {
    // local immediate nudge so the bell refetches quickly
    emitNotificationsHint();
  }
}

/** Sync by a specific task (called after Create/Edit/Save) */
export async function notifyTaskSync(taskId: number) {
  await postSync({ taskId });
}

/** Sync by a user (owner/collaborator scope) – helpful after save as well */
export async function notifyTaskSyncByUser(userId?: string | null) {
  if (!userId) return;
  await postSync({ userId });
}
