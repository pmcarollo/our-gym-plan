# Supabase setup

1. In Supabase, open SQL Editor and run `supabase/schema.sql`.
2. In Project Settings > Edge Functions > Secrets, add:
   - `GYM_PIN`: your shared passcode (choose one privately; don't put it in GitHub or chat).
   - `GYM_TOKEN_SECRET`: a long random secret (32+ characters).
3. Deploy the Edge Function in `supabase/functions/gym-api/index.ts` named `gym-api`.
   It requires the standard `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` function secrets, which Supabase provides to Edge Functions by default.
4. Set GitHub repository Actions variables:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = your publishable key
5. GitHub Pages rebuilds on each push to main.

Security design:
- The browser never receives the service-role key or the PIN.
- The Edge Function validates the PIN and issues a signed, 30-day device token.
- App data is accessed only through that Edge Function. The database table has RLS enabled and no public policies.
- The token is stored per browser/device. Clearing site data or using another browser requires passcode entry again.

The app should call the Edge Function for every load/save. Do not access `gym_data` directly from the browser.