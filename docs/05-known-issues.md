# Known Issues & Open Questions

## Open bugs
- **Automatic Cloudinary cleanup needs its environment variables set before it works.** The code is built and deployed (`functions/api/delete-image.js`), but until the five variables below exist in Cloudflare, the endpoint answers `500 Server not configured` and images will keep piling up exactly as before. Nothing else breaks — deletion of the post itself still works, since cleanup is deliberately best-effort.

  **Cloudflare dashboard → your Pages project → Settings → Environment variables** (add to **Production** *and* **Preview**, then redeploy — variables only apply to new deployments):

  | Variable | Value |
  |---|---|
  | `CLOUDINARY_CLOUD_NAME` | `dxow1ant2` |
  | `CLOUDINARY_API_KEY` | from Cloudinary → Settings → API Keys |
  | `CLOUDINARY_API_SECRET` | from the same page — **secret, never in the repo** |
  | `SUPABASE_URL` | `https://ruzsbwgwbneqyvbdmwdb.supabase.co` |
  | `SUPABASE_ANON_KEY` | the publishable key already used in the client |

  Mark `CLOUDINARY_API_SECRET` as **encrypted/secret** in Cloudflare if it offers the option. After deploying, test by deleting a post that has a cover photo and checking the Cloudinary Media Library — Claude can confirm the folder is empty.

## Decided / accepted (not going to fix)
- **The circular TTT badge is hidden on phones (≤480px).** It sits inches from the wordmark that says the same thing, and the space it took was what squeezed the wordmark into an unreadable 101px column. Dropping it on phones is what let the masthead read properly; it still shows on tablet and desktop. Say the word if you'd rather keep it and lose something else instead.
- **Leaked-password protection stays off — it's Pro-plan only.** Supabase's HaveIBeenPwned check requires the Pro plan; this project is on the free plan, so the toggle isn't available. Accepted: accounts are admin-created for a small, fixed staff and use strong passwords, so credential-stuffing risk is low. Revisit only if the project moves to Pro. (This is the sole remaining security-advisor warning, and it's expected.)

## Resolved
- **Cards cropped photos and left dead space (Fero, fixed 2026-08-15).** Every card style forced real photos into a fixed per-type ratio, cropping portrait/square/wide images to one shape, and `.archive .acard { height:100% }` stretched short cards to the tallest in the row leaving empty paper under them. Cards now use a natural-ratio media box and size to their own photo. Verified with four real images of different shapes — ratios preserved exactly, heights independent.
- **Mobile header, second pass (Fero, fixed 2026-08-15).** After the first fix the search icon still touched the tabs when scrolled, and the open field was drawn over them. Tabs now sit level with the icon on one 49px row (down from 95px), the reserved gap uses `margin` so tabs can't scroll behind the icon, and an `is-searching` state clears the header while the field is open. Wordmark `clamp()` floor lowered to 24px so 320px phones stop clipping. Checked at 320/360/390/412px on both header implementations; desktop unchanged.
- **Mobile header/layout was broken (reported by Fero with screenshots, fixed 2026-08-15).** All four reported symptoms fixed and verified in a phone-sized browser (390×844) on both the homepage and the shared-stylesheet pages. Original symptoms:
  1. **Wordmark is clipped.** "TADELE TEEN TALKS" is cut off along the bottom — the "TALKS" line is sliced in half — even when the header is in its full (expanded, un-scrolled) state. Looks like a fixed header height that the stacked three-line wordmark overflows.
  2. **Search control is missing entirely** on phone width. `assets/ttt.js` has a mobile branch that turns the search into a round icon which expands on tap, so either the icon is being hidden or it's collapsing to zero width.
  3. **Large dead gap above the category tabs** — a big band of empty background sits between the masthead and the ALL/ARTICLES/VIDEOS row.
  4. **Header misbehaves on scroll.** The compact-on-scroll state (`is-compact`, toggled at 120px down / 10px up) doesn't settle correctly on mobile: the nav row detaches and the spacing jumps.

  **Root cause:** the homepage carries its own copy of the masthead CSS (inline `<style>` in `index.html`) and never received the mobile treatment the rest of the site already had in `assets/ttt.css` — no icon-search, no wordmark down-size, no scrolling tab row. On top of that, a genuine site-wide bug affected *every* page: the header tools (search + login + badge = 245px of a 358px row) squeezed the brand column to ~101px while the wordmark needed 128px, so it was sliced off on the right.

  **What was changed:** ported the `≤720px` header rules into `index.html` (icon search that expands on tap, wordmark at 8.5vw so all three lines fit, tabs on one horizontally-scrolling row) plus the search JS the page was missing; and in **both** `index.html` and `assets/ttt.css`, hid the redundant circular badge and slightly tightened LOGIN at ≤480px to give the wordmark its width back.

  **Measured result** (390px viewport): brand column 101px → 177px with zero overflow; expanded header 219px → 176px; scrolled header 132px → 93px; tab row 92px → 53px (one line instead of two); search present in both states. Desktop verified unchanged — every rule sits inside a mobile media query.

  Still worth doing: Fero should confirm on his own phone, since a simulated viewport isn't the same as real hardware (see the launch checklist in `07-next-steps.md`).
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
