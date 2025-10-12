// src/app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const supabase = await supabaseServer(); // <-- await
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId") ?? "";

  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}

export async function PATCH(req: Request) {
  const supabase = await supabaseServer(); // <-- await
  const url = new URL(req.url);
  const all = url.searchParams.get("all");
  const userId = url.searchParams.get("userId") ?? "";

  try {
    if (all && userId) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    const body = await req.json().catch(() => ({}));
    const id = body?.id;
    const is_read = !!body?.is_read;

    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    const { error } = await supabase.from("notifications").update({ is_read }).eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Patch failed" },
      { status: 500 }
    );
  }
}
