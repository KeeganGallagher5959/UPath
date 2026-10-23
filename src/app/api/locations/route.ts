import { NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const { data, error } = await (await createClient())
    .from('locations')
    .select('*');

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ locations: data });
}

export async function PUT(request: Request) {
  const updates = await request.json();
  const { data, error } = await (await createClient())
    .from('locations')
    .update(updates)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ location: data });
}