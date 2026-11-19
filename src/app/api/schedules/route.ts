import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // no ics here, so the full text never goes out in the list
  const { data, error } = await client
    .from('schedules')
    .select('id, name, note, created_at, updated_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ schedules: data });
}

export async function POST(request: Request) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  // empty calendar, written inline so its name matches the row
  const safeName = name.replace(/[\\;,]/g, '\\$&');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UPath//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${safeName}`,
    'X-WR-TIMEZONE:America/New_York',
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n';

  // only these fields are allowed; uid comes from the session
  const { data, error } = await client
    .from('schedules')
    .insert({ uid: user.id, name, note: typeof body.note === 'string' ? body.note : null, ics })
    .select('id, name, note, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ schedule: data }, { status: 201 });
}