import type { SupabaseClient } from "@supabase/supabase-js";
import { parseIcs, type ParsedCalendar } from "@/lib/ics/parseIcs";

// Placeholder:
export const SCHEDULE_BUCKET = 'schedules';
// The `schedules` table is assumed to have a `file_path` column pointing into the bucket.

export interface ScheduleRow {
    id: string;
    name: string;
    file_path: string;
}

export type LoadResult =
    | { ok: true; schedule: ScheduleRow; text: string; calendar: ParsedCalendar}
    | { ok: false; status: number; error: string};

/**
 * Look up one schedule (RLS makes sure it belongs to the user).
 * downloads its .ics from the bucket, and parses it.
 */
export async function loadCalendar(
    client: SupabaseClient,
    scheduleId: string,
): Promise<LoadResult> {
    const { data: schedule, error }= await client
        .from("schedules")
        .select("id, name, file_path")
        .eq("id", scheduleId)
        .maybeSingle();
    
    if (error) return { ok: false, status: 500, error: error.message};
    if (!schedule) return { ok: false, status: 404, error: "schedule not found."};
    if (!schedule.file_path) {
        return { ok: false, status: 500, error: "This schedule has no calendar file yet."};
    }

    const { data: blob, error: downloadError } = await client.storage
        .from(SCHEDULE_BUCKET)
        .download(schedule.file_path);
    
    if (downloadError || !blob) {
        return { ok: false, status: 500, error: downloadError?.message ?? 'Could not read the calendar file' };
    }

    const text = await blob.text();
    return { ok: true, schedule, text, calendar: parseIcs(text) };
}

/** Saves new ICS text over the schedule's file. Returns an error message, or null on success. */
export async function saveCalendarText(
    client: SupabaseClient,
    schedule: ScheduleRow,
    text: string,
): Promise<string | null> {
    const { error } = await client.storage
        .from(SCHEDULE_BUCKET)
        .upload(schedule.file_path, text, { upsert: true, contentType: 'text/calendar' });
    return error ? error.message : null;
}