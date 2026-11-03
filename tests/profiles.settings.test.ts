import { describe, expect, it, jest } from "@jest/globals";
import { PUT } from "@/app/api/profiles/route";
import { createClient } from "@/lib/supabase/server";

jest.mock("@/lib/supabase/server", () => ({
    createClient: jest.fn(),
}));

const settings = {
    theme: "dark",
    mode: "bus",
    access: false,
    push_notifications: false,
    class_alerts: true,
};

// Mocks the supabase.from("profiles").update().eq().select().single() chain
function mockSupabase(
    user: { id: string; email: string } | null,
    result: { data: unknown; error: { message: string } | null }
) {
    const query = {
        update: jest.fn((_values: Record<string, unknown>) => query),
        eq: jest.fn((_column: string, _value: string) => query),
        select: jest.fn((_columns: string) => query),
        single: jest.fn(async () => result),
    };
    const fromMock = jest.fn((_table: string) => query);

    jest.mocked(createClient).mockResolvedValue({
        auth: { getUser: jest.fn(async () => ({ data: { user } })) },
        from: fromMock,
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    return { fromMock, query };
}

function settingsRequest(body: Record<string, unknown>) {
    return new Request("http://localhost:3000/api/profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("Settings API (save profile settings)", () => {
    it("rejects saving when not logged in", async () => {
        const { fromMock } = mockSupabase(null, { data: null, error: null });

        const response = await PUT(settingsRequest(settings));
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Not logged in");
        expect(fromMock).not.toHaveBeenCalled();
    });

    it("saves the settings to the logged in user's profile", async () => {
        const { fromMock, query } = mockSupabase(
            { id: "user-123", email: "student@umass.edu" },
            { data: { id: "user-123", username: "alex", ...settings }, error: null }
        );

        const response = await PUT(settingsRequest(settings));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(fromMock).toHaveBeenCalledWith("profiles");
        expect(query.update).toHaveBeenCalledWith(settings);
        expect(query.eq).toHaveBeenCalledWith("id", "user-123");
        expect(data.profile).toEqual({
            id: "user-123",
            username: "alex",
            ...settings,
            email: "student@umass.edu",
        });
    });

    it("only saves settings fields", async () => {
        const { query } = mockSupabase(
            { id: "user-123", email: "student@umass.edu" },
            { data: { id: "user-123", ...settings }, error: null }
        );

        await PUT(
            settingsRequest({ ...settings, id: "someone-else", username: "hacker" })
        );

        expect(query.update).toHaveBeenCalledWith(settings);
        expect(query.eq).toHaveBeenCalledWith("id", "user-123");
    });

    it("returns an error when the database update fails", async () => {
        mockSupabase(
            { id: "user-123", email: "student@umass.edu" },
            { data: null, error: { message: "invalid input value for enum" } }
        );

        const response = await PUT(settingsRequest({ ...settings, mode: "teleport" }));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("invalid input value for enum");
    });
});
