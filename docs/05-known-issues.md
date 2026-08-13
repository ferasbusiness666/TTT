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

- **Login can't be exercised until a staff account exists.** The auth flow is wired and the endpoint is confirmed working (a bad password returns "Invalid login credentials", not a config error), but there are zero users. To sign in, create one in Supabase → Authentication → Users → Add user (email + password, no public sign-up). Creating the *real* staff accounts is its own step in `07-next-steps.md`.

## Genuinely undecided (ask before deciding, don't assume)
- **Public "submit your story" page** for non-team members — raised early in planning, never explicitly confirmed or rejected. Don't build it without asking first.
- **Newsletter sending tool** — Resend vs. sending manually. Not urgent, doesn't block launch.

## Not yet verified
- **Mobile responsiveness** — the homepage hasn't been confirmed to look right on an actual phone yet. Check before launch; most readers will be on mobile.
