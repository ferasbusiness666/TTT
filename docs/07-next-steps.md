# Next Steps

## Before building
- [x] Decide hosting → Cloudflare Pages, private repo, no license file needed (see `02-tech-stack-and-decisions.md`)
- [x] Decide stack → Supabase + Cloudinary + YouTube, confirmed over Cloudflare D1 (see `02-tech-stack-and-decisions.md`)
- [ ] Set up the actual GitHub repo (private)
- [ ] Commit the original Claude Design HTML files as the very first commit, untouched
- [ ] Connect the repo to Cloudflare Pages

## Building
- [ ] Deploy the schema in `04-database-schema.md` into the Supabase "TTT" project
- [ ] Turn the hardcoded example posts into real, reusable templates — **there are 4 distinct card styles, not 1** (see `03-features-and-content-model.md` for exactly which is which). Every one of them needs to keep working with real data, not just whichever one gets noticed first. Delete the fake example posts only once real posts can be pulled from the database. The look must stay identical in all 4 styles; only the code underneath changes.
- [ ] Wire up real login (Supabase Auth, email/password)
- [ ] Wire up real post creation/editing (saves to the `posts` table)
- [ ] Wire up cover photo / image upload to Cloudinary
- [ ] Create the real staff accounts in Supabase
- [ ] Wire up the subscribe box to the `subscribers` table
- [ ] Fix the Founders section — currently shows 4 people (Liya G. Tadele, Penelope Acosta, Meziah Woodard, Allie Schrock). Should show exactly the 2 real co-founders: **Liya Tadele** and **Ije Ezedani**. Remove everyone else from that section.
- [ ] Add the real favicon once the logo file is in place (see note in `08-seo-and-technical-checklist.md`, favicon section)

## Before telling anyone it's ready — full security check
- [ ] Row Level Security is ON for every table
- [ ] Every policy matches the plan: public read-only, staff write
- [ ] Nothing can be called without logging in
- [ ] Public sign-up is switched OFF in Supabase's Auth settings (a real setting, separate from the site having no sign-up page)
- [ ] No `service_role` or Cloudinary secret key anywhere in the committed code
- [ ] Site checked on an actual phone
- [ ] Newsletter-sending approach decided (or explicitly deferred)