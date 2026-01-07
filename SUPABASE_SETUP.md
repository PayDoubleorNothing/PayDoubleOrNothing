# Supabase Setup Instructions

## 1. Create Tables in Supabase

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Copy and paste the contents of `supabase-setup.sql`
5. Click **Run** to execute the SQL

This will create:
- `global_stats` table - stores total bets, wins, losses
- `game_history` table - stores individual game results

## 2. Get Your Supabase Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **Keep this secret!**

## 3. Add Environment Variables

### Local Development (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Netlify:
1. Go to your site → **Site configuration** → **Environment variables**
2. Add all three variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (mark as **Sensitive**)

## 4. Test

After deployment, check:
- Stats should load on page load
- After playing a game, stats should update globally
- All users should see the same stats

## Security Notes

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe to expose (public)
- `SUPABASE_SERVICE_ROLE_KEY` must be kept secret (server-side only)
- RLS (Row Level Security) is enabled - public can read, only service role can write
