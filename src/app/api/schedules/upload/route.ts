import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseIcs } from '@/lib/ics/parseIcs';

const MAX_FILE_SIZE = 1_000_000;

export async function POST(request: Request) {
  let client;

  try {
    client = await createClient();
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to process ICS file',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'You must be signed in to import a calendar.' },
      { status: 401 },
    );
  }

  const form = await request.formData();
  const file = form.get('file');
  const nameValue = form.get('name');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File is too large' }, { status: 413 });
  }

  if (!file.name.toLowerCase().endsWith('.ics') && file.type !== 'text/calendar') {
    return NextResponse.json({ error: 'Not a valid .ics file' }, { status: 400 });
  }

  let text: string;
  try {
    text = await file.text();
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to process ICS file',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }

  if (!/^BEGIN:VCALENDAR\b/m.test(text)) {
    return NextResponse.json({ error: 'Not a valid .ics file' }, { status: 400 });
  }

  let calendar;
  try {
    calendar = parseIcs(text);
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to process ICS file',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }

  if (calendar.events.length === 0) {
    return NextResponse.json(
      { error: 'No events found in this file' },
      { status: 422 },
    );
  }

  calendar.events = calendar.events.map((event) => ({
    ...event,
    id: /^[^|]+\|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(event.id)
      ? `${event.id}@upath`
      : event.id,
  }));

  const name = typeof nameValue === 'string' && nameValue.trim()
    ? nameValue.trim()
    : file.name.replace(/\.ics$/i, '') || 'My Calendar';
  let insertedSchedule: { id?: string; name: string } = { name };

  if ('from' in client) {
    const replaceId = form.get('replaceId');
    const { data: existingSchedules } = await client
      .from('schedules')
      .select('id, name');

    const occupiedNames = new Set(
      (existingSchedules ?? [])
        .filter((schedule) => schedule.id !== replaceId)
        .map((schedule) => schedule.name.trim().toLowerCase()),
    );

    const baseName = name;
    let uniqueName = baseName;
    let suffix = 2;
    while (occupiedNames.has(uniqueName.trim().toLowerCase())) {
      uniqueName = `${baseName} (${suffix})`;
      suffix += 1;
    }

    calendar.name = uniqueName;

    const insertResult = await client
      .from('schedules')
      .insert({ uid: user.id, name: uniqueName, ics: text })
      .select('id, name, ics')
      .single();

    if (insertResult.error?.code === 'PGRST204' || insertResult.error?.code === '42703') {
      const fallbackInsert = await client
        .from('schedules')
        .insert({ uid: user.id, name: uniqueName })
        .select('id, name')
        .single();
      if (fallbackInsert.error) {
        return NextResponse.json({ error: fallbackInsert.error.message }, { status: 400 });
      }
      insertedSchedule = fallbackInsert.data ?? { name: uniqueName };
    } else if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.message }, { status: 400 });
    } else {
      insertedSchedule = insertResult.data ?? { name: uniqueName };
    }
  } else {
    calendar.name = name;
  }

  return NextResponse.json({
    schedule: insertedSchedule,
    calendar,
  }, { status: 200 });
}
