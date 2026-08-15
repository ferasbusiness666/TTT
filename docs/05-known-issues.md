# Known Issues & Open Questions

## Open bugs
- **Mobile header/layout is broken (reported by Fero with screenshots, 2026-08-15).** Confirmed on a real phone — this supersedes the old "mobile not yet verified" note. Specific symptoms:
  1. **Wordmark is clipped.** "TADELE TEEN TALKS" is cut off along the bottom — the "TALKS" line is sliced in half — even when the header is in its full (expanded, un-scrolled) state. Looks like a fixed header height that the stacked three-line wordmark overflows.
  2. **Search control is missing entirely** on phone width. `assets/ttt.js` has a mobile branch that turns the search into a round icon which expands on tap, so either the icon is being hidden or it's collapsing to zero width.
  3. **Large dead gap above the category tabs** — a big band of empty background sits between the masthead and the ALL/ARTICLES/VIDEOS row.
  4. **Header misbehaves on scroll.** The compact-on-scroll state (`is-compact`, toggled at 120px down / 10px up) doesn't settle correctly on mobile: the nav row detaches and the spacing jumps.

  Where to look: the homepage builds its own masthead from the inline `<style>` block in `index.html`, while every other page gets one from `assets/ttt.css` + `assets/ttt.js` — so both need checking, and a fix in one place won't necessarily fix the other. This is a **visual** fix, so it's explicitly authorised: Fero asked for it. Everything else stays untouched. Most TTT readers will be on a phone, so this blocks launch.

## Decided / accepted (not going to fix)
- **Leaked-password protection stays off — it's Pro-plan only.** Supabase's HaveIBeenPwned check requires the Pro plan; this project is on the free plan, so the toggle isn't available. Accepted: accounts are admin-created for a small, fixed staff and use strong passwords, so credential-stuffing risk is low. Revisit only if the project moves to Pro. (This is the sole remaining security-advisor warning, and it's expected.)

## Open questions
- **Setting a staff member's display name.** The Supabase "Add user" quick-create dialog only asks for email + password — no metadata field — so `full_name` isn't set at creation and the profile falls back to the email (which is what then shows in the admin UI). Two ways to give an account a real name: (a) open the user in Auth → *User Metadata* and add `full_name` (if that view is reachable), or (b) just set it straight on the `profiles` row (`update public.profiles set full_name = '…' where id = '…'`) — which Claude can do on request. Decide a convention when the real staff accounts get made.

## Resolved
- **Publish required two clicks.** (Fixed 2026-08-14.) The editor's "unsaved changes" timer overwrote the status text to "Draft · saved" after a publish, and nothing blocked a second click mid-save. `savePost` is now single-flight (buttons disabled during the request, timer cancelled); one click on Publish saves *and* publishes.
- **Topical category picker.** (Done minimally 2026-08-14.) Seeded the `categories` table and added a second small dropdown in the editor (Type stays separate). Posts now store `category_id`. A richer taxonomy UI can come later if wanted, but the basic picker works.
- **Public sign-up was enabled on a staff-only site.** (Found + fixed 2026-08-13.) The security audit showed the Auth signup endpoint was open — anyone with the public key could create an account. Fero disabled "Allow new users to sign up" in the dashboard; verified the signup API now returns `signup_disabled` / "Signups not allowed for this instance".
- **Data API returned `42501 permission denied` on every table — missing GRANTs.** (Found 2026-08-13 wiring login; fixed same day.) The RLS policies were all in place, but the table-level `GRANT`s to `anon`/`authenticated` were never applied, so PostgREST rejected every read/write. Fixed with migration `grant_data_api_access` (grants matched to each table's RLS intent; RLS still governs rows). Verified anon reads of `categories`/`posts`/`profiles` now succeed.
- **Signed-in user's name was hardcoded.** (Fixed 2026-08-13.) The admin sidebar and editor byline showed the mockup's `Liya G. Tadele` for everyone. Now the admin sidebar name + avatar initials and the editor byline are populated from the signed-in user's `profiles.full_name` (via `tttAuth.currentProfile()`). Note the *value* still falls back to email until a `full_name` is set for the account — see the open question above.
- **New auth users had no `profiles` row.** (Reported by Fero, fixed 2026-08-13.) Adding a user in the Supabase Auth dashboard didn't create a `profiles` row, despite the schema describing profiles as mirroring `auth.users` — the auto-create trigger was simply never written. Added `public.handle_new_user()` + `on_auth_user_created` trigger (migration `create_profile_on_signup`), backfilled existing users, and documented it in `04-database-schema.md`. New users now get a profile automatically; set `full_name` in the Auth metadata to control the display name (otherwise it falls back to email).
- **Login can't be exercised until a staff account exists.** The auth flow is wired and the endpoint is confirmed working (a bad password returns "Invalid login credentials", not a config error), but there are zero users. To sign in, create one in Supabase → Authentication → Users → Add user (email + password, no public sign-up). Creating the *real* staff accounts is its own step in `07-next-steps.md`.

## Genuinely undecided (ask before deciding, don't assume)
- **Public "submit your story" page** for non-team members — raised early in planning, never explicitly confirmed or rejected. Don't build it without asking first.
- **Newsletter sending tool** — Resend vs. sending manually. Not urgent, doesn't block launch.

## Not yet verified
- **Mobile responsiveness** — the homepage hasn't been confirmed to look right on an actual phone yet. Check before launch; most readers will be on mobile.
