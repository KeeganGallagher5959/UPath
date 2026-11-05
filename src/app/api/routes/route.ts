import { NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { route } from "@/lib/ors";

/**
 * GET /api/routes?from=<location id>&to=<location id>&mode=foot|bike|car|bus
 * Returns duration, distance, and the line to draw between two of the user's
 * locations. Duration/distance are cached in route_cache.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const mode = searchParams.get('mode') ?? 'foot';
  if (!from || !to) return NextResponse.json({ error: 'from and to required' }, { status: 400 });

  const supabase = await createClient();

  // RLS only returns the user's own locations, so this doubles as an ownership check.
  const { data: locs, error: locError } = await supabase
    .from('locations')
    .select('id, lat, long')
    .in('id', [from, to]);
  if (locError) return NextResponse.json({ error: locError.message }, { status: 400 });

  const origin = locs?.find((l) => l.id === from);
  const dest = locs?.find((l) => l.id === to);
  if (!origin || !dest) return NextResponse.json({ error: 'Location not found' }, { status: 404 });

  const { data: cached } = await supabase
    .from('route_cache')
    .select('*')
    .eq('origin_loc_id', from)
    .eq('dest_loc_id', to)
    .eq('mode', mode)
    .maybeSingle();

  // The line isn't cached, so always ask ORS; the cache just skips the DB write.
  let result;
  try {
    result = await route(origin, dest, mode);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  if (!cached) {
    // Users can't write route_cache (RLS), so use the service role.
    await createAdminClient().from('route_cache').insert({
      origin_loc_id: from,
      dest_loc_id: to,
      mode,
      duration_s: result.duration_s,
      distance_m: result.distance_m,
    });
  }

  return NextResponse.json({ route: { from, to, mode, ...result } });
}
