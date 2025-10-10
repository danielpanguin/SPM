// src/app/api/statuses/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

function json(data: any, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

function serverError(e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  return json({ error: message }, 500);
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("status")
      .select("id, status")
      .order("id", { ascending: true });

    if (error) {
      throw new Error(`Error fetching statuses: ${error.message}`);
    }

    return json({ data: data || [] }, { status: 200, headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (e) {
    return serverError(e);
  }
}
