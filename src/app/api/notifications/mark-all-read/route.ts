// src/app/api/notifications/mark-all-read/route.ts
import { NextResponse } from "next/server";
import { supabaseServerAnon } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });
    }

    const sb = supabaseServerAnon();
    const { error, count } = await sb
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .select("*", { count: "exact" });

    if (error) throw error;
    return NextResponse.json({ ok: true, updated: count ?? 0 });
  } catch (e: any) {
    console.error("mark-all-read", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
