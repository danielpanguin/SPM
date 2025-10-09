// app/api/projects/user/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;

    // Fetch projects where the user is a member
    const { data: projectMembers, error: memberError } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", userId);

    if (memberError) throw memberError;

    if (!projectMembers || projectMembers.length === 0) {
      return NextResponse.json({ ok: true, data: [] });
    }

    const projectIds = projectMembers.map((pm) => pm.project_id);

    // Fetch the actual project details
    const { data: projects, error: projectError } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds)
      .order("name", { ascending: true });

    if (projectError) throw projectError;

    return NextResponse.json({ ok: true, data: projects ?? [] });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}
