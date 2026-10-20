# UPath

Team Atomic 320 Project Repo.

## Local Supabase database

Make sure Docker Desktop is running, then start the local Supabase services and apply
the migrations:

```powershell
npx supabase start
npx supabase migration up --local
```

If PostgreSQL command-line tools are installed and `psql` is on your `PATH`, connect
to the local database from PowerShell:

```powershell
psql <Database URL>
```

At the `postgres` prompt, use these `psql` commands to inspect the schema and data:

```sql
\dt public.*
\d public.profiles
SELECT * FROM public.profiles;
\q
```

`\q` exits the PostgreSQL prompt. Local tables will be empty until data is added.
To stop the local Supabase services when finished, run:

```powershell
npx supabase stop
```

To add changes to the local db:

```powershell
npx supabase migration new add_desc_here
```

Then add changes only to new sql file.

To alter tables in the local db:

```powershell
ALTER TABLE <table>
ADD COLUMN <column name> <type>;

ALTER TABLE <table>
DROP COLUMN <column name>;
```

To alter specific column in the local db:

```powershell
ALTER TABLE <table>
ALTER COLUMN <column name> <new type>;
```

## Seed mock data for local only:

Mock users, places, schedules, and such in `supabase/seeds/your_seed.sql`, register
it in `config.toml` under `db.seed`. To load them, start supabase like above.

```powershell
npx supabase start
npx supabase db reset
```

Login as user with `mock.alex@umass.edu`, `mock.sam@umass.edu`, `mock.jordan@umass.edu`
Password: `password123`
Never run seed against the remote project.