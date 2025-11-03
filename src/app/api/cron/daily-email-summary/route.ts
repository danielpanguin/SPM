import { NextRequest, NextResponse } from "next/server";
import { sendTaskEmails } from "@/app/api/emails/route";

/**
 * Daily Email Summary Cron Job
 *
 * Scheduled to run daily at 8:00 AM SGT (Singapore Time)
 *
 * This endpoint sends three types of emails:
 * 1. Reminder emails - for tasks due tomorrow
 * 2. Overdue emails - for tasks that are overdue
 * 3. Daily summary emails - comprehensive task overview for all users
 *
 * Security: Protected by CRON_SECRET environment variable
 * Only Vercel Cron or authorized services can trigger this endpoint
 */
export async function GET(req: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error("Unauthorized cron request");
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[CRON] Starting daily email summary at", new Date().toISOString());

    const results = {
      reminder: null as any,
      overdue: null as any,
      dailySummary: null as any,
    };

    // Send reminder emails for tasks due tomorrow
    try {
      console.log("[CRON] Sending reminder emails...");
      results.reminder = await sendTaskEmails("reminder");
      console.log("[CRON] Reminder emails sent:", results.reminder);
    } catch (e: any) {
      console.error("[CRON] Error sending reminder emails:", e?.message || e);
      results.reminder = { error: e?.message || String(e) };
    }

    // Send overdue emails for overdue tasks
    try {
      console.log("[CRON] Sending overdue emails...");
      results.overdue = await sendTaskEmails("overdue");
      console.log("[CRON] Overdue emails sent:", results.overdue);
    } catch (e: any) {
      console.error("[CRON] Error sending overdue emails:", e?.message || e);
      results.overdue = { error: e?.message || String(e) };
    }

    // Send daily summary emails to all users
    try {
      console.log("[CRON] Sending daily summary emails...");
      results.dailySummary = await sendTaskEmails("dailySummary");
      console.log("[CRON] Daily summary emails sent:", results.dailySummary);
    } catch (e: any) {
      console.error("[CRON] Error sending daily summary emails:", e?.message || e);
      results.dailySummary = { error: e?.message || String(e) };
    }

    console.log("[CRON] Daily email summary completed at", new Date().toISOString());

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (e: any) {
    console.error("[CRON] Fatal error in daily email summary:", e);
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || String(e),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
