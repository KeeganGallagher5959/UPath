import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function supabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const text = await file.text();
  const client = await supabase();

  const { data: schedule, error: scheduleError } = await client
    .from('schedules')
    .insert({ name: file.name })
    .select()
    .single();

  if (scheduleError) return NextResponse.json({ error: scheduleError.message }, { status: 400 });

  const events = text.split('BEGIN:VEVENT').slice(1).map((block) => {
    const get = (key: string) => block.match(new RegExp(`${key}[^:]*:(.+)`))?.[1]?.trim();
    return {
      schedule_id: schedule.id,
      title: get('SUMMARY'),
      start: get('DTSTART'),
      location: get('LOCATION'),
    };
  });

  const { data, error } = await client.from('events').insert(events).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ schedule, events: data });
}