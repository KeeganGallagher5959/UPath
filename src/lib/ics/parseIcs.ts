/**
 * ICS file parser.
 * No dependency.
 * Dates are "YYYY-MM-DD", times are 24 hours base "HH:mm", and weekday are fully written.
 */

export type Weekday = 
| "Monday" 
| "Tuesday"
| "Wednesday"
| "Thursday"
| "Friday"
| "Saturday"
| "Sunday"

export const WEEKDAYS: Weekday[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

/**
 * freq: weekly, daily,...
 * interval: default 1
 * byDay: empty if rule has no ByDay
 * until: YYYY-MM-DD, inclusive
 * raw: original RRULE text, to store or rewrite later.
 */
export interface Recurrence {
  freq: string,           
  interval: number,
  byDay: Weekday[];
  until: string | null;
  count: number | null;
  raw: string 
}

/**
 * name: full SUMMARY, e.g. "COMPSCI 250-01 LEC(12052)"
 * startDate: first occurrence, "YYYY-MM-DD"
 * start and end time: "HH:mm"
 * days: days of the week it occurs on
 * recurrence: null = one time event
 */
export interface IcsEvent {
  id: string;
  name: string;
  location: string;
  startDate: string; 
  startTime: string; 
  endTime: string; 
  durationMinutes: number;
  timezone: string | null;
  days: Weekday[]; //
  recurrence: Recurrence | null;
  supportedRecurrence: boolean; 
  status: string | null;
}

export interface ParsedCalendar {
  name: string | null;
  timezone: string | null;
  events: IcsEvent[];
}

/* ----------------------------- helpers ---------------------------- */

const BYDAY_MAP: Record<string, Weekday> = {
  MO: "Monday",
  TU: "Tuesday",
  WE: "Wednesday",
  TH: "Thursday",
  FR: "Friday",
  SA: "Saturday",
  SU: "Sunday",
};
 
const pad = (n: number) => String(n).padStart(2, "0");

/** Convert multi line event to one line. */
function unfold(text: string): string[] {
  return text
    .replace(/\r\n|\r/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n")
    .filter((l) => l.trim() !== "");
}

interface ContentLine {
  name: string;
  params: Record<string, string>;
  value: string;
}

function parseContentLine(line: string): ContentLine | null {
  const colon = line.indexOf(":");
  if (colon === -1) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [name, ...paramParts] = head.split(";");
  const params: Record<string, string> = {};
  for (const p of paramParts) {
    const eq = p.indexOf("=");
    if (eq !== -1) {
      params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, "");
    }
  }
  return { name: name.toUpperCase(), params, value };
}
 
function unescapeText(s: string): string {
  return s.replace(/\\[nN]/g, "\n").replace(/\\([,;\\])/g, "$1");
}

/** Unescapes ICS text, trims it, and removes the trailing "*" padding the school export adds. */
function cleanText(s: string): string {
  return unescapeText(s).trim().replace(/\s*\*$/, "").trim();
}

/** Parses time strings "20260909T132500", "20260909T132500Z" or "20260909". */
function parseDateTime(value: string): { date: string; time: string | null; isUtc: boolean } | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?Z?$/.exec(value.trim());
  if (!m) return null;
  return {
    date: `${m[1]}-${m[2]}-${m[3]}`,
    time: m[4] !== undefined ? `${m[4]}:${m[5]}` : null,
    isUtc: m[4] !== undefined && /Z$/i.test(value.trim()),
  };
}

/** Parses durations like "PT0H50M", "PT1H15M", "P1D", "P1W".*/
export function parseDuration(value: string): number | null {
  const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, w, d, h, min, s] = m.map((x) => (x === undefined ? 0 : Number(x))) as number[];
  return w * 7 * 1440 + d * 1440 + h * 60 + min + Math.round(s / 60);
}
 
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
 
function fromMinutes(total: number): string {
  const t = ((total % 1440) + 1440) % 1440;
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

const NEW_YORK_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function toNewYorkTime(instant: Date): { date: string; time: string } {
  const parts = NEW_YORK_TIME_FORMATTER.formatToParts(instant);
  const part = (type: string) => {
    const value = parts.find((item) => item.type === type)?.value;
    if (!value) throw new Error(`Missing ${type} when formatting New York time.`);
    return value;
  };
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

function utcTimestamp(date: string, time: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return Date.UTC(year, month - 1, day, hour, minute);
}

function convertUtcToNewYork(date: string, time: string): { date: string; time: string } {
  return toNewYorkTime(new Date(utcTimestamp(date, time)));
}
 
function dateToUtc(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
 
function utcToDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** 1 = Monday ... 7 = Sunday (internal running, for week math). */
function isoNumber(date: string): number {
  const d = dateToUtc(date).getUTCDay(); // 0 = Sunday
  return d === 0 ? 7 : d;
}
 
export function weekdayName(date: string): Weekday {
  return WEEKDAYS[isoNumber(date) - 1];
}

function shiftWeekday(day: Weekday, offset: number): Weekday {
  const index = WEEKDAYS.indexOf(day);
  return WEEKDAYS[((index + offset) % WEEKDAYS.length + WEEKDAYS.length) % WEEKDAYS.length];
}
 
function addDays(date: string, n: number): string {
  const d = dateToUtc(date);
  d.setUTCDate(d.getUTCDate() + n);
  return utcToDate(d);
}

/** Get Monday for the date of the start of the week */
function weekStart(date: string): string {
  return addDays(date, -(isoNumber(date) - 1));
}
 
function daysBetween(a: string, b: string): number {
  return Math.round((dateToUtc(b).getTime() - dateToUtc(a).getTime()) / 86_400_000);
}

/* ----------------------------- recurrence ---------------------------- */

/** Convert ics RRULE to object and save the original text.*/
export function parseRrule(raw: string) {
  const parts: Record<string ,string> = {};
  for (const piece of raw.replace(/^RRULE:/i, "").split(";")) {
    const eq = piece.indexOf("=");
    if (eq !== -1) parts[piece.slice(0, eq).toUpperCase()] = piece.slice(eq + 1);
  }

  const byDay: Weekday[] = (parts.BYDAY ?? "")
    .split(",")
    .map((d) => BYDAY_MAP[d.trim().toUpperCase().slice(-2)]) // drop number prefix if exist 1MO to MO
    .filter((d): d is Weekday => d !== undefined);
    
  const parsedUntil = parts.UNTIL ? parseDateTime(parts.UNTIL) : null;
  const until =
    parsedUntil?.isUtc && parsedUntil.time
      ? convertUtcToNewYork(parsedUntil.date, parsedUntil.time).date
      : parsedUntil?.date ?? null;

  return {
    freq: (parts.FREQ ?? "").toUpperCase(),
    interval: parts.INTERVAL ? Math.max(1, Number(parts.INTERVAL)) : 1,
    byDay,
    until,
    count: parts.COUNT ? Number(parts.COUNT) : null,
    raw: raw.replace(/^RRULE:/i, ""),
  }
}

/* ----------------------------- parser ---------------------------- */

export function parseIcs(text: string): ParsedCalendar {
  const lines = unfold(text);
    
  let calName : string | null = null;
  let calTimezone : string | null = null;
  const blocks : ContentLine[][] = [];
  let current : ContentLine[] | null = null;

  /** Detect start and end of an event, get the name and timezone, then save each to blocks.*/
  for (const line of lines) {
    const upper = line.trim().toUpperCase();
    if (upper === "BEGIN:VEVENT") {
      current = [];
      continue;
    }
    if (upper === "END:VEVENT") {
      if (current) blocks.push(current);
      current = null;
      continue;
    }
    const c1 = parseContentLine(line);
    if (!c1) continue;
    if (current) {
      current.push(c1);
    } else if (c1.name === "X-WR-CALNAME"){
      calName = cleanText(c1.value) || null;
    } else if (c1.name === "X-WR-TIMEZONE"){
      calTimezone = c1.value.trim() || null;
    }
  }

  const events: IcsEvent[] = [];
  /** Take start date/time, timezone, and duration of an event.*/
  for (const props of blocks) {
    const get = (n: string) => props.find ((p) => p.name === n);
    const dtstart = get("DTSTART");
    const parsedStart = dtstart ? parseDateTime(dtstart.value) : null;
    if (!parsedStart) continue; // can't place an event without a start date.

    const start = parsedStart.isUtc
      ? { ...parsedStart, ...convertUtcToNewYork(parsedStart.date, parsedStart.time ?? "00:00") }
      : parsedStart;
    const startTime = start.time ?? "00:00";
    const timezone = parsedStart.isUtc ? "America/New_York" : dtstart?.params.TZID ?? calTimezone;

    /** Duration: Get from DURATION, or dtstart - dtend. (our school ics use duration, but dtend here if they import from ggl calendar)*/
    let durationMinutes = 0;
    let endTime: string | null = null;
    const durProp = get("DURATION");
    const dtend = get("DTEND");
    if (durProp) {
      durationMinutes = parseDuration(durProp.value) ?? 0;
      if (parsedStart.isUtc) {
        const endInstant = new Date(
          utcTimestamp(parsedStart.date, parsedStart.time ?? "00:00") + durationMinutes * 60_000,
        );
        endTime = toNewYorkTime(endInstant).time;
      }
    } else if (dtend) {
      const parsedEnd = parseDateTime(dtend.value);
      if (parsedEnd) {
        const end = parsedEnd.isUtc
          ? { ...parsedEnd, ...convertUtcToNewYork(parsedEnd.date, parsedEnd.time ?? "00:00") }
          : parsedEnd;
        const normalizedEndTime = end.time ?? "00:00";
        durationMinutes =
          parsedStart.isUtc && parsedEnd.isUtc
            ? Math.round(
                (utcTimestamp(parsedEnd.date, parsedEnd.time ?? "00:00") -
                  utcTimestamp(parsedStart.date, parsedStart.time ?? "00:00")) /
                  60_000,
              )
            : daysBetween(start.date, end.date) * 1440 +
              toMinutes(normalizedEndTime) -
              toMinutes(startTime);
        if (parsedEnd.isUtc) endTime = normalizedEndTime;
      }
    }

    /** Recurrence: Get from RRULE.*/
    const rruleProp = get("RRULE");
    const recurrence = rruleProp ? parseRrule(rruleProp.value) : null;
    const supportedRecurrence = !recurrence || recurrence.freq === "WEEKLY";

    /** Day of the week: If exists in RRULE, sort by weekday, else convert date to weekday and save it.*/
    const dayShift = parsedStart.isUtc ? daysBetween(parsedStart.date, start.date) : 0;
    const days : Weekday[] =
      recurrence && recurrence.byDay.length > 0
        ? recurrence.byDay
            .map((day) => shiftWeekday(day, dayShift))
            .sort((a,b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b))
        : [weekdayName(start.date)];
    
    /** Event name: given by summary.*/
    const name = cleanText(get("SUMMARY")?.value ?? "");

    /** Push all event attributes to the list.*/
    events.push({
      id: get("UID")?.value.trim() || `${name}|${start.date}T${startTime}`,
      name,
      location: cleanText(get("LOCATION")?.value ?? ""),
      startDate: start.date,
      startTime,
      endTime: endTime ?? fromMinutes(toMinutes(startTime) + durationMinutes),
      durationMinutes,
      timezone,
      days,
      recurrence,
      supportedRecurrence,
      status: get("STATUS")?.value.trim() || null,
    });
  }

  return {name: calName, timezone: calTimezone, events};
}

/* ----------------------------- ics cleanup ---------------------------- */

/**
 * Remove all the leading space with star on every SUMMARY and LOCATION lines.
 */

export function stripTrailingStars(text: string) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r\n|\n|\r/);
  let prop = "";

  const out = lines.map((line, i) => {
    if ( line !== "" && !/^[ \t]/.test(line)) {
      prop = line.split(/[;:]/)[0].toUpperCase();
    }
    const nextIsContinuation = i + 1 < lines.length && /^[ \t]/.test(lines[i + 1]);
    if ((prop === "SUMMARY" || prop === "LOCATION") && !nextIsContinuation) {
      return line.replace(/[ \t]*\*$/, "");
    }
    return line;
  });
  return out.join(eol);
}

/* ----------------------------- change name ------------------------------- */
 
export function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n|\r/g, "\\n");
}
 
/** Folds a long line at 70 characters, as the ICS format asks (continuation lines start with a space). */
export function foldLine(line: string, eol: string): string {
  const chars = Array.from(line);
  if (chars.length <= 70) return line;
  const parts: string[] = [];
  for (let i = 0; i < chars.length; i += 70) parts.push(chars.slice(i, i + 70).join(""));
  return parts.join(eol + " ");
}
 
/**
 * Saves `name` in the file as the calendar name (X-WR-CALNAME), replacing any
 * existing one. Nothing else in the file changes. parseIcs reads it back as `calendar.name`.
 * If the text has no BEGIN:VCALENDAR it is returned unchanged.
 */
export function setCalendarName(text: string, name: string): string {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r\n|\n|\r/);
  const out: string[] = [];
  let inEvent = false;
  let skippingOld = false;
  let inserted = false;
 
  for (const line of lines) {
    if (skippingOld && /^[ \t]/.test(line)) continue; // folded rest of an old name
    skippingOld = false;
 
    const upper = line.trim().toUpperCase();
    if (upper === "BEGIN:VEVENT") inEvent = true;
    if (upper === "END:VEVENT") inEvent = false;
 
    if (!inEvent && /^X-WR-CALNAME[:;]/i.test(line)) {
      skippingOld = true;
      continue;
    }
 
    out.push(line);
    if (!inserted && upper === "BEGIN:VCALENDAR") {
      out.push(foldLine(`X-WR-CALNAME:${escapeText(name.trim())}`, eol));
      inserted = true;
    }
  }
  return inserted ? out.join(eol) : text;
}
 

/* ----------------------------- UIDs ---------------------------- */

export function generateUid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  const uuid =
    c?.randomUUID?.() ??
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
      const r = (Math.random() * 16) | 0;
      return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  return `${uuid}@upath`;
}

/**
 * Add a unique uid for every VEVENT that does not have one, and return a new ics text.
 * Events that have one are left alone, so safe to call again, though not recommend.
 * Line ending are preserved.
 */
export function ensureUids(text: string): {text: string, added: number} {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r\n|\n|\r/);
  const out: string[] = [];
  let added = 0;
  
  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i]);
    if (lines[i].trim().toUpperCase() !== "BEGIN:VEVENT") continue;

    let hasUid = false;
    for (let j = i+1; j < lines.length; j++) {
      if (lines[j].trim().toUpperCase() === "END:VEVENT") break;
      if (/^UID[:;]/i.test(lines[j])) {
        hasUid = true;
        break;
      }
    }
    if (!hasUid) {
      out.push(`UID:${generateUid()}`);
      added++;
    }
  }
  return { text: out.join(eol), added }
}

/* --------------------------------- occurrence ------------------------------------ */

/**
 * All dates (inclusive) that the event happens on.
 * Handle one-time event and WEEKLY recurrence rule (BYDAY, INTERVAL, UNTIL, COUNT).
 * Other type of frequency like MONTHLY return only the first occurrence.
 */
export function getOccurrences(event: IcsEvent, from: string, to: string): string[] {
  const r = event.recurrence;
  if (!r || !event.supportedRecurrence) {
    return event.startDate >= from && event.startDate <= to ? [event.startDate] : [];
  }

  const out: string[] = [];
  const last = r.until && r.until < to ? r.until : to;
  const firstWeek = weekStart(event.startDate);
  let seen = 0;

  // COUNT limits the whole series, so with COUNT we must count from the first date.
  let d = event.startDate;
  if (r.count === null && from > d) {
    d = weekStart(from);
    if (d < event.startDate) d = event.startDate; // never start before the event itself
  }

  const maxDays = 366 * 10; // safety limit to stop huge range over 10 years.
  for ( let i = 0; i < maxDays && d <= last; i++, d = addDays(d,1)) {
    if (!event.days.includes(weekdayName(d))) continue;
    const weeksApart = Math.floor(daysBetween(firstWeek, weekStart(d)) / 7);
    if (weeksApart % r.interval !== 0) continue;
    seen++;
    if (r.count !== null && seen > r.count) break;
    if (d >= from) out.push(d);
  }
  return out;
}

export const getOccurrence = getOccurrences;

export function occursOn(event: IcsEvent, date: string): boolean {
  return getOccurrences(event, date, date).length > 0;
}

/* --------------------------------- search ------------------------------------ */

export interface SearchOptions {
  /** Free text. Every word must match the event name or location. */
  query?: string;
  /** Weekday name(s), case-insensitive: "Monday" or ["monday", "friday"]. */
  day?: string | string[];
  /** Only events that occur on this "YYYY-MM-DD" date. */
  onDate?: string;
  /** Only events starting at or after this "HH:mm". */
  startsAfter?: string;
  /** Only events ending at or before this "HH:mm". */
  endsBefore?: string;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
 
export function searchEvents(events: IcsEvent[], opts: SearchOptions = {}): IcsEvent[] {
  const tokens = opts.query ? normalize(opts.query).split(" ").filter(Boolean) : [];
  const dayFilter =
    opts.day === undefined ? null : ([] as string[]).concat(opts.day).map((d) => d.toLowerCase());
 
  return events.filter((e) => {
    if (tokens.length > 0) {
      const haystack = normalize(`${e.name} ${e.location}`);
      if (!tokens.every((t) => haystack.includes(t))) return false;
    }
    if (dayFilter && !e.days.some((d) => dayFilter.includes(d.toLowerCase()))) return false;
    if (opts.onDate && !occursOn(e, opts.onDate)) return false;
    if (opts.startsAfter && e.startTime < opts.startsAfter) return false;
    if (opts.endsBefore && e.endTime > opts.endsBefore) return false;
    return true;
  });
}
 
/** Events for one date, sorted by start time. Handy for the day view. */
export function eventsOnDate(events: IcsEvent[], date: string): IcsEvent[] {
  return events.filter((e) => occursOn(e, date)).sort((a, b) => a.startTime.localeCompare(b.startTime));
}