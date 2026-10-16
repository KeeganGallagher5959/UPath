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