import type { SupabaseClient } from "@supabase/supabase-js";
import { parseIcs, type ParsedCalendar } from "@/lib/ics/parseIcs";

// Each schedule stores its whole .ics file as text in the `ics` column.
export interface ScheduleRow {
    id: string;
    name: string;
    ics: string;
}

export type LoadResult =
    | { ok: true; schedule: ScheduleRow; text: string; calendar: ParsedCalendar }
    | { ok: false; status: number; error: string };

/**
 * Look up one schedule (row-level security makes sure it belongs to the user)
 * and parse its .ics text.
 */
export async function loadCalendar(
    client: SupabaseClient,
    scheduleId: string,
): Promise<LoadResult> {
    const { data: schedule, error } = await client
        .from("schedules")
        .select("id, name, ics")
        .eq("id", scheduleId)
        .maybeSingle();

    if (error) return { ok: false, status: 500, error: error.message };
    if (!schedule) return { ok: false, status: 404, error: "schedule not found." };

    return { ok: true, schedule, text: schedule.ics, calendar: parseIcs(schedule.ics) };
}

/** Saves new .ics text over the schedule's calendar. Returns an error message, or null on success. */
export async function saveCalendarText(
    client: SupabaseClient,
    schedule: ScheduleRow,
    text: string,
): Promise<string | null> {
    const { error } = await client
        .from("schedules")
        .update({ ics: text })
        .eq("id", schedule.id);
    return error ? error.message : null;
}