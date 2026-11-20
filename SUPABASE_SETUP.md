# Supabase setup

## 1. Create the private table
In Supabase, open SQL Editor, paste and run the contents of `supabase/schema.sql`.

## 2. Add Edge Function secrets
In Supabase > Edge Functions > Secrets, add:
- `GYM_PIN`: your shared passcode. Choose one privately; don't put it in GitHub or chat.
- `GYM_TOKEN_SECRET`: a long random secret (at least 32 characters).

Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions automatically. Never put the service-role key in GitHub or the browser.

## 3. Deploy the Edge Function
Create a function named `gym-api` in Supabase > Edge Functions. Copy in `supabase/functions/gym-api/index.ts` and deploy it.

The repo includes `supabase/config.toml` to disable Supabase's built-in JWT check for this one function. The function validates its own signed 30-day device token instead. Keep the custom token validation in place.

## 4. Configure GitHub Pages build variables
In GitHub > Settings > Secrets and variables > Actions > Variables, add:
- `VITE_SUPABASE_URL` = your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` = your Supabase publishable key

These two values are designed for browser use. Do not add a service-role key here.

## 5. Turn on GitHub Pages
In GitHub > Settings > Pages, set the build source to **GitHub Actions**. A push to `main` then builds and deploys the app.

## Security model
- The browser never receives the service-role key or the PIN.
- The Edge Function validates the PIN and issues a signed, 30-day device token.
- App data is accessed only through that Edge Function. The database table has RLS enabled and no public policies.
- The token is stored per browser/device. Clearing site data or using another browser requires passcode entry again.

The app must call the Edge Function for every load/save. Do not access `gym_data` directly from the browser.