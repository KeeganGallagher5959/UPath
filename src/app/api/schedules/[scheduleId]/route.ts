import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const { scheduleId } = await params;
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { error } = await client
    .from("schedules")
    .delete()
    .eq("id", scheduleId)
    .eq("uid", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
