// comments/Comments.tsx
"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState, useRef } from "react";
import { useUser } from "@/hooks/useAuth";
import { emitNotificationsHint } from "@/lib/notificationsBus";

type Comment = {
  id: number;
  task_id: number;
  message: string;
  created_at: string;
  updated_at?: string | null;
  author: { id: string; username: string | null } | null;
};

type CommentUI = Comment & {
  createdAtTs: number;
  updatedAtTs: number | null;
};

type Props = {
  taskId: number | string;
  onPosted?: () => void;
  onCountChange?: (count: number) => void;
};

export default function Comments({ taskId, onPosted, onCountChange }: Props) {
  const { userId } = useUser();

  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState<CommentUI[]>([]);
  const [canComment, setCanComment] = useState<boolean>(false);
  const disabled = submitting || text.trim().length === 0 || !userId;

  // ✏️ edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const taskIdNum = Number(taskId);
  const scrollRef = useRef<HTMLDivElement>(null);

  const normalizeAndSort = (rows: any[]): CommentUI[] => {
    const shaped = (rows ?? []).map((r) => ({
      id: r.id as number,
      task_id: r.task_id as number,
      message: r.message as string,
      created_at: r.created_at as string,
      updated_at: r.updated_at ?? null,
      author: Array.isArray(r.author) ? r.author[0] ?? null : r.author ?? null,
      createdAtTs: new Date(r.created_at).getTime(),
      updatedAtTs: r.updated_at ? new Date(r.updated_at).getTime() : null,
    })) as CommentUI[];
    // Keep conversation order stable (oldest -> newest) by creation time
    shaped.sort((a, b) => (a.createdAtTs - b.createdAtTs) || (a.id - b.id));
    return shaped;
  };

  // Gate who can comment (owner/collaborators; staff restriction preserved)
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!userId || !Number.isFinite(taskIdNum)) {
        setCanComment(false);
        return;
      }

      // 1) Get current user's role_id
      const { data: me, error: meErr } = await supabase
        .from("users")
        .select("id, role_id")
        .eq("id", userId)
        .single();

      if (!alive) return;
      if (meErr || !me) {
        console.error("role lookup error:", meErr);
        setCanComment(false);
        return;
      }

      // If not staff (role_id !== 3), allow
      if (me.role_id !== 3) {
        setCanComment(true);
        return;
      }

      // 2) Staff: fetch owner + collaborators for this task
      const [{ data: t, error: tErr }, { data: collabs, error: cErr }] = await Promise.all([
        supabase.from("tasks").select("owned_by").eq("id", taskIdNum).single(),
        supabase.from("task_collaborator").select("user_id").eq("task_id", taskIdNum),
      ]);

      if (!alive) return;
      if (tErr || cErr || !t) {
        console.error("task/colabs lookup error:", tErr || cErr);
        setCanComment(false);
        return;
      }

      const collaboratorIds = new Set((collabs ?? []).map((r: any) => r.user_id as string));
      const isOwner = t.owned_by === userId;
      const isCollaborator = collaboratorIds.has(userId);

      setCanComment(isOwner || isCollaborator);
    })();

    return () => {
      alive = false;
    };
  }, [userId, taskIdNum]);

  // auto-scroll to bottom when list changes
  useEffect(() => {
    if (comments.length > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  // initial load + whenever task changes
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!Number.isFinite(taskIdNum)) return;

      const { data, error } = await supabase
        .from("comments")
        .select(`
          id,
          task_id,
          message:content,
          created_at,
          updated_at,
          author:users!fk_comments_user_id ( id, username )
        `)
        .eq("task_id", taskIdNum)
        .order("created_at", { ascending: true });

      if (!alive) return;

      if (error) {
        console.error("load comments error:", error);
        setComments([]);
        onCountChange?.(0);
        return;
      }

      const sorted = normalizeAndSort(data ?? []);
      setComments(sorted);
      onCountChange?.(sorted.length);
    })();
    return () => {
      alive = false;
    };
  }, [taskIdNum, onCountChange]);

  const composerDisabled = submitting || text.trim().length === 0 || !userId || !canComment;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message || !userId || !Number.isFinite(taskIdNum)) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: taskIdNum,
          userId,
          content: message,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "Failed to post comment");

      const data = json.comment as Comment; 
      const merged = normalizeAndSort([...(comments ?? []), data]);
      setComments(merged);
      onCountChange?.(merged.length);
      setText("");
      onPosted?.();
      emitNotificationsHint();
    } catch (err: any) {
      console.error(err);
      alert(err.message ?? "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  // permissions
  function canEditComment(c: CommentUI) {
    return !!userId && c.author?.id === userId;
  }

  // enter edit mode
  function startEdit(c: CommentUI) {
    if (!canEditComment(c)) return;
    setEditingId(c.id);
    setEditText(c.message);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  // save edit
  async function saveEdit() {
    if (editingId == null || !editText.trim()) return;
    const id = editingId;
    const newMessage = editText.trim();

    setSavingEdit(true);
    try {
      // Explicitly stamp updated_at so UI always reflects the latest edit time
      const nowIso = new Date().toISOString();

      const { data, error } = await supabase
        .from("comments")
        .update({ content: newMessage, updated_at: nowIso })
        .eq("id", id)
        .select(`
          id,
          task_id,
          message:content,
          created_at,
          updated_at,
          author:users!fk_comments_user_id ( id, username )
        `)
        .single();

      if (error) throw error;

      // update local list
      setComments((prev) => {
        const next = prev.map((c) =>
          c.id === id
            ? {
                ...c,
                message: data.message as string,
                updated_at: data.updated_at ?? c.updated_at,
                updatedAtTs: data.updated_at
                  ? new Date(data.updated_at).getTime()
                  : c.updatedAtTs ?? null,
              }
            : c
        );
        // Keep creation-order stable
        next.sort((a, b) => (a.createdAtTs - b.createdAtTs) || (a.id - b.id));
        return next;
      });

      setEditingId(null);
      setEditText("");
    } catch (err: any) {
      console.error(err);
      alert(err.message ?? "Failed to update comment");
    } finally {
      setSavingEdit(false);
    }
  }

  // keyboard helpers inside edit box
  function onEditKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  }

  return (
    <section aria-labelledby="comments-title" className="mt-4">
      <div className="text-gray-500 text-sm mb-2">Comments</div>

      <div
        ref={scrollRef}
        className="border border-gray-200 rounded-sm p-4 max-h-[24vh] overflow-y-auto"
      >
        <div className="space-y-3">
          {comments.length === 0 && (
            <div className="text-xs text-gray-500">No comments yet.</div>
          )}

          {comments.map((c) => {
            const isEditing = editingId === c.id;
            const showEdited = !!c.updatedAtTs && c.updatedAtTs !== c.createdAtTs;
            const displayTs = new Date(c.updatedAtTs ?? c.createdAtTs).toLocaleString();

            return (
              <div key={c.id} className="rounded-sm border border-gray-400 p-3 bg-gray-50 text-sm">
                <div className="mb-1 text-gray-600 flex items-center gap-2">
                  <span className="font-medium">
                    {c.author?.username ?? c.author?.id ?? "Unknown"}
                  </span>
                  <span
                    className="text-xs text-gray-400"
                    title={
                      showEdited
                        ? `Edited ${displayTs} (original ${new Date(c.createdAtTs).toLocaleString()})`
                        : `Created ${displayTs}`
                    }
                  >
                    • {displayTs} {showEdited ? "(edited)" : ""}
                  </span>

                  {canEditComment(c) && !isEditing && (
                    <button
                      onClick={() => startEdit(c)}
                      className="ml-auto text-xs underline text-gray-700 hover:text-black"
                    >
                      Edit
                    </button>
                  )}

                  {isEditing && (
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={saveEdit}
                        disabled={savingEdit || editText.trim().length === 0}
                        className="text-xs rounded px-2 py-1 bg-black text-white disabled:opacity-50"
                      >
                        {savingEdit ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={savingEdit}
                        className="text-xs underline text-gray-600 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {!isEditing ? (
                  <p className="whitespace-pre-wrap text-gray-800">{c.message}</p>
                ) : (
                  <textarea
                    className="w-full text-sm border rounded p-2"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={onEditKeyDown}
                    rows={3}
                    autoFocus
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-3 space-y-2">
        <textarea
          hidden={!canComment}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={canComment ? "Add a comment…" : "You don't have permission to comment"}
          rows={3}
          className="w-full border rounded p-2 text-sm"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            hidden={!canComment}
            disabled={composerDisabled}
            className="rounded-xl text-sm bg-black px-4 py-2 text-white font-medium disabled:opacity-50 hover:bg-gray-800 transition-colors"
          >
            {submitting ? "Posting…" : "Comment"}
          </button>
        </div>
      </form>
    </section>
  );
}
