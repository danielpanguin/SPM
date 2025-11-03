// src/app/api/comments/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function truncate(s: string, n = 160) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

export async function POST(req: Request) {
  const sb = await supabaseServer();
  try {
    const { taskId, userId, content } = await req.json();

    if (!taskId || !userId || !content?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing taskId, userId or content" },
        { status: 400 }
      );
    }

    // 1) Insert the comment (return with author fields just like the client did)
    const { data: comment, error: cErr } = await sb
      .from("comments")
      .insert({ task_id: taskId, user_id: userId, content: content.trim() })
      .select(`
        id,
        task_id,
        message:content,
        created_at,
        updated_at,
        author:users!fk_comments_user_id ( id, username )
      `)
      .single();

    if (cErr) throw cErr;

    // 2) Fetch task (title + owner) and collaborators
    const { data: task, error: tErr } = await sb
      .from("tasks")
      .select("id,title,owned_by")
      .eq("id", taskId)
      .single();
    if (tErr) throw tErr;

    const { data: collabs, error: mErr } = await sb
      .from("task_collaborator")
      .select("user_id")
      .eq("task_id", taskId);
    if (mErr) throw mErr;

    // 3) Compute recipients = owner + collaborators - author
    const recipients = new Set<string>();
    if (task?.owned_by) recipients.add(task.owned_by);
    (collabs ?? []).forEach((r: any) => recipients.add(r.user_id));
    recipients.delete(userId); // do not notify the commenter

    const authorRel = Array.isArray((comment as any)?.author)
      ? (comment as any).author[0]
      : (comment as any)?.author;

    const authorName: string =
      (authorRel?.username as string) ||
      (authorRel?.email as string) ||
      String(userId); // last-resort fallback


    if (recipients.size > 0) {
      const title = `New comment on “${task.title ?? "Untitled"}” from ${authorName}`;
      const message = `"` + truncate(content.trim(), 100) + `"`;

      // Make id deterministic: taskId:userId:comment:commentId
      const rows = Array.from(recipients).map((uid) => ({
        id: `${taskId}:${uid}:comment:${comment.id}`,
        user_id: uid,
        task_id: taskId,
        kind: "comment",
        title,
        message,
        is_read: false,
        due_date: null,
      }));

      // Upsert to avoid accidental dupes if the client retries
      const { error: nErr } = await sb
        .from("notifications")
        .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
      if (nErr) throw nErr;
    }

    return NextResponse.json({ ok: true, comment });
  } catch (e: any) {
    console.error("/api/comments POST error:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
