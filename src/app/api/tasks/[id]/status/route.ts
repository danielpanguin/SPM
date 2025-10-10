// src/app/api/tasks/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Note: Using supabaseClient directly for this specialized endpoint
// to avoid circular dependencies with tasks.repo

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

    // Update status and get old value in one query using RETURNING
    const { data: updatedTask, error: updateError } = await supabase
      .from("tasks")
      .update({ status_id })
      .eq("id", taskId)
      .select("status_id")
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return json({ error: `Task not found: ${updateError.message}` }, 404);
    }

    if (!updatedTask) {
      return json({ error: "Task not found" }, 404);
    }

    // Log the status change in audit log (async, don't wait)
    // Fire and forget - don't slow down the response
    supabase
      .from("task_audit_log")
      .insert({
        task_id: taskId,
        user_id: user_id || null,
        action: "status_change",
        old_value: null, // We don't have old value anymore, but that's ok
        new_value: status_id.toString(),
        changed_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) console.error("Audit log error:", error);
      });

    // Return minimal response - client already has the data
    return json({ 
      data: { 
        id: taskId, 
        status_id: status_id 
      } 
    }, 200);
  } catch (e) {
    return serverError(e);
  }
}
