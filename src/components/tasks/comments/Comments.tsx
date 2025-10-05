// comments/Comments.tsx
"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useUser } from "@/hooks/useAuth";   // <-- use the same hook

type Comment = {
  id: number;
  task_id: number;
  message: string;            // alias for DB `content`
  created_at: string;
  author: { id: string; username: string | null } | null; // joined from users
};

type Props = {
  taskId: string;
  onCountChange?: (n: number) => void;
  onPosted?: () => void;
};

export default function Comments({ taskId, onCountChange, onPosted }: Props) {
  const { currentUserId } = useUser(); // <-- get current user id from the same source
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const disabled = submitting || text.trim().length === 0 || !currentUserId;

  const taskIdNum = Number(taskId);

  useEffect(() => {
      let alive = true;

async function load() {
      if (!Number.isFinite(taskIdNum)) {
        // Avoid querying with NaN
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
          author:users!fk_comments_user_id (
            id,
            username
          )
        `)
        .eq("task_id", taskIdNum)
        .order("created_at", { ascending: false });

      if (!alive) return;

      if (error) {
        console.error("load comments error:", error);
        // optional: alert(error.message);
        setComments([]);
        onCountChange?.(0);
        return;
      }

      setComments((data ?? []) as unknown as Comment[]);
      onCountChange?.(data?.length ?? 0);
    }

    load();
    return () => { alive = false; };
  }, [taskIdNum, onCountChange]);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message || !currentUserId) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          task_id: taskIdNum,                 // <— store as int
          user_id: currentUserId,
          content: message,
        })
        .select(`
          id,
          task_id,
          message:content,
          created_at,
          author:users!fk_comments_user_id ( id, username )
        `)
        .single();

      if (error) throw error;

      setComments(prev => [data as unknown as Comment, ...prev]);
      onCountChange?.((comments.length ?? 0) + 1);
      setText("");
      onPosted?.();
    } catch (err: any) {
      console.error("insert comment error:", err);
      alert(err.message ?? "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  // edit affordance: show Edit button only if current user is the author
  function canEditComment(c: Comment) {
    return !!currentUserId && c.author?.id === currentUserId;
  }

  return (
    <section aria-labelledby="comments-title" className="mt-4 space-y-4">
      <div id="comments-title" className="text-sm text-gray-500">Comments</div>

      {/* List */}
      <div className="space-y-3 overflow-y-scroll h-12">
        {comments.length === 0 && <div className="text-xs text-gray-500">No comments yet.</div>}
        {comments.map((c) => (
          <div key={c.id} className="rounded border p-3 bg-gray-50 text-sm">
            <div className="mb-1 text-gray-600 flex items-center gap-2">
              <span className="font-medium">
                {c.author?.username ?? c.author?.id ?? "Unknown"}
              </span>
              <span className="text-xs text-gray-400">• {new Date(c.created_at).toLocaleString()}</span>
              {canEditComment(c) && (
                <button className="ml-auto text-xs underline text-gray-700 hover:text-black">
                  Edit
                </button>
              )}
            </div>
            <p className="text-gray-800 whitespace-pre-wrap">{c.message}</p>
          </div>
        ))}
      </div>

      {/* Composer */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          className="w-full rounded border p-3 text-sm focus:outline-none focus:ring"
          rows={4}
          placeholder={currentUserId ? "Write your comment…" : "Sign in to comment…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!currentUserId}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={disabled}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {submitting ? "Posting…" : "Comment"}
          </button>
        </div>
      </form>
    </section>
  );
}
