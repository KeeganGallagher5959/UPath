import { describe, expect, it, jest } from "@jest/globals";
import { POST } from "@/app/api/schedules/upload/route";
import { createClient } from "@/lib/supabase/server";

jest.mock("@/lib/supabase/server", () => ({
    createClient: jest.fn(),
}));

const UPLOAD_URL = "http://localhost:3000/api/schedules/upload";

const SAMPLE_ICS = `BEGIN:VCALENDAR
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Work
X-WR-TIMEZONE:America/New_York
X-WR-CALDESC:
BEGIN:VEVENT
DTSTART:20260909T101000
DURATION:PT0H50M
RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261215
LOCATION:Computer Science Labs E110   *
STATUS:CONFIRMED
SUMMARY:COMPSCI 250-02 LEC(12119)      *
END:VEVENT
BEGIN:VEVENT
DTSTART:20260908T100000
DURATION:PT1H15M
RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20261215
LOCATION:Computer Science Bldg rm W150*
STATUS:CONFIRMED
SUMMARY:COMPSCI 320-01 LEC(12056)      *
END:VEVENT
END:VCALENDAR`;

// mocks supabase.auth.getUser()
function mockSupabase(user: { id: string; email: string } | null) {
    const getUserMock = jest.fn(async () => ({ data: { user } }));

    jest.mocked(createClient).mockResolvedValue({
        auth: { getUser: getUserMock },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    return { getUserMock };
}

const user = { id: "user12", email: "student@umass.edu" };

function icsFile(text: string, filename = "fall2026.ics") {
    return new File([text], filename, { type: "text/calendar" });
}

function uploadRequest(fields: { file?: File | string; name?: string }) {
    const form = new FormData();
    if (fields.file !== undefined) form.append("file", fields.file);
    if (fields.name !== undefined) form.append("name", fields.name);
    return new Request(UPLOAD_URL, { method: "POST", body: form });
}

describe("Upload API (import .ics: POST /api/schedules/upload)", () => {
    it("rejects the upload when not logged in", async () => {
        mockSupabase(null);

        const request = uploadRequest({ file: icsFile(SAMPLE_ICS) });
        const formDataSpy = jest.spyOn(request, "formData");

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("You must be signed in to import a calendar.");
        expect(formDataSpy).not.toHaveBeenCalled();
    });

    it("rejects a file field sent as plain text", async () => {
        mockSupabase(user);
        const response = await POST(uploadRequest({ file: SAMPLE_ICS }));
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.error).toBe("No file provided");
    });

    it("rejects a file over 1 MB", async () => {
        mockSupabase(user);
        const response = await POST(uploadRequest({ file: icsFile(SAMPLE_ICS + "X".repeat(1_000_000)) }));
        const data = await response.json();
        expect(response.status).toBe(413);
        expect(data.error).toBe("File is too large");
    });

    it("rejects a file that is not a calendar", async () => {
        mockSupabase(user);
        const response = await POST(uploadRequest({ file: icsFile("course,time\nCS 320,10:00", "classes.csv") }));
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.error).toBe("Not a valid .ics file");
    });

    it("rejects a calendar with no events", async () => {
        mockSupabase(user);
        const response = await POST(uploadRequest({ file: icsFile("BEGIN:VCALENDAR\nEND:VCALENDAR") }));
        const data = await response.json();
        expect(response.status).toBe(422);
        expect(data.error).toBe("No events found in this file");
    });

    it("returns the parsed classes with the SPIRE padding removed", async () => {
        mockSupabase(user);

        const response = await POST(uploadRequest({ file: icsFile(SAMPLE_ICS), name: "Fall 2026" }));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.schedule).toEqual({ name: "Fall 2026" });
        expect(data.calendar.events).toHaveLength(2);
        expect(data.calendar.events[0]).toMatchObject({
            name: "COMPSCI 250-02 LEC(12119)",
            location: "Computer Science Labs E110",
            startDate: "2026-09-09",
            startTime: "10:10",
            endTime: "11:00",
            days: ["Monday", "Wednesday", "Friday"],
        });
        expect(data.calendar.events[1].location).toBe("Computer Science Bldg rm W150");
    });

    it("uses the typed name as the calendar name and that it istrimmed", async () => {
        mockSupabase(user);
        const response = await POST(uploadRequest({ file: icsFile(SAMPLE_ICS), name: "  Fall 2026  " }));
        const data = await response.json();
        expect(data.schedule.name).toBe("Fall 2026");
        expect(data.calendar.name).toBe("Fall 2026");
    });

    it("falls back to the file name when no name or a blank name is typed", async () => {
        mockSupabase(user);
        const noName = await (await POST(uploadRequest({ file: icsFile(SAMPLE_ICS, "My Classes.ICS") }))).json();
        const blankName = await (
            await POST(uploadRequest({ file: icsFile(SAMPLE_ICS, "spire.ics"), name: "   " }))
        ).json();
        expect(noName.schedule.name).toBe("My Classes");
        expect(blankName.schedule.name).toBe("spire");
    });

    it("gives every event a unique id and keeps ids already in the file", async () => {
        mockSupabase(user);
        const withUid = SAMPLE_ICS.replace("BEGIN:VEVENT", "BEGIN:VEVENT\nUID:abc123");
        const response = await POST(uploadRequest({ file: icsFile(withUid) }));
        const [first, second] = (await response.json()).calendar.events;
        expect(first.id).toBe("abc123");
        expect(second.id).toMatch(/@upath$/);
    });


    it("returns an error when Supabase fails", async () => {
        jest.mocked(createClient).mockRejectedValue(new Error("Supabase is down"));
        const response = await POST(uploadRequest({ file: icsFile(SAMPLE_ICS) }));
        const data = await response.json();
        expect(response.status).toBe(500);
        expect(data).toEqual({ error: "Failed to process ICS file", details: "Supabase is down" });
    });
});