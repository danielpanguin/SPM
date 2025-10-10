// src/app/api/tasks/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

function json(data: any, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

function badRequest(msg: string) {
  return json({ error: msg }, 400);
}

function serverError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  return json({ error: message }, 500);
}

type P = { params: Promise<{ id: string }> };

/**
 * PATCH /api/tasks/[id]/status
 * Updates only the status_id of a task WITHOUT updating the updated_at timestamp.
 * Records the change in an audit log.
 */
export async function PATCH(req: NextRequest, { params }: P) {
  try {
    const { id } = await params;
    const taskId = Number(id);
    if (!Number.isFinite(taskId)) return badRequest("Invalid task id");

    const body = await req.json();
    const { status_id, user_id } = body;

    if (!status_id || !Number.isFinite(status_id)) {
      return badRequest("status_id is required and must be a number");
    }

    // Get current task to log the old status
    const { data: currentTask, error: fetchError } = await supabase
      .from("tasks")
      .select("status_id")
      .eq("id", taskId)
      .single();

    if (fetchError || !currentTask) {
      return json({ error: "Task not found" }, 404);
    }

    const oldStatusId = currentTask.status_id;

    // Update status WITHOUT triggering updated_at (we'll use a raw SQL update)
    // Note: Supabase automatically updates updated_at on UPDATE, so we need to preserve it
    const { data: taskData, error: updateError } = await supabase
      .from("tasks")
      .update({ status_id })
      .eq("id", taskId)
      .select("*, updated_at")
      .single();

    if (updateError) {
      throw new Error(`Error updating task status: ${updateError.message}`);
    }

    // Now restore the original updated_at timestamp
    const { error: restoreError } = await supabase
      .from("tasks")
      .update({ updated_at: taskData.updated_at })
      .eq("id", taskId);

    if (restoreError) {
      console.error("Error restoring updated_at:", restoreError);
    }

    // Log the status change in audit log
    try {
      const { error: auditError } = await supabase
        .from("task_audit_log")
        .insert({
          task_id: taskId,
          user_id: user_id || null,
          action: "status_change",
          old_value: oldStatusId?.toString() || null,
          new_value: status_id.toString(),
          changed_at: new Date().toISOString(),
        });

      if (auditError) {
        console.error("Error creating audit log:", auditError);
        // Don't fail the request if audit logging fails
      }
    } catch (auditErr) {
      console.error("Audit logging failed:", auditErr);
    }

    // Fetch the updated task with all relations
    const { data: updatedTask, error: refetchError } = await supabase
      .from("tasks")
      .select(`
        *,
        status:status_id(id, status),
        priority:priority_id(id),
        project:project_id(id, name)
      `)
      .eq("id", taskId)
      .single();

    if (refetchError) {
      throw new Error(`Error fetching updated task: ${refetchError.message}`);
    }

    return json({ data: updatedTask }, 200);
  } catch (e) {
    return serverError(e);
  }
}
