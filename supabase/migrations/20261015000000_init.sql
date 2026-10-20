-- Initial Schema: Profiles, Locations, and Schedules

-- --------------------------------------------------------------------------------
-- Profiles:
-- --------------------------------------------------------------------------------
-- + UID: take value from Auth table.
-- + Username: Should set automatically after sign up, unique.
-- + Theme: Light or Dark
-- + Mode: Mode of transport, include foot, bike, car, and bus.
-- + Access: Accessibility, being boolean for now.

CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    username text NOT NULL UNIQUE CHECK (username <> ''),
    theme text NOT NULL DEFAULT 'system',
    mode text NOT NULL DEFAULT 'foot',
    access boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (theme IN ('light', 'dark', 'system')),
    CHECK (mode IN ('foot', 'bike', 'car', 'bus'))
);

-- + Create profile if new (when Auth updated)
CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles(id, username)
    VALUES (NEW.id, lower(split_part(NEW.email, '@', 1)));
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --------------------------------------------------------------------------------
-- Location: Based on Coordinates
-- --------------------------------------------------------------------------------
-- + ID: PKey for each Loc
-- + UID: Reference user who can edit it, also cascade delete
-- + Name: Location Name
-- + Address: Yes
-- + Lat: Latitude
-- + Long: Longitude

CREATE TABLE public.locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    uid uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 150),
    address text CHECK (address IS null OR char_length(btrim(address)) <= 300),
    lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
    long double precision NOT NULL CHECK (long BETWEEN -180 AND 180),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX locations_uid ON public.locations (uid);

-- --------------------------------------------------------------------------------
-- Schedule: A plan for a day with collection of stops, a profile can have many schedule
-- --------------------------------------------------------------------------------
-- + ID: PKey for Schedule
-- + UID: Reference user who can edit it, also cascade delete
-- + Name: Schedule Name
-- + Note: Optional description
-- + Weekday: If the schedule is for each day of the week

CREATE TABLE public.schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    uid uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 150),
    note text CHECK (note IS null OR char_length(btrim(note)) <= 2000),
    weekday smallint CHECK (weekday BETWEEN 1 AND 7),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX schedules_uid_weekday ON public.schedules (uid, weekday);

-- Get new update time for changes in schedules
CREATE FUNCTION public.get_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER schedules_set_updated_at
BEFORE UPDATE ON public.schedules
FOR EACH ROW
WHEN (old.* IS DISTINCT FROM new.*)
EXECUTE FUNCTION public.get_updated_at();

-- --------------------------------------------------------------------------------
-- Schedule Stops: The collection of locations in a schedule.
-- --------------------------------------------------------------------------------
-- The same locations can be repeated, like return to dorm.
-- + ID: PKey for Stops
-- + SID: Refers Schedule ID
-- + LID: Refers Location ID
-- + Name: Short Name
-- + Start Time: Local Campus Time.
-- + End Time: Local Campus Time.
-- + Note: Optional description

CREATE TABLE public.schedule_stops (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id uuid NOT NULL REFERENCES public.schedules (
        id
    ) ON DELETE CASCADE,
    location_id uuid NOT NULL REFERENCES public.locations (
        id
    ) ON DELETE CASCADE,
    name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 150),
    start_time time NOT NULL,
    end_time time NOT NULL,
    note text CHECK (note IS null OR char_length(btrim(note)) <= 2000),
    CHECK (end_time > start_time)
);

CREATE INDEX schedule_stops_time_id
ON public.schedule_stops (schedule_id, start_time, end_time);

-- --------------------------------------------------------------------------------
-- Route Cache: Saved Open Route Service results between two stops.
-- --------------------------------------------------------------------------------
-- Store the time gap to check if it's enough for another stop.
-- Can't be written by user.
-- + ID: PKey
-- + Origin Loc ID: Origin, refers location id
-- + Dest Loc ID: Destination, refers location id
-- + Mode: Mode of transport
-- + Duration: Time gap, in second.
-- + Distance: In metres/ might change to mile cause American
-- + Unique set of origin, destination, and mode so no repetition

CREATE TABLE public.route_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_loc_id uuid NOT NULL REFERENCES public.locations (
        id
    ) ON DELETE CASCADE,
    dest_loc_id uuid NOT NULL REFERENCES public.locations (
        id
    ) ON DELETE CASCADE,
    mode text NOT NULL CHECK (mode IN ('foot', 'bike', 'car', 'bus')),
    duration_s double precision NOT NULL,
    distance_m double precision NOT NULL,
    fetched_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (origin_loc_id, dest_loc_id, mode)
);

CREATE INDEX route_cache_dest_id ON public.route_cache (dest_loc_id);

-- --------------------------------------------------------------------------------
-- Row Level Security
-- --------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_cache ENABLE ROW LEVEL SECURITY;

-- Profiles:
-- Created and delete by signup trigger and auth user
-- User can read and update their own row.
-- User can change preferences only

CREATE POLICY "read own profile" ON public.profiles
FOR SELECT
USING (id = (SELECT auth.uid()));

CREATE POLICY "update own profile" ON public.profiles
FOR UPDATE
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (theme, mode, access) ON public.profiles TO authenticated;

-- Locations:
-- User can see, edit, or delete their own row.

CREATE POLICY "own location" ON public.locations
FOR ALL
USING (uid = (SELECT auth.uid()))
WITH CHECK (uid = (SELECT auth.uid()));

-- Schedules:
-- User can see, edit, or delete their own row.

CREATE POLICY "own schedule" ON public.schedules
FOR ALL
USING (uid = (SELECT auth.uid()))
WITH CHECK (uid = (SELECT auth.uid()));

-- Schedule Stops
-- User can see, edit, or delete their own row.
-- Check Ownership through the schedule and location as there're no user id.

CREATE POLICY "own schedule stops" ON public.schedule_stops
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.schedules AS s
        WHERE s.id = public.schedule_stops.schedule_id
            AND s.uid = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.schedules AS s
        WHERE s.id = public.schedule_stops.schedule_id
            AND s.uid = (SELECT auth.uid())
    )
    AND EXISTS (
        SELECT 1
        FROM public.locations AS l
        WHERE l.id = public.schedule_stops.location_id
            AND l.uid = (SELECT auth.uid())
    )
);

-- Route Cache
-- User can read cached routes between their own locations.
-- User can't write
CREATE POLICY "read own route cache" ON public.route_cache
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.locations AS l
        WHERE l.id = public.route_cache.origin_loc_id
            AND l.uid = (SELECT auth.uid())
    )
    AND EXISTS (
        SELECT 1
        FROM public.locations AS l
        WHERE l.id = public.route_cache.dest_loc_id
            AND l.uid = (SELECT auth.uid())
    )
);
