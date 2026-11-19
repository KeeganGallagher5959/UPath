import { jest } from "@jest/globals";
import { createClient } from "@/lib/supabase/server";

type Results = { select?: unknown; insert?: unknown; update?: unknown; delete?: unknown };

export const user = { id: "user12", email: "student@umass.edu" };

// mocks supabase.auth.getUser() and supabase.from(...)
export function mockSupabase(u: { id: string; email?: string } | null, results: Results = {}) {
    const getUserMock = jest.fn(async () => ({ data: { user: u } }));
    const insertMock = jest.fn();
    const updateMock = jest.fn();
    const deleteMock = jest.fn();
    const eqMock = jest.fn();
    const selectMock = jest.fn();

    const from = jest.fn(() => {
        let op: "select" | "insert" | "update" | "delete" = "select";
        const result = () => results[op] ?? { data: null, error: null };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const table: any = {
            insert: (...a: unknown[]) => { op = "insert"; insertMock(...a); return table; },
            update: (...a: unknown[]) => { op = "update"; updateMock(...a); return table; },
            delete: (...a: unknown[]) => { op = "delete"; deleteMock(...a); return table; },
            select: (...a: unknown[]) => { selectMock(...a); return table; },
            eq: (...a: unknown[]) => { eqMock(...a); return table; },
            single: async () => result(),
            maybeSingle: async () => result(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            then: (res: any, rej: any) => Promise.resolve(result()).then(res, rej),
        };
        return table;
    });

    jest.mocked(createClient).mockResolvedValue({
        auth: { getUser: getUserMock },
        from,
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    return { getUserMock, insertMock, updateMock, deleteMock, eqMock, selectMock };
}