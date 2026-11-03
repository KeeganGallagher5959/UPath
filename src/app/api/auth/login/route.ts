import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email || !password) {
        return NextResponse.json(
            {error: "Please enter your email and password."},
            {status: 400}
        )
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) return NextResponse.json(
        { error: "Incorrect email or password." }, 
        { status: 401 }
    );
    return NextResponse.json({ ok: true });
}