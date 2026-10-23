import { describe, expect, it } from "@jest/globals";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_TEST_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.SUPABASE_TEST_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const appUrl = process.env.TEST_APP_URL ?? "http://localhost:3000";

const requiredEnvironment = supabaseUrl && supabaseAnonKey;

describe("profiles API integration", () => {
  it(
    "reads the seeded profile through Supabase with the authenticated user",
    async () => {
      if (!requiredEnvironment) {
        throw new Error(
          "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before running this test.",
        );
      }

      const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: "mock.alex@umass.edu",
        password: "password123",
      });

      expect(signInError).toBeNull();

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, theme, mode, access")
        .single();

      expect(error).toBeNull();
      expect(data).toMatchObject({
        username: "mock.alex",
        theme: "dark",
        mode: "foot",
        access: false,
      });
    },
    15_000,
  );

  it(
    "returns the seeded profile from the backend API",
    async () => {
      if (!requiredEnvironment) {
        throw new Error(
          "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before running this test.",
        );
      }

      const loginResponse = await fetch(`${appUrl}/api/auth/login`, {
        body: JSON.stringify({
          email: "mock.alex@umass.edu",
          password: "password123",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      expect(loginResponse.ok).toBe(true);

      const setCookie = loginResponse.headers.getSetCookie?.() ?? [];
      expect(setCookie.length).toBeGreaterThan(0);

      const response = await fetch(`${appUrl}/api/profiles`, {
        headers: { cookie: setCookie.map((cookie) => cookie.split(";")[0]).join("; ") },
      });

      expect(response.ok).toBe(true);
      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );

      const body = await response.json();
      expect(body.profile).toMatchObject({
        username: "mock.alex",
        theme: "dark",
        mode: "foot",
        access: false,
      });
    },
    15_000,
  );
});
