import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadCalendar } from '@/lib/schedules/loadCalendar';
import { parseIcs, searchEvents } from '@/lib/ics/parseIcs';
import { addEvent } from '@/lib/ics/editics';
import { applyEdit } from '@/lib/schedules/applyEdit';
 
type Ctx = { params: Promise<{ scheduleId: string }> };
 
/**
 * GET /api/schedules/:scheduleId/events
 * Optional query params (all combine with AND):
 *   q       words that must appear in the name or location
 *   day     weekday name, e.g. Monday (repeat the param for several: ?day=Monday&day=Friday)
 *   date    YYYY-MM-DD, events happening on that date (sorted by start time)
 *   after   HH:mm, events starting at or after this time
 *   before  HH:mm, events ending at or before this time
 */
export async function GET(request: Request, { params }: Ctx) {
  const { scheduleId } = await params;
 
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
 
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
 
  const result = await loadCalendar(client, scheduleId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
 
  const q = new URL(request.url).searchParams;
  const days = q.getAll('day');
  const date = q.get('date') ?? undefined;
 
  const events = searchEvents(result.calendar.events, {
    query: q.get('q') ?? undefined,
    day: days.length > 0 ? days : undefined,
    onDate: date,
    startsAfter: q.get('after') ?? undefined,
    endsBefore: q.get('before') ?? undefined,
  });
 
  if (date) events.sort((a, b) => a.startTime.localeCompare(b.startTime));
 
  return NextResponse.json({ events });
}
 
/**
 * POST /api/schedules/:scheduleId/events -> adds an event to the .ics file.
 * Body: { name, startDate, startTime, location?, endTime? | durationMinutes?, days?, until? }
 * Omit `days` for a one-time event. Returns { event } with its new UID as `id`.
 */
export async function POST(request: Request, { params }: Ctx) {
  const { scheduleId } = await params;
 
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Send the event as a JSON object' }, { status: 400 });
  }
 
  const done = await applyEdit(scheduleId, (text) => addEvent(text, body));
  if ('response' in done) return done.response;
 
  const event = parseIcs(done.text).events.find((e) => e.id === done.id);
  return NextResponse.json({ event }, { status: 201 });
}