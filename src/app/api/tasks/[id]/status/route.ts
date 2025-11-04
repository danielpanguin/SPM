// src/app/api/tasks/[id]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";

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

    // First, get the current status_id (old value) and check if new status is "Archived"
    const { data: currentTask, error: fetchError } = await supabase
      .from("tasks")
      .select("status_id")
      .eq("id", taskId)
      .single();

    if (fetchError || !currentTask) {
      console.error("Fetch error:", fetchError);
      return json({ error: "Task not found" }, 404);
    }

    const oldStatusId = currentTask.status_id;

    // Check if the new status is "Archived" (get status name)
    const { data: statusData } = await supabase
      .from("status")
      .select("status")
      .eq("id", status_id)
      .single();
    
    const isArchiving = statusData?.status?.toLowerCase() === 'archived';

    // Now update the status and is_archived flag
    const updateData: any = { status_id };
    if (isArchiving) {
      updateData.is_archived = true;
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", taskId)
      .select("status_id, is_archived")
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
      .from("audit_log")
      .insert({
        table_name: "tasks",
        record_id: taskId,
        field_name: "status_id",
        old_value: oldStatusId?.toString() || null,
        new_value: status_id.toString(),
        action: "update",
        changed_by: user_id || null,
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
