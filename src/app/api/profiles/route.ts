import { NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";

const PROFILE_COLUMNS = 'id, username, theme, mode, access, push_notifications, class_alerts';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: { ...data, email: user.email } });
}

export async function PUT(request: Request) {
  const { theme, mode, access, push_notifications, class_alerts } = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { data, error } = await supabase
    .from('profiles')
    .update({ theme, mode, access, push_notifications, class_alerts })
    .eq('id', user.id)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ profile: { ...data, email: user.email } });
}