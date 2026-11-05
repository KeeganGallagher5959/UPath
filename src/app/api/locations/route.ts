import { NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";
import { geocodeFuzzy } from "@/lib/ors";

export async function GET() {
  const { data, error } = await (await createClient())
    .from('locations')
    .select('*');

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ locations: data });
}

/**
 * POST { name: string }
 * Geocodes the name and saves it as one of the user's locations.
 * If the user already has a location with that name, returns it instead.
 */
export async function POST(request: Request) {
  const { name } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  // Already saved? Skip the API call.
  const { data: existing } = await supabase
    .from('locations')
    .select('*')
    .eq('uid', user.id)
    .eq('name', name.trim())
    .maybeSingle();
  if (existing) return NextResponse.json({ location: existing });

  const geo = await geocodeFuzzy(name.trim());
  if (!geo) return NextResponse.json({ error: `Could not find "${name}"` }, { status: 404 });

  const { data, error } = await supabase
    .from('locations')
    .insert({ uid: user.id, name: name.trim(), address: geo.address, lat: geo.lat, long: geo.long })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ location: data }, { status: 201 });
}

export async function PUT(request: Request) {
  const { id, ...updates } = await request.json();
  const { data, error } = await (await createClient())
    .from('locations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ location: data });
}
