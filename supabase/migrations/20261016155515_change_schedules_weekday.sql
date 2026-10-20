-- --------------------------------------------------------------------------------
-- Changes:
-- --------------------------------------------------------------------------------
-- Let multiple schedules allocate for a day of the week.
-- Add a default option for one schedule of each day.
-- Add constraint so default can be only be true if it is a weekday schedule.
-- Add an partial index to block duplicate default in the same day.


ALTER TABLE public.schedules
ADD COLUMN is_default boolean NOT NULL DEFAULT false;

ALTER TABLE public.schedules
ADD CONSTRAINT default_on_weekday
CHECK (NOT is_default OR weekday IS NOT NULL);

CREATE UNIQUE INDEX one_default_per_weekday
ON public.schedules (uid, weekday)
WHERE (is_default = true);

-- Change schedule stops to events for better naming.
ALTER TABLE public.schedule_stops RENAME TO events;
ALTER INDEX public.schedule_stops_time_id RENAME TO events_time_id;
ALTER POLICY "own schedule stops" on public.events rename to "own events";

-- Add constraints for distance and duration to be nonnegative
ALTER TABLE public.route_cache
ADD CONSTRAINT nonnegative_distance
CHECK (distance_m >= 0 and distance_m < 'infinity'::double precision);

ALTER TABLE public.route_cache
ADD CONSTRAINT nonnegative_duration
CHECK (duration_s >= 0 and duration_s < 'infinity'::double precision);