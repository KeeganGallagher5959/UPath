import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { GET, POST } from "@/app/api/schedules/[scheduleId]/events/route";
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
const ctx = { params: Promise.resolve({ scheduleId: "s1" }) };

const get = async (query = "") => {
  mockSupabase(user, { select: row });
  const res = await GET(new Request(`http://localhost/api/schedules/s1/events${query}`), ctx);
  return { res, events: (await res.json()).events as { id: string }[] };
};
const ids = (events: { id: string }[]) => events.map((e) => e.id).sort();

describe("GET events", () => {
  it("returns 401 when signed out", async () => {
    mockSupabase(null);
    const res = await GET(new Request("http://localhost/x"), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 404 when the schedule doesn't exist", async () => {
    mockSupabase(user, { select: { data: null, error: null } });
    const res = await GET(new Request("http://localhost/x"), ctx);
    expect(res.status).toBe(404);
  });

  it("returns every event with no filters", async () => {
    expect(ids((await get()).events)).toEqual(["a@upath", "b@upath"]);
  });

  it("filters by one day", async () => {
    expect(ids((await get("?day=Monday")).events)).toEqual(["a@upath"]);
  });

  it("filters by several days", async () => {
    expect(ids((await get("?day=Monday&day=Tuesday")).events)).toEqual(["a@upath", "b@upath"]);
  });

  it("searches by name", async () => {
    expect(ids((await get("?q=320")).events)).toEqual(["b@upath"]);
  });

  it("returns only classes on a given date", async () => {
    expect(ids((await get("?date=2026-09-09")).events)).toEqual(["a@upath"]); // Wednesday
    expect(ids((await get("?date=2026-09-10")).events)).toEqual(["b@upath"]); // Thursday
  });

  it("returns nothing on a date with no classes", async () => {
    expect((await get("?date=2026-09-12")).events).toEqual([]); // Saturday
  });

  it("filters by start and end time", async () => {
    expect(ids((await get("?after=12:00")).events)).toEqual(["b@upath"]);
    expect(ids((await get("?before=11:00")).events)).toEqual(["a@upath"]);
  });

  it("combines filters with AND", async () => {
    expect((await get("?day=Monday&q=320")).events).toEqual([]);
  });
});

describe("POST events", () => {
  const post = (body: string) =>
    POST(new Request("http://localhost/x", { method: "POST", body }), ctx);
  const newEvent = JSON.stringify({ name: "Study group", startDate: "2026-09-12", startTime: "15:00" });

  it("returns 401 when signed out", async () => {
    mockSupabase(null);
    expect((await post(newEvent)).status).toBe(401);
  });

  it.each([
    ["array", "[]"],
    ["null", "null"],
    ["bad JSON", "nope"],
  ])("returns 400 for %s body", async (_label, body) => {
    mockSupabase(user, { select: row, update: saved });
    expect((await post(body)).status).toBe(400);
  });

  it("returns 400 and saves nothing when the event is invalid", async () => {
    const { updateMock } = mockSupabase(user, { select: row, update: saved });
    const res = await post(JSON.stringify({ startDate: "2026-09-12", startTime: "15:00" })); // no name
    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the schedule doesn't exist", async () => {
    mockSupabase(user, { select: { data: null, error: null } });
    expect((await post(newEvent)).status).toBe(404);
  });

  it("adds the event, keeps the old ones, and returns 201 with a new id", async () => {
    const { updateMock } = mockSupabase(user, { select: row, update: saved });
    const res = await post(newEvent);
    expect(res.status).toBe(201);
    const { event } = await res.json();
    expect(event.name).toBe("Study group");
    expect(event.id).toMatch(/@upath$/);
    const text = (updateMock.mock.calls[0][0] as { ics: string }).ics;
    expect(text).toContain("Study group");
    expect(text).toContain("COMPSCI 250-02 LEC");
    expect(text).toContain("COMPSCI 320-01 LEC");
  });

  it("adds a weekly event when days and until are given", async () => {
    mockSupabase(user, { select: row, update: saved });
    const res = await post(
      JSON.stringify({
        name: "Lab", startDate: "2026-09-11", startTime: "09:00",
        days: ["Friday"], until: "2026-12-11",
      }),
    );
    expect(res.status).toBe(201);
    const { event } = await res.json();
    expect(event.days).toEqual(["Friday"]);
    expect(event.recurrence).not.toBeNull();
  });

  it("returns 500 when saving fails", async () => {
    mockSupabase(user, { select: row, update: { data: null, error: { message: "boom" } } });
    expect((await post(newEvent)).status).toBe(500);
  });
});