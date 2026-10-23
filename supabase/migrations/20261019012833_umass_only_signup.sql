-- Restrict accounts to @umass.edu email address
-- Run inside psql so it still enforces even when it somehow bypass frontend.

CREATE FUNCTION public.enforce_umass_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF new.email IS NULL OR LOWER(new.email) !~ '^[^@]+@umass\.edu$' THEN
        RAISE EXCEPTION 'Only UMass email address are allowed'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN new;
END;
$$;

-- Block sign-ups with other domains:

CREATE TRIGGER enforce_umass_email_insert
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.enforce_umass_email();

-- Block changing existing UMass email to other form of email

CREATE TRIGGER enforce_umass_email_update
    BEFORE UPDATE OF email ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.enforce_umass_email();
