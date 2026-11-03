
import { describe, expect, it, jest } from "@jest/globals";
import { POST } from "@/app/api/auth/login/route";
import { createClient } from "@/lib/supabase/server";

jest.mock("@/lib/supabase/server", () => ({
    createClient: jest.fn(),
}));

describe("Login API", () => {
    it("rejects incorrect credentials", async () => {
        const signInMock = jest.fn(
            async (_credentials: { email: string; password: string }) => ({
                error: { message: "Invalid login credentials" },
            })
        );

        jest.mocked(createClient).mockResolvedValue({
            auth: { signInWithPassword: signInMock },
        } as unknown as Awaited<ReturnType<typeof createClient>>);

        const request = new Request(
            "http://localhost:3000/api/auth/login",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: "student@umass.edu",
                    password: "wrongpassword",
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Incorrect email or password.");
        expect(signInMock).toHaveBeenCalledWith({
            email: "student@umass.edu",
            password: "wrongpassword",
        });
    });


    it("successfully logs in with valid credentials", async () => {
        const signInMock = jest.fn(
            async (_credentials: { email: string; password: string }) => ({
                error: null,
            })
        );

        jest.mocked(createClient).mockResolvedValue({
            auth: { signInWithPassword: signInMock },
        } as unknown as Awaited<ReturnType<typeof createClient>>);

        const request = new Request(
            "http://localhost:3000/api/auth/login",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: "student@umass.edu",
                    password: "password123",
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.ok).toBe(true);
        expect(signInMock).toHaveBeenCalledWith({
            email: "student@umass.edu",
            password: "password123",
        });
    });

});
