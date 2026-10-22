import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const { scheduleId } = await params;
  const { data, error } = await (await createClient())
    .from('events')
    .select('*')
    .eq('schedule_id', scheduleId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ events: data });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const { scheduleId } = await params;
  const body = await request.json();
  const { data, error } = await (await createClient())
    .from('events')
    .insert({ ...body, schedule_id: scheduleId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ event: data });
}