import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import ical, { type VEvent } from 'node-ical';

const TIMEZONE = 'America/New_York';

interface CleanEvent {
  name: string;
  location: string | null;
  day_of_week: string;
  start_time: string;
  end_time: string | null;
}

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: true, 
});

const dayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE,
  weekday: 'long',
});

function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return value.replace(/\*/g, '').trim() || null;
}

function formatLocalTime(date: Date | string | number | undefined): string | null {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  return timeFormatter.format(d);
}

function getLocalDay(date: Date | string | number | undefined): string | null {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  return dayFormatter.format(d);
}

function isEvent(item: unknown): item is VEvent {
  return (
    typeof item === 'object' &&
    item !== null &&
    'type' in item &&
    (item as { type: unknown }).type === 'VEVENT'
  );
}

const RRULE_DAY_MAP: Record<string, string> = {
  MO: 'Monday',
  TU: 'Tuesday',
  WE: 'Wednesday',
  TH: 'Thursday',
  FR: 'Friday',
  SA: 'Saturday',
  SU: 'Sunday',
};

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const scheduleName = form.get('name');
    const text = await file.text();
    const parsed = await ical.async.parseICS(text);
    const client = await createClient(); // Initialize DB client
    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'You must be signed in to import a calendar.' }, { status: 401 });
    }

    // 1. Create the Schedule in DB
    const { data: schedule, error: scheduleError } = await client
      .from('schedules')
      .insert({
        uid: user.id,
        name:
          typeof scheduleName === 'string' && scheduleName.trim()
            ? scheduleName.trim()
            : file.name.replace(/\.ics$/i, ''),
      })
      .select()
      .single();

    if (scheduleError) {
      return NextResponse.json({ error: scheduleError.message }, { status: 400 });
    }

    // 2. Parse and Deduplicate Events (from local version)
    const seen = new Set<string>();
    const cleanEvents: CleanEvent[] = [];

    for (const item of Object.values(parsed)) {
      if (!isEvent(item) || !item.start) continue;

      const name = clean(item.summary);
      const startTime = formatLocalTime(item.start);
      if (!name || !startTime) continue;

      const location = clean(item.location);
      const endTime = formatLocalTime(item.end);
      const days = new Set<string>();

      if (item.rrule && typeof item.rrule === 'object' && 'options' in item.rrule) {
        const byweekday = (item.rrule.options as { byweekday?: Array<{ code?: string } | string> }).byweekday;
        if (Array.isArray(byweekday)) {
          for (const ruleDay of byweekday) {
            const code = typeof ruleDay === 'string' ? ruleDay : ruleDay?.code;
            if (code && RRULE_DAY_MAP[code]) {
              days.add(RRULE_DAY_MAP[code]);
            }
          }
        }
      }

      if (days.size === 0) {
        const initialDay = getLocalDay(item.start);
        if (initialDay) days.add(initialDay);
      }

      for (const day of days) {
        const key = `${name}|${day}|${startTime}|${location ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);

        cleanEvents.push({
          name,
          location,
          day_of_week: day,
          start_time: startTime,
          end_time: endTime,
        });
      }
    }

    // 3. Process Locations (with caching to avoid redundant DB inserts)
    const locationIds = new Map<string, string>(); // Cache: locationName -> location_id

    for (const ce of cleanEvents) {
      if (ce.location && !locationIds.has(ce.location)) {
        // You might want to use a unique constraint and an upsert (.upsert()) here in production,
        // but this follows your original logic
        const { data: loc, error: locError } = await client
          .from('locations')
          .insert({ uid: user.id, name: ce.location, lat: 0, long: 0 })
          .select('id')
          .single();

        if (!locError && loc) {
          locationIds.set(ce.location, loc.id);
        }
      }
    }

    // 4. Map to DB Events array
    // Note: Ensure your 'events' table has the `day_of_week` column added to support this!
    const eventsToInsert = cleanEvents.map((ce) => ({
      schedule_id: schedule.id,
      location_id: ce.location ? locationIds.get(ce.location) || null : null,
      name: ce.name,
      day_of_week: ce.day_of_week, 
      start_time: ce.start_time,
      end_time: ce.end_time,
    }));

    // 5. Bulk insert events
    if (eventsToInsert.length > 0) {
      const { data, error } = await client.from('events').insert(eventsToInsert).select();
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      return NextResponse.json({ schedule, events: data });
    }

    return NextResponse.json({ schedule, events: [] });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process ICS file', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}