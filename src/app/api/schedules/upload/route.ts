import { NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";

// Don't send the full .ics text when listing schedules
const LIST_COLUMNS = 'id, name, note, created_at, updated_at';

export async function GET() {
  const { data, error } = await (await createClient()).from('schedules').select(LIST_COLUMNS);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ schedules: data });
}

export async function POST(request: Request) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });

  // Only allow these fields; uid comes from the session, ics starts as an empty calendar (column default)
  const { data, error } = await client
    .from('schedules')
    .insert({ uid: user.id, name: body.name.trim(), note: body.note ?? null })
    .select(LIST_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ schedule: data }, { status: 201 });
}