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
