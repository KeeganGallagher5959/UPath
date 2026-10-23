import { NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const { data, error } = (await (await createClient())
    .from('route_cache')
    .select('*')
    .eq('from', from)
    .eq('to', to)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ route: data });
}