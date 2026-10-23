import { NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const { data, error } = await (await createClient()).from('schedules').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ schedules: data });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { data, error } = await (await createClient())
    .from('schedules')
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ schedule: data });
}