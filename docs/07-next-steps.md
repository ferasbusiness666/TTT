# Next Steps

## Before building
- [x] Decide hosting → Cloudflare Pages, private repo (see `02-tech-stack-and-decisions.md`)
- [x] Decide stack → Supabase + Cloudinary + YouTube, confirmed over Cloudflare D1 (see `02-tech-stack-and-decisions.md`)
- [x] Set up the actual GitHub repo (private)
- [x] Commit the original Claude Design HTML files as the very first commit, untouched
- [x] Auto-deploy confirmed working on Cloudflare Pages
- [x] Real navigation bug found and fixed (missing `<a>` links on homepage cards, not a hosting config issue) — every page confirmed working
- [x] Confirmed Claude Code is running in the cloud, not locally — docs updated to match

## Building
- [x] Deploy the schema in `04-database-schema.md` into the Supabase "TTT" project — done, all 5 tables live with RLS enabled. Security advisor run immediately after (see `06-changelog.md`) — found and fixed one real issue, now clean.
- [ ] Turn the hardcoded example posts into real, reusable templates — **there are 4 distinct card styles, not 1** (see `03-features-and-content-model.md` for exactly which is which). Every one of them needs to keep working with real data, not just whichever one gets noticed first. Delete the fake example posts only once real posts can be pulled from the database. The look must stay identical in all 4 styles; only the code underneath changes.
- [ ] Wire up real login (Supabase Auth, email/password)
- [ ] Wire up real post creation/editing (saves to the `posts` table)
- [ ] Wire up cover photo / image upload to Cloudinary
- [ ] Create the real staff accounts in Supabase
- [ ] Wire up the subscribe box to the `subscribers` table
- [ ] Confirm the Founders **section content** shows exactly Liya Tadele and Ije Ezedani (the nav link to it was removed, but the section's actual content was never confirmed fixed — double check this)
- [ ] Add the real favicon once the logo file is in place (see note in `08-seo-and-technical-checklist.md`, favicon section)

## Before telling anyone it's ready — full security check
- [ ] Row Level Security is ON for every table
- [ ] Every policy matches the plan: public read-only, staff write
- [ ] Nothing can be called without logging in
- [ ] Public sign-up is switched OFF in Supabase's Auth settings (a real setting, separate from the site having no sign-up page)
- [ ] No `service_role` or Cloudinary secret key anywhere in the committed code
- [ ] Site checked on an actual phone
- [ ] Newsletter-sending approach decided (or explicitly deferred)
