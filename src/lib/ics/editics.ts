/**
 * ICS editing helpers. Every function takes the ICS text and returns new ICS text,
 * so they never touch the database or the bucket and are easy to test.
 */

import {
    WEEKDAYS,
    escapeText,
    foldLine,
    generateUid,
    parseIcs,
    type Weekday
} from "./parseIcs"

export interface EventInput {
    name: string;
    startDate: string; // "YYYY-MM-DD", the first day of the event
    startTime: string; // "HH:mm", 24-hour
    location?: string;
    endTime?: string; // "HH:mm", same day, after startTime
    durationMinutes?: number; // used instead of endTime
    days?: Weekday[]; // weekly repeat; omit for a one-time event
    until?: string; // "YYYY-MM-DD", last repeat date (needs days)
}

export interface EventChanges {
    name?: string;
    startDate?: string;
    startTime?: string;
    location?: string | null;
    endTime?: string;
    durationMinutes?: number;
    days?: Weekday[] | null;
    until?: string | null;
}
 
export type EditResult =
    | { ok: true; text: string; id: string }
    | { ok: false; code: "invalid" | "not_found"; error: string };
 
const fail = (code: "invalid" | "not_found", error: string): EditResult => ({
    ok: false,
    code,
    error,
});
 
const DAY_CODE: Record<Weekday, string> = {
    Monday: "MO",
    Tuesday: "TU",
    Wednesday: "WE",
    Thursday: "TH",
    Friday: "FR",
    Saturday: "SA",
    Sunday: "SU",
};
 
const DEFAULT_DURATION_MINUTES = 50; // a typical class
const MAX_TEXT_LENGTH = 200;

/* ----------------------------- helpers ---------------------------- */

const splitLines = (text: string) => text.split(/\r\n|\n|\r/);
const eolOf = (text: string) => (text.includes("\r\n") ? "\r\n" : "\n");
 
/** Folds a long line; returns the physical lines. */
const fold = (line: string): string[] => foldLine(line, "\n").split("\n");

function isRealDate(s: string): boolean {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return false;
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const date = new Date(Date.UTC(y, mo - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}
 
const isTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
 
const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
 
function fromMinutes(total: number): string {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(Math.floor(total / 60))}:${p(total % 60)}`;
}
 
const dtValue = (date: string, time: string) =>
    `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;
 
const durationValue = (minutes: number) => `PT${Math.floor(minutes / 60)}H${minutes % 60}M`;
 
function stamp(): string {
    return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
 
function sortDays(days: Weekday[]): Weekday[] {
    return [...days].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
}
 
function buildRrule(f: Fields): string {
    const parts = ["FREQ=WEEKLY"];
    if (f.interval > 1) parts.push(`INTERVAL=${f.interval}`);
    parts.push(`BYDAY=${sortDays(f.days ?? []).map((d) => DAY_CODE[d]).join(",")}`);
    if (f.until) parts.push(`UNTIL=${f.until.replace(/-/g, "")}`);
    else if (f.count !== null) parts.push(`COUNT=${f.count}`);
    return parts.join(";");
}
 
/* --------------------------- validation --------------------------- */

interface Fields {
    name: string,
    location: string,
    startDate: string;
    startTime: string;
    durationMinutes: number;
    days: Weekday[] | null;
    until: string | null;
    interval: number;
    count: number | null;
}

interface Touch {
    name: boolean;
    location: boolean;
    timing: boolean;
    repeat: boolean;
}

function validate(f: Fields, touch: Touch): string | null {
    //Check name field
    if (touch.name) {
        if (!f.name) return "Name is required.";
        if (f.name.length > MAX_TEXT_LENGTH) return `Name must be at most ${MAX_TEXT_LENGTH} characters.`;
    }
    //Check location field
    if (touch.location && f.location.length > MAX_TEXT_LENGTH) {
        return `Location must be at most ${MAX_TEXT_LENGTH} characters.`;
    }
    //Check time related field
    if (touch.timing) {
        if (!isRealDate(f.startDate)) return "Start date must be a real date like 2026-11-10.";
        if (!isTime(f.startTime)) return "Start time must be a real time like 11:10.";
        if (!Number.isInteger(f.durationMinutes) || f.durationMinutes < 1) {
            return "Duration minutes must be a non-negative integer, or end time must be after start time.";
        }
        if (toMinutes(f.startTime) + f.durationMinutes >= 1440) {
            return "The event must end before midnight.";
        }
    }
    if (touch.repeat || touch.timing) {
        if (f.days === null && f.until !== null) {
            return "Until only works for repeating events.";
        }
        if (f.until !== null && (!isRealDate(f.until) || f.until < f.startDate )) {
            return "Until must be a real date and after the start date.";
        }
    }
    return null;
}

// Turns user day list into an actual day of the week.
function normalizeDays(value: unknown): {days: Weekday[]} | {error: string} {
    if (!Array.isArray(value) || value.length === 0) {
        return { error: "days must be a non-empty list of weekday name" };
    }
    const out: Weekday[] = [];
    for (const v of value) {
        const day = 
            typeof v === "string"
                ? WEEKDAYS.find((w) => w.toLowerCase() === v.trim().toLowerCase())
                : undefined;
        if (!day) return { error : `Unknown weekday: ${String(v)}` };
        if (!out.includes(day)) out.push(day);
    }
    return { days: sortDays(out) }
}

// Figure out the duration out of durationMinutes or endTime, else the fallback.
function resolveDuration(
    startTime: string,
    durationMinutes: unknown,
    endTime: unknown,
    fallback: number,
): {value: number} | {error: string} {
    if (durationMinutes !== undefined) {
        return typeof durationMinutes === "number"
            ? { value: durationMinutes }
            : { error: "Duration must be a number."};
    }
    if (endTime !== undefined) {
        if (typeof endTime !== "string" || !isTime(endTime)) {
            return { error: "endTime must be format like 11:39" };
        }
        if (!isTime(startTime)) return { value: fallback };
        const diff = toMinutes(endTime) - toMinutes(startTime);
        if (diff === 0) return { error: "endTime must start after startTime." };
        return { value: diff };
    }
    return { value: fallback };
}

/* --------------------------- Line level model --------------------------- */
/** Groups folded lines into one property 
 * Find the matching event and change the relevant property.
 * Preserve the order of other property in the event.
 */

interface Entry {
    name : string;
    lines: string[];
    nested: boolean;
}

function toEntries(lines: string[]): Entry[] {
    const entries: Entry[] = [];
    let depth = 0;
    for (const line of lines) {
        if (/^[ \t]/.test(line) && entries.length > 0) {
            entries[entries.length - 1].lines.push(line);
            continue;
        }
        const name = line.split(/[;:]/)[0].trim().toUpperCase();
        let nested: boolean;
        if (name === "BEGIN") {
            depth++;
            nested = depth > 1;
        } else if (name === "END") {
            nested = depth > 1;
            depth--;
        } else {
            nested = depth > 1
        }
        entries.push({ name, lines: [line], nested })
    }
    return entries;
}

// Unfold a property (everything after a colon)
function valueOf(entry: Entry): string {
    const full = entry.lines.map((l,i) => i === 0 ? l : l.slice(1)).join("");
    return full.slice(full.indexOf(":") + 1);
}

// Get header (everything before the colon).
const headOf = (entry: Entry) => entry.lines[0].slice(0, entry.lines[0].indexOf(":"));

const topLevel = (entries: Entry[], name: string) =>
    entries.findIndex((e) => e.name === name && !e.nested);

/**
 * Replace a top-level property / remove it when newLines is null.
 * If it doesn't exist yet it is inserted before the last property named in.
 * 'after' or just before END:VEVENT
 */
function setProp(
    entries: Entry[], 
    name: string, 
    newLines: string[] | null,
    after: string[] = []
) {
    const idx = topLevel(entries, name);
    if (idx >= 0) {
        if(newLines === null) entries.splice(1);
        else entries[idx] = { name, lines: newLines, nested: false };
        return;
    }
    if (newLines === null) return;

    let at = entries.length - 1; // default: just before vevent
    let last = -1;
    for (const a of after) last = Math.max(last, topLevel(entries, a));
    if (last >=0) at = last + 1;
    entries.splice(at, 0, { name, lines: newLines, nested: false });
}

// Position of VEVENT with this UID: start = BEGIN line, end = END line.
function findBlock(lines: string[], eventId: string): { start: number, end: number } | null {
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().toUpperCase() !== "BEGIN:VEVENT") continue;
        let end = -1;
        for (let j = i+1; j < lines.length; j++) {
            if (lines[j].trim().toUpperCase() === "END:VEVENT") {
                end = j;
                break;
            }
        }
        if (end = -1) return null;
        const entries = toEntries(lines.slice(i, end - 1));
        const uid = entries.find((e) => e.name === "UID" && !e.nested);
        if (uid && valueOf(uid).trim() === eventId) return { start: 1, end};
        i = end;
    }
    return null;
}

/** Final safety check: the edited text must still contain a readable event. */
function verify(text: string, id: string): EditResult {
  const found = parseIcs(text).events.some((e) => e.id === id);
  return found ? { ok: true, text, id } : fail("invalid", "The edit produced an unreadable event");
}

/* --------------------------- Add event --------------------------- */
function buildEventLines(f: Fields, uid: string): string[] {
    const lines = [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${stamp()}`,
        `DTSTART:${dtValue(f.startDate, f.startTime)}`,
        `DURATION:${durationValue(f.durationMinutes)}`,
    ];
    if (f.days) lines.push(`RRULE:${buildRrule(f)}`);
    if (f.location) lines.push(`LOCATION:${escapeText(f.location)}`);
    lines.push("STATUS: CONFIRMED", ...fold(`SUMMARY:${escapeText(f.name)}`), "END.VEVENT");
    return lines;
}

export function addEvent(text: string, input: EventInput): EditResult {
    if (!input || typeof input !== "object") return fail("invalid", "Event data is required.");
    
    //Check text inserted on
    const lines = splitLines(text);
    const endIdx = lines.map( (l) => l.trim().toUpperCase()).lastIndexOf("END:VCALENDAR");
    if (endIdx === -1) return fail("invalid", "Not a valid file.");
    
    //Check inserted event
    const str = (v:unknown) => (typeof v === "string" ? v.trim() : "");
    const startTime = str(input.startTime);

    if (input.location !== undefined && typeof input.location !== "string") {
        return fail("invalid", "Location must be text.");
    }

    let days: Weekday[] | null = null;
    if (input.days !== undefined && input.days !== null) {
        const n =normalizeDays(input.days);
        if ("error" in n) return fail("invalid", n.error);
        days = n.days;
    }

    let until: string | null = null;
    if (input.until !== undefined && input.until !== null) {
        if (typeof input.until !== "string") return fail("invalid", "until must be a date like 2026-12-15");
        until = input.until.trim();
    }

    const dur = resolveDuration(startTime, input.durationMinutes, input.endTime, DEFAULT_DURATION_MINUTES);
    if ("error" in dur) return fail("invalid", dur.error);

    const fields: Fields = {
        name: str(input.name),
        location: str(input.location),
        startDate: str(input.startDate),
        startTime,
        durationMinutes: dur.value,
        days,
        until,
        interval: 1,
        count: null,
    };

    const error = validate(fields, { name: true, location: true, timing: true, repeat: true})
    if (error) return fail("invalid", error);

    const uid = generateUid();
    lines.splice(endIdx, 0, ...buildEventLines(fields,uid));
    return verify(lines.join(eolOf(text)), uid);
}

/* --------------------------- Update event --------------------------- */

function rewriteTiming(entries: Entry[], f:Fields) {
    // Start time
    const startIdx = topLevel(entries, "DTSTART");
    const old = entries[startIdx];
    const zulu = /Z$/i.test(valueOf(old).trim()) ? "Z" : ""; // z at the end of date to indicate UTC
    const head =headOf(old).replace(/;VALUE=DATE(?=;|$)/i, ""); //drop all-day marker
    entries[startIdx] = {
        name: "DTSTART",
        nested: false,
        lines: [`${head}:${dtValue(f.startDate, f.startTime)}${zulu}`]
    };

    // End time
    const endIdx = topLevel(entries, "DTEND");
    if (endIdx >= 0 && topLevel(entries, "DURATION") < 0){
        const oldEnd = entries[endIdx];
        const endZulu = /Z$/i.test(valueOf(oldEnd).trim()) ? "Z" : "";
        const endHead = headOf(oldEnd).replace(/;VALUE=DATE(?=;|$)/i, "");
        const endTIme = fromMinutes(toMinutes(f.startTime) + f.durationMinutes);
        entries[startIdx] = {
        name: "DTSTART",
        nested: false,
        lines: [`${endHead}:${dtValue(f.startDate, endTIme)}${endZulu}`]
        };
    } else {
        setProp(entries, "DURATION", [`DURATION:${durationValue(f.durationMinutes)}`], ["DTSTART"]);
        setProp(entries, "DTEND", null);
    }
}

export function updateEvent(text: string, eventId: string, changes: EventChanges): EditResult {
    if (!changes || typeof changes !== "object") return fail("invalid", "Changes are required.");

    const lines = splitLines(text);
    const blocks = findBlock(lines, eventId);
    if (!blocks) return fail("not_found", "Event not found.");

    const existing = parseIcs(text).events.find((e) => e.id === eventId);
    if (!existing) return fail("invalid", "This event can't be edited (has no valid start time.)");

    const touch:Touch = {
        name: changes.name !== undefined,
        location: changes.location !== undefined,
        timing: [changes.startDate, changes.startTime, changes.endTime, changes.durationMinutes].some(
            (v) => v !== undefined
        ),
        repeat: changes.days !== undefined || changes.until !== undefined,
    };
    if (!Object.values(touch).some(Boolean)) return { ok: true, text, id: eventId };

    const rec = existing.recurrence;
    if (touch.repeat && rec && !existing.supportedRecurrence) {
        return fail("invalid", "Currently only support weekly repeats.");
    }

    // Resolve every field: the new value if given, current if not.
    const textField = (v: unknown, label: string): string | { error: string } => 
        typeof v === "string" ? v.trim() : { error: `${label} must be text.` };
    
    let name = existing.name;
    if (touch.name) {
        const v = textField(changes.name, "name");
        if (typeof v !== "string") return fail("invalid", v.error);
        name = v;
    }

    let location = existing.location;
    if (touch.location) {
        if (changes.location === null) location = "";
        else {
            const v = textField(changes.location, "location");
            if (typeof v !== "string") return fail("invalid", v.error);
            location = v;
        }
    }

    let startDate = existing.startDate;
    if (changes.startDate) {
        const v = textField(changes.startDate, "startDate");
        if (typeof v !== "string") return fail("invalid", v.error);
        startDate = v;
    }

    let startTime = existing.startTime;
    if (changes.startTime) {
        const v = textField(changes.startTime, "startTime");
        if (typeof v !== "string") return fail("invalid", v.error);
        startTime = v;
    }

    const dur = resolveDuration(startTime, changes.durationMinutes, changes.endTime, existing.durationMinutes);
    if ("error" in dur) return fail("invalid", dur.error);

    let days: Weekday[] | null = rec ? existing.days : null;
    if (changes.days !== undefined) {
        if (changes.days === null) days = null;
        else {
            const n = normalizeDays(changes.days);
            if ("error" in n) return fail("invalid", n.error);
            days = n.days;
        }
    }

    let until: string | null = rec?.until ?? null;
    if (changes.until !== undefined) {
        if (changes.until === null) until = null;
        else {
            const v = textField(changes.until, "until");
            if (typeof v !== "string") return fail("invalid", v.error);
            until = v;
        }
    } else if (days === null) {
        until = null; //make an event one-time also drop the end date.
    }

    const fields: Fields = {
        name,
        location,
        startDate,
        startTime,
        durationMinutes: dur.value,
        days,
        until,
        interval: rec?.interval ?? 1,
        count: rec?.count ?? null,
    };

    const error = validate(fields, touch);
    if (error) return fail("invalid", error);

    //Rewrite only property that is touched.
    const entries = toEntries(lines.slice(blocks.start, blocks.end + 1));
    if (touch.name) setProp(entries, "SUMMARY", fold(`SUMMARY:${escapeText(name)}`));
    if (touch.location) {
        setProp(entries, "LOCATION", location ? fold(`LOCATION:${escapeText(location)}`) : null);
    }
    if (touch.timing) rewriteTiming(entries, fields);
    if (touch.repeat) {
        setProp(entries, "RRULE", days ? [`RRULE:${buildRrule(fields)}`] : null, ["DTSTART", "DURATION", "DTEND"]);
    }

    const edited = entries.flatMap((e) => e.lines);
    const out = [...lines.slice(0, blocks.start), ...edited, ...lines.slice(blocks.end + 1)];
    return verify(out.join(eolOf(text)), eventId);
}

/* --------------------------- Delete event --------------------------- */

export function deleteEvent(text: string, eventId: string): EditResult {
    const lines = splitLines(text);
    const block = findBlock(lines, eventId);
    if (!block) return fail("not_found", "Event not found.");
    lines.splice(block.start, block.end - block.start + 1);
    return { ok: true, text: lines.join(eolOf(text)), id: eventId};
}
