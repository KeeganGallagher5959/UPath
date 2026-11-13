import {
  parseIcs,
  parseDuration,
  ensureUids,
  stripTrailingStars,
  searchEvents,
  getOccurrences,
  eventsOnDate,
  setCalendarName,
} from "../src/lib/ics/parseIcs";
 
const SAMPLE = `BEGIN:VCALENDAR
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Work
X-WR-TIMEZONE:America/New_York
X-WR-CALDESC:
BEGIN:VEVENT
DTSTART:20260909T132500
DURATION:PT0H50M
RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261215
LOCATION:Computer Science Labs E110   *
STATUS:CONFIRMED
SUMMARY:COMPSCI 250-01 LEC(12052)      *
END:VEVENT
BEGIN:VEVENT
DTSTART:20260909T122000
DURATION:PT0H50M
RRULE:FREQ=WEEKLY;BYDAY=WE;UNTIL=20261215
LOCATION:Marston Hall room 220        *
STATUS:CONFIRMED
SUMMARY:COMPSCI 250-99AC DIS(19944)    *
END:VEVENT
BEGIN:VEVENT
DTSTART:20260908T143000
DURATION:PT3H0M
RRULE:FREQ=WEEKLY;BYDAY=TU;UNTIL=20261215
LOCATION:Integrated Science Labs155-165
STATUS:CONFIRMED
SUMMARY:CHEM 112-99LM LAB(11301)       *
END:VEVENT
BEGIN:VEVENT
DTSTART:20260924T100000
DURATION:PT1H15M
RRULE:FREQ=WEEKLY;BYDAY=TH;UNTIL=20260924
LOCATION:Computer Science Bldg rm W150*
STATUS:CONFIRMED
SUMMARY:COMPSCI 320-01 LEC(12056)      *
END:VEVENT
END:VCALENDAR`;
 
describe("helpers", () => {
  it("parses durations", () => {
    expect(parseDuration("PT0H50M")).toBe(50);
    expect(parseDuration("PT1H15M")).toBe(75);
    expect(parseDuration("PT3H0M")).toBe(180);
    expect(parseDuration("garbage")).toBeNull();
  });
 
});
 
describe("parseIcs", () => {
  const cal = parseIcs(SAMPLE);
 
  it("reads calendar metadata", () => {
    expect(cal.name).toBe("Work");
    expect(cal.timezone).toBe("America/New_York");
    expect(cal.events).toHaveLength(4);
  });
 
  it("extracts fields and cleans the padding", () => {
    const e = cal.events[0];
    expect(e.name).toBe("COMPSCI 250-01 LEC(12052)");
    expect(e.location).toBe("Computer Science Labs E110");
    expect(e.startDate).toBe("2026-09-09");
    expect(e.startTime).toBe("13:25");
    expect(e.endTime).toBe("14:15");
    expect(e.days).toEqual(["Monday", "Wednesday", "Friday"]);
    expect(e.recurrence?.until).toBe("2026-12-15");
    expect(e.recurrence?.raw).toBe("FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261215");
  });
 
  it("handles a trailing * with no space", () => {
    expect(cal.events[3].location).toBe("Computer Science Bldg rm W150");
  });
 
  it("handles unfolded long lines", () => {
    const folded = SAMPLE.replace("SUMMARY:COMPSCI 250-01", "SUMMARY:COMPSCI\r\n  250-01");
    expect(parseIcs(folded).events[0].name).toBe("COMPSCI 250-01 LEC(12052)");
  });

  it("converts UTC event times to New York time and leaves local times unchanged", () => {
    const calendar = parseIcs(`BEGIN:VCALENDAR
X-WR-TIMEZONE:America/New_York
BEGIN:VEVENT
DTSTART:20260115T140000Z
DURATION:PT1H
SUMMARY:Winter UTC event
END:VEVENT
BEGIN:VEVENT
DTSTART:20260715T140000Z
DURATION:PT1H
SUMMARY:Summer UTC event
END:VEVENT
BEGIN:VEVENT
DTSTART:20260308T063000Z
DURATION:PT1H
SUMMARY:DST transition event
END:VEVENT
BEGIN:VEVENT
DTSTART:20260715T140000
DURATION:PT1H
SUMMARY:Local event
END:VEVENT
END:VCALENDAR`);

    expect(calendar.events.map(({ startDate, startTime, endTime, timezone }) => ({
      startDate,
      startTime,
      endTime,
      timezone,
    }))).toEqual([
      { startDate: "2026-01-15", startTime: "09:00", endTime: "10:00", timezone: "America/New_York" },
      { startDate: "2026-07-15", startTime: "10:00", endTime: "11:00", timezone: "America/New_York" },
      { startDate: "2026-03-08", startTime: "01:30", endTime: "03:30", timezone: "America/New_York" },
      { startDate: "2026-07-15", startTime: "14:00", endTime: "15:00", timezone: "America/New_York" },
    ]);
  });
});
 
describe("occurrences", () => {
  const { events } = parseIcs(SAMPLE);
  const [cs250, , chemLab, cs320] = events;
 
  it("expands weekly BYDAY rules", () => {
    const dates = getOccurrences(cs250, "2026-09-07", "2026-09-14");
    expect(dates).toEqual(["2026-09-09", "2026-09-11", "2026-09-14"]);
  });
 
  it("includes UNTIL date and stops after", () => {
    expect(getOccurrences(chemLab, "2026-12-15", "2026-12-31")).toEqual(["2026-12-15"]);
  });
 
  it("treats UNTIL == DTSTART as a single occurrence", () => {
    expect(getOccurrences(cs320, "2026-09-01", "2026-12-31")).toEqual(["2026-09-24"]);
  });
 
  it("returns a sorted day view", () => {
    const day = eventsOnDate(events, "2026-09-09");
    expect(day.map((e) => e.startTime)).toEqual(["12:20", "13:25"]);
  });
});
 
describe("searchEvents", () => {
  const { events } = parseIcs(SAMPLE);
 
  it("searches by course, location, and type", () => {
    expect(searchEvents(events, { query: "compsci 250" })).toHaveLength(2);
    expect(searchEvents(events, { query: "marston" })).toHaveLength(1);
    expect(searchEvents(events, { query: "lab" })).toHaveLength(2); // CS Labs + CHEM LAB
  });
 
  it("filters by weekday and date", () => {
    expect(searchEvents(events, { day: "tuesday" }).map((e) => e.name)).toEqual(["CHEM 112-99LM LAB(11301)"]);
    expect(searchEvents(events, { onDate: "2026-09-24" })).toHaveLength(1);
  });
 
  it("combines query and time filter", () => {
    const r = searchEvents(events, { query: "compsci", startsAfter: "13:00" });
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe("COMPSCI 250-01 LEC(12052)");
  });
});
 
describe("ensureUids", () => {
  it("adds a unique UID to every event without one", () => {
    const { text, added } = ensureUids(SAMPLE);
    expect(added).toBe(4);
    const events = parseIcs(text).events;
    const ids = events.map((e) => e.id);
    expect(new Set(ids).size).toBe(4);
    ids.forEach((id) => expect(id).toMatch(/@upath$/));
  });
 
  it("is safe to run twice and keeps existing UIDs", () => {
    const once = ensureUids(SAMPLE).text;
    const twice = ensureUids(once);
    expect(twice.added).toBe(0);
    expect(twice.text).toBe(once);
  });
 
  it("does not change event data or CRLF line endings", () => {
    const crlf = SAMPLE.replace(/\n/g, "\r\n");
    const { text } = ensureUids(crlf);
    expect(text).toContain("\r\n");
    expect(text).not.toMatch(/[^\r]\n/);
    expect(parseIcs(text).events[0].name).toBe("COMPSCI 250-01 LEC(12052)");
  });
});
 
describe("stripTrailingStars", () => {
  it("removes stars from SUMMARY and LOCATION only", () => {
    const out = stripTrailingStars(SAMPLE);
    expect(out).toContain("SUMMARY:COMPSCI 250-01 LEC(12052)\n");
    expect(out).toContain("LOCATION:Computer Science Bldg rm W150\n");
    expect(out).not.toMatch(/\*\s*$/m);
    expect(out).toContain("X-WR-CALNAME:Work");
  });
 
  it("keeps a star that is not at the end of the line", () => {
    const out = stripTrailingStars("BEGIN:VEVENT\nSUMMARY:A*B\nEND:VEVENT");
    expect(out).toContain("SUMMARY:A*B");
  });
 
  it("handles folded lines and CRLF", () => {
    const out = stripTrailingStars("SUMMARY:COMPSCI\r\n  250   *\r\nLOCATION:Hall *\r\n");
    expect(out).toBe("SUMMARY:COMPSCI\r\n  250\r\nLOCATION:Hall\r\n");
  });
});

describe("setCalendarName", () => {
  it("replaces the existing calendar name", () => {
    const out = setCalendarName(SAMPLE, "Fall 2026");
    expect(out).toContain("X-WR-CALNAME:Fall 2026");
    expect(out).not.toContain("X-WR-CALNAME:Work");
    expect(parseIcs(out).name).toBe("Fall 2026");
    expect(parseIcs(out).events).toHaveLength(4);
  });
 
  it("adds the name when the file has none", () => {
    const noName = SAMPLE.replace("X-WR-CALNAME:Work\n", "");
    expect(parseIcs(setCalendarName(noName, "My Plan")).name).toBe("My Plan");
  });
 
  it("escapes special characters and round-trips them", () => {
    const out = setCalendarName(SAMPLE, "Fall, 2026; Plan");
    expect(out).toContain("X-WR-CALNAME:Fall\\, 2026\\; Plan");
    expect(parseIcs(out).name).toBe("Fall, 2026; Plan");
  });
 
  it("folds a long name and still reads it back", () => {
    const long = "A".repeat(150);
    const out = setCalendarName(SAMPLE, long);
    expect(parseIcs(out).name).toBe(long);
  });
 
  it("only touches the calendar name, not event lines", () => {
    const out = setCalendarName(SAMPLE, "Z");
    expect(out.replace(/X-WR-CALNAME:.*\n/, "")).toBe(SAMPLE.replace(/X-WR-CALNAME:.*\n/, ""));
  });
});