import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email.endsWith("@umass.edu")) {
        return NextResponse.json(
            {error: "Accept UMass email only."},
            {status: 400}
        )
    }
    if (!password || password.length < 8) {
        return NextResponse.json(
            {error: "Password must be at least 8 characters"},
            {status: 400}
        )
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return NextResponse.json({ error: error.message }, { status: 401 });
    if (!data.session) {
        return NextResponse.json(
            {error: "Signup succeed but no session created."},
            {status: 500}
        )
    }
    return NextResponse.json({ ok: true });
}