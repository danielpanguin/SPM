// src/app/api/notifications/list/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const TABLE = "notifications";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const onlyUnread = url.searchParams.get("onlyUnread") === "true";
    const limit = Number(url.searchParams.get("limit") ?? "20");

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    let q = sb
      .from(TABLE)
      .select(
        "id, task_id, user_id, kind, title, message, is_read, due_date, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (onlyUnread) q = q.eq("is_read", false);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ ok: true, notifications: data ?? [] });
  } catch (e: any) {
    console.error("/api/notifications/list", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
