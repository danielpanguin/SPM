// app/api/projects/user/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    console.log("[Projects API] Fetching projects for user:", userId);

    // Fetch projects where the user is a member
    const { data: projectMembers, error: memberError } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", userId);

    if (memberError) {
      console.error("[Projects API] Error fetching project_members:", memberError);
      throw memberError;
    }

    console.log("[Projects API] Found project_members:", projectMembers);

    if (!projectMembers || projectMembers.length === 0) {
      console.log("[Projects API] No project members found for user");
      return NextResponse.json({ ok: true, data: [] });
    }

    const projectIds = projectMembers.map((pm) => pm.project_id);
    console.log("[Projects API] Project IDs to fetch:", projectIds);

    // Fetch the actual project details
    const { data: projects, error: projectError } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds)
      .order("name", { ascending: true });

    if (projectError) {
      console.error("[Projects API] Error fetching projects:", projectError);
      throw projectError;
    }

    console.log("[Projects API] Fetched projects:", projects);

    return NextResponse.json({ ok: true, data: projects ?? [] });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}
