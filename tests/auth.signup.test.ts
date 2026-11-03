import { describe, expect, it, jest } from "@jest/globals";
import { createClient } from "@/lib/supabase/server";
import { POST } from "@/app/api/auth/signup/route";

jest.mock("@/lib/supabase/server", () => ({
    createClient: jest.fn(),
}));

describe("Signup API", () => {
    it("rejects non-UMass email addresses", async () => {
        const request = new Request(
            "http://localhost:3000/api/auth/signup",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: "student@gmail.com",
                    password: "password123",
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Accept UMass email only.");
    });


    it("rejects passwords shorter than 8 characters", async () => {
        const request = new Request(
            "http://localhost:3000/api/auth/signup",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: "student@umass.edu",
                    password: "1234567",
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Password must be at least 8 characters");
    });


    it("accepts an 8-character password", async () => {

        const signUpMock = jest.fn(
            async (_credentials: { email: string; password: string }) => ({
                data: { session: { access_token: "fake-token" } },
                error: null,
            })
        );

        jest.mocked(createClient).mockResolvedValue({
            auth: { signUp: signUpMock },
        } as unknown as Awaited<ReturnType<typeof createClient>>);

        const request = new Request(
            "http://localhost:3000/api/auth/signup",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: "student@umass.edu",
                    password: "12345678",
                }),
            }
        );

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.ok).toBe(true);
        expect(signUpMock).toHaveBeenCalledWith({
            email: "student@umass.edu",
            password: "12345678",
        });
    });


    it("normalizes email before signup", async () => {
        const signUpMock = jest.fn(
            async (_credentials: { email: string; password: string }) => ({
                data: { session: { access_token: "fake-token" } },
                error: null,
            })
        );

        jest.mocked(createClient).mockResolvedValue({
            auth: { signUp: signUpMock },
        } as unknown as Awaited<ReturnType<typeof createClient>>);

        const request = new Request(
            "http://localhost:3000/api/auth/signup",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: "  STUDENT@UMASS.EDU  ",
                    password: "password123",
                }),
            }
        );

        const response = await POST(request);

        expect(response.status).toBe(200);
        expect(signUpMock).toHaveBeenCalledWith({
            email: "student@umass.edu",
            password: "password123",
        });
    });


    it("returns an error when Supabase rejects signup", async () => {
        const signUpMock = jest.fn(
            async (_credentials: { email: string; password: string }) => ({
                data: { session: null },
                error: { message: "User already registered" },
            })
        );

        jest.mocked(createClient).mockResolvedValue({
            auth: { signUp: signUpMock },
        } as unknown as Awaited<ReturnType<typeof createClient>>);

        const request = new Request(
            "http://localhost:3000/api/auth/signup",
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

        expect(response.status).toBe(401);
        expect(data.error).toBe("User already registered");
    });

});