# Changelog

## Planning phase
- Chose hosting: GitHub Pages over Netlify. Repo will be public, with no open-source license (all rights reserved by default).
- Chose stack: Supabase (DB/Auth), Cloudinary (photos), YouTube (video).
- Confirmed content model: flat permissions (any staff account can do anything), no approval workflow, type + category labels, Draft/Published only.
- Confirmed no comments for v1 — schema supports adding later without disrupting existing data.
- Built and then corrected the database schema (Magazine changed from a special type to just a label).

## UI fixes (mockup → matches the real plan)
- Removed the "Review" **status** from the admin posts table and status options — only Draft/Published exist now. (Kept "Review" as a **category** option — that's a topic label like "this post reviews something," unrelated to approval status.)
- Removed "Comments" from the admin sidebar navigation.
- Confirmed "Magazines" is just a post-type label, not a special structure — schema updated to match (see `04-database-schema.md`).

## Hosting reconsidered
- Switched hosting from GitHub Pages to Cloudflare Pages — no bandwidth cap, cleaner default web address. Still deploys from the same GitHub repo.
- Because Cloudflare Pages deploys from private repos for free (GitHub Pages didn't, on the free plan), switched the repo back to **private**. The public-repo decision and the license reasoning from the planning phase no longer apply — see `02-tech-stack-and-decisions.md` for the current state.
- Considered moving the database to Cloudflare D1 (since hosting is now on Cloudflare) — decided against it. D1 has no built-in authentication; Supabase stays.

## Hosting corrected again — Pages → Workers with Static Assets
- Classic Cloudflare Pages (the dashboard/Git-integration flow) defaulted to single-page-app routing behavior, which broke every page except the homepage (only index.html ever loaded).
- Switched to Cloudflare Workers with Static Assets — same free hosting, but Cloudflare's current recommended path, deployed via Wrangler (`wrangler deploy`) instead of the Pages dashboard. Configuration lives in `wrangler.jsonc`, with `not_found_handling: "404-page"` specifically fixing the routing bug.
- Repo visibility stopped mattering to the hosting decision entirely — Wrangler deploys from local files, not from GitHub directly.

## Hosting, final answer — back to Pages, and the real bug found
- The Workers migration never actually happened (checked the account directly — zero Workers existed).
- The real navigation bug turned out to be simpler than the SPA-fallback theory: the homepage story cards were never wrapped in real `<a>` links at all. Fixed directly, tested link-by-link, confirmed a clean 52-line diff (just adding the missing links).
- Since Pages is confirmed working with auto-deploy already connected, staying on it rather than migrating again.
- Confirmed Claude Code has been running in the cloud this whole time, not locally as originally planned — `02-tech-stack-and-decisions.md` updated to match, including what that means for reviewing changes.
- UI fixes: Founders link removed from site navigation; Art & Photography section fixed (details not fully known on my end — worth double-checking the Founders section itself still shows just Liya Tadele and Ije Ezedani, since that was a separate, still-open task).

## Database schema deployed
- Ran the full schema from `04-database-schema.md` against the real Supabase "TTT" project — all 5 tables created (`profiles`, `categories`, `posts`, `post_media`, `subscribers`), RLS enabled on every one.
- Ran Supabase's security advisor afterward, per the pre-launch check we set up. It found one real issue: a `SECURITY DEFINER` function (`rls_auto_enable`, not something in our schema — appears to be a platform-provided safety net that auto-enables RLS on new tables) was publicly callable via the API. Revoked public execute access on it; advisor now reports zero security findings.
- Performance advisor found only minor, expected notes (unused indexes on brand-new empty tables, a couple of redundant policy checks) — nothing urgent, noted for later.

## Backend wiring — real login
- **Replaced the prototype login with real Supabase Auth (email/password).** The old login accepted anything and jumped straight to the dashboard; it now authenticates against Supabase. New shared helper `assets/ttt-auth.js` builds the Supabase client from the public **publishable** key and exposes `signIn` / `signOut` / `getSession` / `guard`.
- `login.html` signs in for real and shows an inline error on failure (hidden otherwise — the page looks identical until something goes wrong). `admin.html` and `editor.html` are now guarded: they stay hidden until a session is confirmed, then reveal — otherwise they redirect to the login screen. The admin "Log out" link ends the Supabase session for real. No visual/layout changes; the only new visible element is the login-error text, and only on a failed attempt.
- **Found a blocker while testing (logged in `05-known-issues.md`):** the Data API can't read/write any table yet — the table-level `GRANT`s to `anon`/`authenticated` were never applied, so PostgREST returns `42501 permission denied` even though the RLS policies exist. This is separate from the security-advisor pass above (advisors don't flag missing grants). It doesn't affect login (Auth uses a different endpoint, confirmed working), but it blocks the post/subscribe/data steps — fix it first when wiring those.
- **Note:** actually signing in needs a staff account, and there are none yet — create one in Supabase → Authentication → Users to test end-to-end (creating the real accounts is its own step below).

## Auth follow-ups (login testing)
- **Login confirmed working** by Fero — signing in with a real Supabase account reaches the dashboard; a wrong/absent account does not.
- **Fixed: new auth users had no `profiles` row.** The schema described profiles as "mirroring" `auth.users`, but the trigger that makes that real was never created, so adding a user in the Supabase dashboard left `profiles` empty. Added `public.handle_new_user()` + the `on_auth_user_created` trigger (migration `create_profile_on_signup`) and backfilled the one existing account. The function is `SECURITY DEFINER` with execute revoked from the API roles and a pinned `search_path`, so the security advisor stays clean. Documented the trigger in `04-database-schema.md`. If a user is created without a `full_name` in their Auth metadata, the profile falls back to their email (that's why the current test account shows the email as its name).
- **Still open (unchanged):** the admin sidebar / editor byline show a hardcoded placeholder name rather than the signed-in user's real `full_name` — now that profile rows exist, this just needs the Data API GRANT fix so the client can read `profiles`. Tracked in `05-known-issues.md` / `07-next-steps.md`.
- **Advisor note:** Supabase's "leaked password protection" (HaveIBeenPwned check) is currently disabled — a one-click toggle in Auth settings, added to the pre-launch security check.

## Database security audit (Fero requested a full pass)
- **RLS confirmed ON for all 5 tables** (`profiles`, `categories`, `posts`, `post_media`, `subscribers`), each with policies matching the plan (public read where intended, staff write, subscribers insert-by-anyone / read-by-staff).
- **Tightened table grants to least privilege.** The API roles (`anon`/`authenticated`) also carried `TRUNCATE`, `TRIGGER`, and `REFERENCES` (Supabase defaults the Data API never uses; `TRUNCATE` even bypasses RLS). Revoked them (migration `harden_table_grants_least_privilege`). Final grants: anon = SELECT on content + INSERT on subscribers only; authenticated = CRUD on content, SELECT-only on profiles, INSERT/SELECT on subscribers. No `PUBLIC`-role grants exist.
- **SECURITY DEFINER functions checked** — both `handle_new_user` and the platform's `rls_auto_enable` are executable only by `postgres` (revoked from API roles) and have pinned search paths. No functions exposed to the API.
- **No extensions in the `public` schema** (all in `extensions`/`vault`), so no extension-in-public advisor risk.
- **No secret keys in the repo** — only the public publishable key is in client code; grep for `service_role` / Cloudinary secret finds only doc references.
- **Two auth settings still need changing in the dashboard (can't be done via API):**
  - **Public sign-up is currently ENABLED** — a signup test reached email validation instead of being rejected, meaning the "allow signups" gate is open. For a staff-only site this MUST be turned OFF (Authentication → Providers/Sign In → disable new sign-ups, or Auth → Settings "Allow new users to sign up"). Tracked in `05`/`07`.
  - **Leaked-password protection is OFF** — enable the HaveIBeenPwned check (Auth → Settings). Only remaining security-advisor warning.
- Remaining advisor notes are performance-only and expected on empty tables: 3 unused-index INFOs (indexes get used once there's data) and 3 multiple-permissive-policy WARNs (the public-read + staff-read policies overlap for `authenticated` — intentional, negligible at this scale). Left as-is.
- **Follow-up (same day):** Fero disabled public sign-up in the dashboard — verified the signup API now returns "Signups not allowed for this instance". Leaked-password protection turned out to be a Pro-plan feature, unavailable on this free-plan project; accepted as a deliberate deferral given admin-only accounts + strong passwords (see `05-known-issues.md`). Net result: no open security items; the one remaining advisor warning is the expected Pro-only one.

## Real post creation / editing (write path)
- **Editor now saves to the `posts` table.** Save Draft and Publish insert (new) or update (existing) a real row: `title`, `excerpt` (from the deck field), `body` (the editor HTML), `post_type`, `status` (draft/published), `author_id` (the signed-in user), and `published_at` on first publish. Slug is auto-generated from the title with a short unique suffix. Publish redirects back to the dashboard; Save Draft keeps you in the editor.
- **Editor can edit existing posts.** Opening `editor.html?id=<postId>` loads that post's fields back in and switches Save/Publish to update mode (preserving the original author and publish date).
- **Admin dashboard reads real posts.** Replaced the hardcoded `POSTS[]` array with a live query (`posts` + embedded author `full_name`). The stat counts, publish/unpublish toggle, and delete all act on the database now; View links to `article.html?post=<slug>` and Edit to `editor.html?id=<id>`. Visuals unchanged — `post_type` maps to the same labels/card colours the mockup used.
- **Verified** the read path end-to-end: inserted a published test post, confirmed the admin's exact select string (with the `author:profiles(full_name)` embed) returns it correctly via the API, then deleted it. The table is empty again.
- **Known limitations (tracked in `05`/`07`), deferred by design:**
  - `cover_image_url` and `video_url` aren't saved yet — they belong to the Cloudinary/YouTube step. A cover added in the editor previews but doesn't persist.
  - The editor's single category dropdown maps to `post_type` only (opinion/review → article); a real topical-category picker needs a second control, which is a design change to raise separately. `category_id` stays null for now.
  - Body images added in the editor are still inline data-URLs (stored in `body`); the Cloudinary step will move those to hosted URLs.

## Data API unblocked + real user name
- **Fixed the Data API `42501 permission denied` errors.** The table-level `GRANT`s to `anon`/`authenticated` were missing (only the RLS policies existed), so every read/write through PostgREST failed — visible in the dashboard's Table Editor too. Added migration `grant_data_api_access` granting the privileges that match each table's RLS intent (public read on posts/categories/profiles/post_media, staff write, anyone-can-subscribe insert, staff-only subscriber read). Verified anon reads of `categories`, `posts`, and `profiles` now return data instead of an error. RLS still governs which rows each role sees.
- **Wired the real signed-in user's name into the UI.** New `tttAuth.currentProfile()` helper reads the logged-in user's `profiles.full_name` (+ role). The admin sidebar name and avatar initials, and the editor byline, now show that instead of the hardcoded `Liya G. Tadele` placeholder. The name *value* falls back to the account's email until a `full_name` is set in Auth metadata (or directly on the profile row) — the Supabase quick-create dialog doesn't offer a metadata field, noted as an open question in `05-known-issues.md`.
