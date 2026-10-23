import { NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string; eventId: string }> }
) {
  const { eventId, scheduleId } = await params;
  const body = await request.json();
  const { data, error } = await (await createClient())
    .from('events')
    .update(body)
    .eq('id', eventId)
    .eq('schedule_id', scheduleId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ event: data });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ scheduleId: string; eventId: string }> }
) {
  const { eventId, scheduleId } = await params;
  const { error } = await (await createClient())
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('schedule_id', scheduleId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}