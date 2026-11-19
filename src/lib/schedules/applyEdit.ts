import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadCalendar, saveCalendarText } from '@/lib/schedules/loadCalendar';
import type { EditResult } from '@/lib/ics/editics';
 
/**
 * Runs one edit on a schedule's .ics file:
 * check sign-in -> download the file -> apply `edit` to its text -> save it back.
 *
 * Returns the new text and the edited event's id, or a ready-made error response.
 * The file is downloaded fresh on every call, never reused from an earlier request,
 * so an edit always starts from the latest saved version.
 */
export async function applyEdit(
  scheduleId: string,
  edit: (text: string) => EditResult,
): Promise<{ response: NextResponse } | { text: string; id: string }> {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
 
  if (!user) {
    return { response: NextResponse.json({ error: 'Not signed in' }, { status: 401 }) };
  }
 
  const loaded = await loadCalendar(client, scheduleId);
  if (!loaded.ok) {
    return { response: NextResponse.json({ error: loaded.error }, { status: loaded.status }) };
  }
 
  const result = edit(loaded.text);
  if (!result.ok) {
    const status = result.code === 'not_found' ? 404 : 400;
    return { response: NextResponse.json({ error: result.error }, { status }) };
  }
 
  const saveError = await saveCalendarText(client, loaded.schedule, result.text);
  if (saveError) {
    return { response: NextResponse.json({ error: saveError }, { status: 500 }) };
  }
 
  return { text: result.text, id: result.id };
}