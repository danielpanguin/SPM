// comments/Comments.tsx
"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState, useRef } from "react";
import { useUser } from "@/hooks/useAuth";

type Comment = {
  id: number;
  task_id: number;
  message: string;
  created_at: string;
  author: { id: string; username: string | null } | null;
};

type CommentUI = Comment & { createdAtTs: number };

type Props = {
  taskId: string;
  onCountChange?: (n: number) => void;
  onPosted?: () => void;
};

export default function Comments({ taskId, onCountChange, onPosted }: Props) {
  const { currentUserId } = useUser();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState<CommentUI[]>([]);
  const disabled = submitting || text.trim().length === 0 || !currentUserId;

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
      author: Array.isArray(r.author) ? r.author[0] ?? null : r.author ?? null,
      createdAtTs: new Date(r.created_at).getTime(),
    })) as CommentUI[];
    shaped.sort((a, b) => (a.createdAtTs - b.createdAtTs) || (a.id - b.id)); // oldest -> newest
    return shaped;
  };

  // auto-scroll to bottom when list changes
  useEffect(() => {
    if (comments.length > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  // load comments for task
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!Number.isFinite(taskIdNum)) {
        setComments([]);
        onCountChange?.(0);
        return;
      }
      const { data, error } = await supabase
        .from("comments")
        .select(`
          id,
          task_id,
          message:content,
          created_at,
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
    return () => { alive = false; };
  }, [taskIdNum, onCountChange]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message || !currentUserId || !Number.isFinite(taskIdNum)) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({ task_id: taskIdNum, user_id: currentUserId, content: message })
        .select(`
          id,
          task_id,
          message:content,
          created_at,
          author:users!fk_comments_user_id ( id, username )
        `)
        .single();

      if (error) throw error;

      const merged = normalizeAndSort([...comments, data]);
      setComments(merged);
      onCountChange?.(merged.length);
      setText("");
      onPosted?.();
    } catch (err: any) {
      console.error(err);
      alert(err.message ?? "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  // permissions
  function canEditComment(c: CommentUI) {
    return !!currentUserId && c.author?.id === currentUserId;
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
      const { data, error } = await supabase
        .from("comments")
        .update({ content: newMessage })
        .eq("id", id)
        .select(`
          id,
          task_id,
          message:content,
          created_at,
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
                // keep createdAtTs same; created_at shouldn't change on update
              }
            : c
        );
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
    if ((e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  }

  return (
    <section aria-labelledby="comments-title" className="mt-4">
      <div className="text-gray-500 text-sm">Comments</div>

      <div
        ref={scrollRef}
        className="border border-gray-400 rounded-2xl p-4 max-h-[20vh] overflow-y-auto"
      >
        <div className="space-y-3">
          {comments.length === 0 && <div className="text-xs text-gray-500">No comments yet.</div>}

          {comments.map((c) => {
            const isEditing = editingId === c.id;

            return (
              <div key={c.id} className="rounded-xl border p-3 bg-gray-50 text-sm">
                <div className="mb-1 text-gray-600 flex items-center gap-2">
                  <span className="font-medium">{c.author?.username ?? c.author?.id ?? "Unknown"}</span>
                  <span className="text-xs text-gray-400">• {new Date(c.createdAtTs).toLocaleString()}</span>

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
                        disabled={savingEdit || !editText.trim()}
                        className="text-xs rounded bg-black text-white px-2 py-1 disabled:opacity-50"
                      >
                        {savingEdit ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={savingEdit}
                        className="text-xs rounded border px-2 py-1"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {!isEditing ? (
                  <p className="text-gray-800 whitespace-pre-wrap">{c.message}</p>
                ) : (
                  <textarea
                    className="w-full rounded border p-2 text-sm focus:outline-none focus:ring"
                    rows={3}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={onEditKeyDown}
                    autoFocus
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* composer */}
      <form onSubmit={handleSubmit} className="mt-2">
        <textarea
          className="w-full rounded-xl border border-gray-400 p-3 text-sm focus:outline-none focus:ring"
          rows={3}
          placeholder={currentUserId ? "Write your comment…" : "Sign in to comment…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!currentUserId}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={disabled}
            className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {submitting ? "Posting…" : "Comment"}
          </button>
        </div>
      </form>
    </section>
  );
}
