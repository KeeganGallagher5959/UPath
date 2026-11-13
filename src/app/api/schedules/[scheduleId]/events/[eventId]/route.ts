import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadCalendar } from '@/lib/schedules/loadCalendar';
import { applyEdit } from '@/lib/schedules/applyEdit';
import { parseIcs } from '@/lib/ics/parseIcs';
import { updateEvent, deleteEvent } from '@/lib/ics/editics';
 
type Ctx = { params: Promise<{ scheduleId: string; eventId: string }> };
 
function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
 
// GET /api/schedules/:scheduleId/events/:eventId -> one event, found by its UID
export async function GET(_request: Request, { params }: Ctx) {
  const { scheduleId, eventId } = await params;
 
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
 
  const id = decode(eventId);
  const event = result.calendar.events.find((e) => e.id === id);
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }
 
  return NextResponse.json({ event });
}
 
/**
 * PUT /api/schedules/:scheduleId/events/:eventId -> changes only the fields you send.
 * Body: any of { name, startDate, startTime, location, endTime, durationMinutes, days, until }
 *       location: null removes it, days: null makes the event one-time, until: null removes the end date.
 * Returns { event }.
 */
export async function PUT(request: Request, { params }: Ctx) {
  const { scheduleId, eventId } = await params;
  const id = decode(eventId);
 
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Send the changes as a JSON object' }, { status: 400 });
  }
 
  const done = await applyEdit(scheduleId, (text) => updateEvent(text, id, body));
  if ('response' in done) return done.response;
 
  const event = parseIcs(done.text).events.find((e) => e.id === done.id);
  return NextResponse.json({ event });
}
 
// DELETE /api/schedules/:scheduleId/events/:eventId -> removes the event from the .ics file
export async function DELETE(_request: Request, { params }: Ctx) {
  const { scheduleId, eventId } = await params;
  const id = decode(eventId);
 
  const done = await applyEdit(scheduleId, (text) => deleteEvent(text, id));
  if ('response' in done) return done.response;
 
  return NextResponse.json({ success: true });
}
 