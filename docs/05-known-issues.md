# Known Issues & Open Questions

## Open bugs
- **Data API can't read/write any table yet — missing table-level GRANTs.** (Found 2026-08-13 while wiring login.) The RLS *policies* from `04-database-schema.md` are all in place, but the underlying Postgres `GRANT`s to the `anon` / `authenticated` roles were never applied, so PostgREST rejects every query with `42501 permission denied for table …`. This is exactly the gotcha flagged in `04-database-schema.md` → Notes ("Data API access"). It does **not** affect login (Supabase Auth uses a separate endpoint, confirmed working), but it **blocks** public post reads, the 4 card templates, the subscribe box, and the admin post list. Fix as the first move of the next data-wiring step, e.g.:
  ```sql
  grant select on public.posts, public.categories, public.profiles, public.post_media to anon, authenticated;
  grant insert on public.subscribers to anon, authenticated;
  grant insert, update, delete on public.posts, public.post_media, public.categories to authenticated;
  grant select on public.subscribers to authenticated;
  -- (RLS still governs which *rows* each role actually sees/changes)
  ```
  Apply via a migration (`supabase migration new grant_data_api_access`), not the SQL editor, to keep history clean.

- **Signed-in user's name is hardcoded, not real.** After login, the admin sidebar still shows `Liya G. Tadele / Editor-in-Chief` (and the editor byline shows `By Liya G. Tadele`) no matter who signed in — these are leftover placeholder strings from the mockup, not the actual account. Fix later by reading the logged-in user's `full_name` from the `profiles` table (and the `LT` avatar initials with it). Profile rows now exist for every user (see resolved item below), so this is only blocked on the Data API GRANT fix above. Confirmed by Fero during login testing, 2026-08-13. (Touchpoints: `admin.html` sidebar `.admin-user`, `editor.html` `.editor-metaline`.)

- **Leaked-password protection is OFF.** Supabase's HaveIBeenPwned check for compromised passwords is disabled — enable it in Auth settings before launch (one toggle). Low urgency for a handful of staff accounts, but free to turn on. Added to the security checklist in `07-next-steps.md`.

## Resolved
- **New auth users had no `profiles` row.** (Reported by Fero, fixed 2026-08-13.) Adding a user in the Supabase Auth dashboard didn't create a `profiles` row, despite the schema describing profiles as mirroring `auth.users` — the auto-create trigger was simply never written. Added `public.handle_new_user()` + `on_auth_user_created` trigger (migration `create_profile_on_signup`), backfilled existing users, and documented it in `04-database-schema.md`. New users now get a profile automatically; set `full_name` in the Auth metadata to control the display name (otherwise it falls back to email).
- **Login can't be exercised until a staff account exists.** The auth flow is wired and the endpoint is confirmed working (a bad password returns "Invalid login credentials", not a config error), but there are zero users. To sign in, create one in Supabase → Authentication → Users → Add user (email + password, no public sign-up). Creating the *real* staff accounts is its own step in `07-next-steps.md`.

## Genuinely undecided (ask before deciding, don't assume)
- **Public "submit your story" page** for non-team members — raised early in planning, never explicitly confirmed or rejected. Don't build it without asking first.
- **Newsletter sending tool** — Resend vs. sending manually. Not urgent, doesn't block launch.

## Not yet verified
- **Mobile responsiveness** — the homepage hasn't been confirmed to look right on an actual phone yet. Check before launch; most readers will be on mobile.
