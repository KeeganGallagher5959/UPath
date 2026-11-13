import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureUids, parseIcs, setCalendarName, stripTrailingStars } from '@/lib/ics/parseIcs';
 
const MAX_BYTES = 1_000_000; // 1 MB is far more than any semester schedule
 
export async function POST(request: Request) {
  try {
    // Check auth before doing any work
    const client = await createClient();
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
 
    // Check for no file given, too large of a file, not valid ics file.
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File is too large' }, { status: 413 });
    }
 
    // Name typed in the import dialog; fall back to the file name
    const nameField = form.get('name');
    const scheduleName =
      typeof nameField === 'string' && nameField.trim()
        ? nameField.trim()
        : file.name.replace(/\.ics$/i, '');
 
    const text = await file.text();
    if (!text.includes('BEGIN:VCALENDAR')) {
      return NextResponse.json({ error: 'Not a valid .ics file' }, { status: 400 });
    }
 
    // Clean the file: remove the trailing "*" padding, then give every event a stable UID
    // (events that already have one are untouched). This is the version to save to the bucket.
    const { text: icsWithUids } = ensureUids(stripTrailingStars(text));
    const icsToSave = setCalendarName(icsWithUids, scheduleName);

    // Every VEVENT is kept as-is: no merging and no dedupe
    const calendar = parseIcs(icsToSave);
 
    if (calendar.events.length === 0) {
      return NextResponse.json({ error: 'No events found in this file' }, { status: 422 });
    }
 
    // TODO (bucket): upload `icsToSave` (not the original `text`) to the storage bucket here,
 
    // Once the schedules row exists, add its id here: schedule: { id, name }
    return NextResponse.json({ schedule: { name: scheduleName }, calendar });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to process ICS file',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}