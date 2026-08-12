# Tadele Teen Talks — Project Instructions

Before starting any work, read the files in `/docs`:
- `docs/01-project-overview.md` — what this project is, who it's for
- `docs/02-tech-stack-and-decisions.md` — the stack, and why each choice was made
- `docs/03-features-and-content-model.md` — what the site needs to do
- `docs/04-database-schema.md` — the Supabase schema (SQL included)
- `docs/05-known-issues.md` — open bugs and undecided questions
- `docs/06-changelog.md` — what's already been done
- `docs/07-next-steps.md` — what's left, in order

## Critical rules — do not break these

1. **Never change the visual design without being asked.** You're allowed to change code — structure, logic, how data flows — as long as the page still *looks* identical afterward. If a task seems like it requires a visual change, stop and ask first instead of just making the call.
2. **Work in small, scoped steps.** Do one clearly-defined thing per request. Don't fix, refactor, or "improve" anything outside what was asked.
3. **Never expose secret keys.** Supabase's anon key is meant to be public — that's normal, leave it in the client code. Supabase's `service_role` key and Cloudinary's API secret must NEVER appear in any committed file. Use environment variables / repo secrets for those.
4. **Before anything is marked ready to launch,** run the full checklist in `docs/07-next-steps.md` — don't skip it, don't assume it's fine.

When anything is ambiguous, ask rather than guess.
