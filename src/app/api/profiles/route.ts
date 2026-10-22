import { NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const { data, error } = await (await createClient())
    .from('profiles')
    .select('id, username, theme, mode, access')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: data });
}

export async function PUT(request: Request) {
  const { theme, mode, access } = await request.json();
  const { data, error } = await (await createClient())
    .from('profiles')
    .update({ theme, mode, access })
    .select('id, username, theme, mode, access')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: data });
}