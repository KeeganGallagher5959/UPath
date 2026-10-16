-- --------------------------------------------------------------------------------
-- Grants: Table permission
-- --------------------------------------------------------------------------------

-- An action only succeed when both RLS and grant allow it

-- Revoke default public Grants
REVOKE ALL ON TABLE
    public.profiles, public.locations, public.schedules,
    public.schedule_stops, public.route_cache
FROM anon, authenticated;

-- Profiles: User can change preferences only.
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE(theme, mode, access) on public.profiles TO authenticated;

-- Locations: User can any column.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;

-- Schedules: User can any column.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedules TO authenticated;

-- Schedule Stops: User can any column.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_stops TO authenticated;

-- Route Cache: User can only read the columns.
GRANT SELECT ON public.route_cache TO authenticated;

-- Allow API calls' access.
GRANT ALL ON TABLE
    public.profiles, public.locations, public.schedules,
    public.schedule_stops, public.route_cache
TO service_role;
