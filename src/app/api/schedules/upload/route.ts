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

    const text = await file.text();
    const parsed = await ical.async.parseICS(text);

    const seen = new Set<string>();
    const events: CleanEvent[] = [];

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

        events.push({
          name,
          location,
          day_of_week: day,
          start_time: startTime,
          end_time: endTime,
        });
      }
    }

    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    events.sort((a, b) => {
      const dayDiff = dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week);
      if (dayDiff !== 0) return dayDiff;
      return a.start_time.localeCompare(b.start_time);
    });

    return NextResponse.json({
      schedule: { name: file.name.replace(/\.ics$/i, '') },
      events,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process ICS file', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

//EXAMPLE RESPONSE:
//{
//   "schedule": { "name": "ST35446618Fall2026Cal" },
//   "events": [
//     {
//       "name": "HISTORY 110-01 LEC(14020)",
//       "location": "Integ. Learning Center S131",
//       "day_of_week": "Monday",
//       "start_time": "09:05 AM",
//       "end_time": "09:55 AM"
//     },
//     {
//       "name": "COMPSCI 250-02 LEC(12119)",
//       "location": "Computer Science Labs E110",
//       "day_of_week": "Monday",
//       "start_time": "10:10 AM",
//       "end_time": "11:00 AM"
//     },
//     {
//       "name": "COMPSCI 320-01 LEC(12056)",
//       "location": "Computer Science Bldg rm W150",
//       "day_of_week": "Tuesday",
//       "start_time": "10:00 AM",
//       "end_time": "11:15 AM"
//     }
//   ]
// }