# UPath

Team Atomic 320 Project Repo.

## Local Supabase database

Make sure Docker Desktop is running, then start the local Supabase services and apply
the migrations:

```powershell
npx supabase start
npx supabase migration up --local
```
To open local Supabase studio for dashboard, follows the [Development Tools] Studio URL.

To stop the local Supabase services when finished, run:

```powershell
npx supabase stop
```

To add changes to the schema:

```powershell
npx supabase migration new add_desc_here
```

Then add changes only to new sql file.

## Local app dev's server
Make sure a '.env.local' is in project root.

```powershell
NEXT_PUBLIC_SUPABASE_URL=<API URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key>
```

Start local Supabase, then run:

```powershell
npm run dev
```

Do `Ctrl + C` on its terminal to stop the app.