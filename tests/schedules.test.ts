import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { GET, POST } from "@/app/api/schedules/route";
import { mockSupabase, user } from "./mockDb";

jest.mock("@/lib/supabase/server", () => ({ createClient: jest.fn() }));
afterEach(() => {jest.resetAllMocks()});

const post = (body: string) =>
  new Request("http://localhost/api/schedules", { method: "POST", body });

describe("GET /api/schedules", () => {
  it("returns 401 when signed out", async () => {
    mockSupabase(null);
    expect((await GET()).status).toBe(401);
  });

  it("lists schedules without the ics text", async () => {
    const { selectMock } = mockSupabase(user, {
      select: { data: [{ id: "s1", name: "Fall" }], error: null },
    });
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).schedules).toHaveLength(1);
    expect(selectMock.mock.calls[0][0] as string).not.toContain("ics");
  });

  it("returns 400 when the database fails", async () => {
    mockSupabase(user, { select: { data: null, error: { message: "boom" } } });
    const res = await GET();
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("boom");
  });
});

describe("POST /api/schedules", () => {
  it("returns 401 and saves nothing when signed out", async () => {
    const { insertMock } = mockSupabase(null);
    const res = await POST(post(JSON.stringify({ name: "Fall" })));
    expect(res.status).toBe(401);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it.each([
    ["missing name", "{}"],
    ["blank name", '{"name":"   "}'],
    ["bad JSON", "not json"],
  ])("returns 400 for %s", async (_label, body) => {
    const { insertMock } = mockSupabase(user);
    const res = await POST(post(body));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("creates the schedule and ignores fields the client shouldn't set", async () => {
    const { insertMock } = mockSupabase(user, {
      insert: { data: { id: "s1", name: "Fall" }, error: null },
    });
    const res = await POST(
      post(JSON.stringify({ name: "  Fall  ", uid: "evil", ics: "junk", note: "hi" })),
    );
    expect(res.status).toBe(201);
    const saved = insertMock.mock.calls[0][0] as { uid: string; name: string; note: string; ics: string };
    expect(saved.uid).toBe("user12");
    expect(saved.name).toBe("Fall");
    expect(saved.note).toBe("hi");
    expect(saved.ics).toContain("X-WR-CALNAME:Fall");
    expect(saved.ics).not.toContain("junk");
  });

  it("returns 400 when the insert fails", async () => {
    mockSupabase(user, { insert: { data: null, error: { message: "boom" } } });
    expect((await POST(post(JSON.stringify({ name: "Fall" })))).status).toBe(400);
  });
});