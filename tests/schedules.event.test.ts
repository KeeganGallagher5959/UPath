import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { GET, PUT, DELETE } from "@/app/api/schedules/[scheduleId]/events/[eventId]/route";
import { mockSupabase, user } from "./mockDb";

jest.mock("@/lib/supabase/server", () => ({ createClient: jest.fn() }));
afterEach(() => {
  jest.resetAllMocks();
});

const ICS = `BEGIN:VCALENDAR
X-WR-CALNAME:Fall
X-WR-TIMEZONE:America/New_York
BEGIN:VEVENT
UID:a@upath
DTSTART:20260909T101000
DURATION:PT0H50M
RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261215
LOCATION:CS Labs E110
SUMMARY:COMPSCI 250-02 LEC
END:VEVENT
BEGIN:VEVENT
UID:b@upath
DTSTART:20260908T130000
DURATION:PT1H15M
RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20261215
LOCATION:CS Bldg W150
SUMMARY:COMPSCI 320-01 LEC
END:VEVENT
END:VCALENDAR`;

const row = { data: { id: "s1", name: "Fall", ics: ICS }, error: null };
const saved = { data: [{ id: "s1" }], error: null };
const ctx = (eventId: string) => ({ params: Promise.resolve({ scheduleId: "s1", eventId }) });
const req = (method: string, body?: string) => new Request("http://localhost/x", { method, body });

describe("GET one event", () => {
  it("returns 401 when signed out", async () => {
    mockSupabase(null);
    expect((await GET(req("GET"), ctx("a@upath"))).status).toBe(401);
  });

  it("returns 404 when the schedule doesn't exist", async () => {
    mockSupabase(user, { select: { data: null, error: null } });
    expect((await GET(req("GET"), ctx("a@upath"))).status).toBe(404);
  });

  it("returns the event by its id", async () => {
    mockSupabase(user, { select: row });
    const res = await GET(req("GET"), ctx("a@upath"));
    expect(res.status).toBe(200);
    expect((await res.json()).event.name).toBe("COMPSCI 250-02 LEC");
  });

  it("decodes an encoded id (the @ becomes %40)", async () => {
    mockSupabase(user, { select: row });
    const res = await GET(req("GET"), ctx("a%40upath"));
    expect(res.status).toBe(200);
  });

  it("returns 404 for an unknown event id", async () => {
    mockSupabase(user, { select: row });
    expect((await GET(req("GET"), ctx("nope@upath"))).status).toBe(404);
  });
});

describe("PUT event", () => {
  it("returns 401 when signed out", async () => {
    mockSupabase(null);
    expect((await PUT(req("PUT", '{"name":"x"}'), ctx("a@upath"))).status).toBe(401);
  });

  it.each([["array", "[]"], ["null", "null"], ["bad JSON", "nope"]])("returns 400 for %s body", async (_l, body) => {
    mockSupabase(user, { select: row, update: saved });
    expect((await PUT(req("PUT", body), ctx("a@upath"))).status).toBe(400);
  });

  it("changes only what was sent and keeps the rest", async () => {
    const { updateMock } = mockSupabase(user, { select: row, update: saved });
    const res = await PUT(req("PUT", JSON.stringify({ name: "Renamed" })), ctx("a@upath"));
    expect(res.status).toBe(200);
    const { event } = await res.json();
    expect(event.name).toBe("Renamed");
    expect(event.id).toBe("a@upath");
    expect(event.location).toBe("CS Labs E110");
    const text = (updateMock.mock.calls[0][0] as { ics: string }).ics;
    expect(text).toContain("COMPSCI 320-01 LEC"); // other event untouched
  });

  it("removes the location with null", async () => {
    mockSupabase(user, { select: row, update: saved });
    const res = await PUT(req("PUT", JSON.stringify({ location: null })), ctx("a@upath"));
    expect((await res.json()).event.location).toBe("");
  });

  it("returns 404 and saves nothing for an unknown event", async () => {
    const { updateMock } = mockSupabase(user, { select: row, update: saved });
    const res = await PUT(req("PUT", JSON.stringify({ name: "x" })), ctx("nope@upath"));
    expect(res.status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns 400 and saves nothing for an invalid change", async () => {
    const { updateMock } = mockSupabase(user, { select: row, update: saved });
    const res = await PUT(req("PUT", JSON.stringify({ startTime: "banana" })), ctx("a@upath"));
    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("DELETE event", () => {
  it("returns 401 when signed out", async () => {
    mockSupabase(null);
    expect((await DELETE(req("DELETE"), ctx("a@upath"))).status).toBe(401);
  });

  it("removes only that event", async () => {
    const { updateMock } = mockSupabase(user, { select: row, update: saved });
    const res = await DELETE(req("DELETE"), ctx("a@upath"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    const text = (updateMock.mock.calls[0][0] as { ics: string }).ics;
    expect(text).not.toContain("COMPSCI 250-02 LEC");
    expect(text).toContain("COMPSCI 320-01 LEC");
  });

  it("returns 404 and saves nothing for an unknown event", async () => {
    const { updateMock } = mockSupabase(user, { select: row, update: saved });
    expect((await DELETE(req("DELETE"), ctx("nope@upath"))).status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });
});