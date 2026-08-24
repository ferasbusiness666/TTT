# Database Schema (v1)

Built for: Cloudflare Pages (frontend) + Supabase (DB/Auth) + Cloudinary (photos) + YouTube (video)

**Access model this schema enforces:**
- Anyone can *read* published posts — no login required.
- Only a small, admin-provisioned set of staff accounts can *write* (create/edit/delete posts). No public sign-up.
- No approval workflow — publishing is direct (sign in → post → it's live).

**Update from the first draft:** "Magazine" is not a special content type anymore. It's just one option in `post_type`, treated identically to Article/Video/Artwork — same fields, same table, nothing extra.

---

## Tables

| Table | Purpose |
|---|---|
| `profiles` | One row per staff account. Mirrors Supabase Auth — created when an admin adds someone in the Auth dashboard, not through the site. |
| `categories` | The topical taxonomy — Opinion, News, Culture, Review, Photo Essay, Tech, Special Issue, etc. |
| `posts` | The core content table — every post, regardless of type. |
| `post_media` | Extra images for a post beyond its cover photo (photo essays, galleries). |
| `subscribers` | Footer email capture. |

---

## Full SQL

```sql
-- profiles: one row per staff account (mirrors Supabase Auth)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'staff', -- unenforced for now, see notes below
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- NOTE: this policy was replaced later — see "stop_anon_enumerating_profiles"
-- in the migrations block below. Kept here so the original schema reads true.
create policy "profiles are publicly readable"
  on public.profiles for select
  to anon, authenticated
  using (true);

-- Intentionally no insert policy: accounts are created directly in
-- Supabase Auth (Dashboard -> Authentication -> Users) by an admin.
-- Instead, a trigger auto-creates the matching profile row (below) so
-- that profiles genuinely "mirror" auth.users — see next block.


-- Auto-create a profile whenever a staff account is added in Supabase Auth.
-- Without this, adding a user in the Auth dashboard leaves profiles empty.
-- SECURITY DEFINER so it can write profiles; execute is revoked from the
-- API roles and search_path is pinned, so it isn't exposed or hijackable.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      new.email,
      'Staff'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- categories
create table public.categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  slug text not null unique
);

alter table public.categories enable row level security;

create policy "categories are publicly readable"
  on public.categories for select
  to anon, authenticated
  using (true);

create policy "staff can manage categories"
  on public.categories for all
  to authenticated
  using (true)
  with check (true);


-- posts: the core content table
create table public.posts (
  id bigint generated always as identity primary key,
  title text not null,
  slug text not null unique,
  excerpt text,
  body text,
  cover_image_url text,   -- Cloudinary URL
  video_url text,         -- YouTube link, optional
  post_type text not null default 'article'
    check (post_type in ('article', 'video', 'artwork', 'magazine')), -- just a label, all equal
  category_id bigint references public.categories(id),
  author_id uuid references public.profiles(id),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_category_id_idx on public.posts (category_id);
create index posts_author_id_idx on public.posts (author_id);
create index posts_type_idx on public.posts (post_type);
create index posts_published_idx on public.posts (published_at) where status = 'published';

alter table public.posts enable row level security;

create policy "published posts are publicly readable"
  on public.posts for select
  to anon, authenticated
  using (status = 'published');

create policy "staff can view all posts including drafts"
  on public.posts for select
  to authenticated
  using (true);

create policy "staff can create posts"
  on public.posts for insert
  to authenticated
  with check (true);

create policy "staff can update posts"
  on public.posts for update
  to authenticated
  using (true)
  with check (true);

create policy "staff can delete posts"
  on public.posts for delete
  to authenticated
  using (true);


-- post_media: extra images for photo essays / galleries beyond the cover image
create table public.post_media (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  caption text,
  display_order int not null default 0
);

create index post_media_post_id_idx on public.post_media (post_id);

alter table public.post_media enable row level security;

create policy "post media is publicly readable when the post is published"
  on public.post_media for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.posts
      where posts.id = post_media.post_id and posts.status = 'published'
    )
  );

create policy "staff can manage post media"
  on public.post_media for all
  to authenticated
  using (true)
  with check (true);


-- subscribers: footer email capture
create table public.subscribers (
  id bigint generated always as identity primary key,
  email text not null unique,
  subscribed_at timestamptz not null default now()
);

alter table public.subscribers enable row level security;

create policy "anyone can subscribe"
  on public.subscribers for insert
  to anon, authenticated
  with check (true);

create policy "staff can view subscriber list"
  on public.subscribers for select
  to authenticated
  using (true);
```

---

## Hardening applied after the security stress test

Three migrations tighten the original schema (see `09-security-stress-test.md`):

```sql
-- validate_subscriber_emails (#1)
-- Public INSERT stays — the newsletter needs it — but junk is rejected.
alter table public.subscribers
  add constraint subscribers_email_format check (
    char_length(email) between 6 and 254
    and email ~ '^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$'
  );
-- plus a BEFORE INSERT/UPDATE trigger lowercasing and trimming the address,
-- so Foo@Bar.com and foo@bar.com can't both be stored past the unique index.

-- narrow_public_profile_columns (#4)
-- RLS filters rows, not columns, so column-level grants are the right tool:
-- the public may read a byline, nothing more.
revoke select on public.profiles from anon;
grant  select (id, full_name) on public.profiles to anon;
grant  select on public.profiles to authenticated;   -- staff still see role

-- stop_anon_enumerating_profiles (#4, second half)
-- The column grants above stopped anon reading `role`/`created_at`, but the
-- row policy was still `using (true)` — so anyone with the public key could
-- list every staff member's name and auth UUID, including people who have
-- never published. Anon now sees a profile only if that person has a
-- published post, i.e. exactly the bylines already visible on the site.
drop policy "profiles are publicly readable" on public.profiles;

create policy "published authors are publicly readable"
  on public.profiles for select to anon
  using (
    exists (
      select 1 from public.posts p
      where p.author_id = profiles.id
        and p.status = 'published'
    )
  );

create policy "profiles are readable when signed in"
  on public.profiles for select to authenticated
  using (true);
```

**Why `id` is still readable by anon:** it looks like the UUID could be revoked too, but PostgREST resolves `author:profiles(full_name)` with a join on `profiles.id`, so revoking SELECT on that column returns `42501` for the whole embed and every byline on the site disappears. Tested and reverted. The row policy is what limits the exposure instead: no published posts, no readable profiles.

**Consequence worth knowing:** any *public* query that selects `profiles.role` now fails with `42501`. `article.html` used to request `author:profiles(full_name, role)` for its byline and had to stop — the byline shows date + read time instead. Staff-only code (`tttAuth.currentProfile()`) still reads `role` because `authenticated` keeps full access.

## Notes

- **Accounts aren't created through the app.** Add each staff person directly in Supabase → Authentication → Users. The `on_auth_user_created` trigger then creates their `profiles` row automatically — no manual insert needed.
- **Set a real display name when creating the account.** In the "Add user" dialog (or afterward, under the user's *User Metadata*), add `full_name`. If you skip it, the profile's `full_name` falls back to the email address, which is what shows in the UI. The name can be updated later either in Auth metadata or directly on the `profiles` row.
- **`role` on `profiles` does nothing yet.** Every account can do everything right now. It's there so that later, if an approval step is wanted, a policy can check `role = 'editor'` — no restructuring needed.
- **Comments, whenever ready**, would just be a new, fully independent table referencing `posts.id` — zero risk to anything above.
- **Data API access:** Supabase sometimes needs `anon`/`authenticated` roles explicitly granted on a *new* table beyond RLS. If a table seems invisible from the app right after creating it, check Table Editor → API settings.
- **When actually running this:** use `supabase migration new create_initial_schema` and put this SQL in the generated file, rather than pasting it straight into the SQL editor — keeps a clean migration history.

## Newsletter rate limiting (migration `rate_limit_newsletter_signups`, 2026-08-19)
The subscribe box had format validation but no volume limit — anyone could bulk-insert well-formed addresses indefinitely. Both the security re-test and Cloudflare's own scan flagged it.

**The key discovery:** PostgREST exposes the HTTP request headers to SQL via `current_setting('request.headers')`, and Supabase sits behind Cloudflare, so **`cf-connecting-ip` is readable from inside a function**. Verified with a throwaway probe before building anything. That means the limit lives entirely in the database — no Pages Function, no new Cloudflare environment variable, and **no `service_role` key anywhere**, which was the alternative design and a much bigger key to be holding.

```sql
-- attempt log; NOT granted to anon, RLS on with no policies -> unreachable
-- through the Data API. Stores md5(ip || salt), never the address itself.
create table public.subscribe_attempts (
  ip_hash text not null,
  at      timestamptz not null default now()
);

-- security definer, search_path pinned, execute revoked from PUBLIC
create function public.subscribe(p_email text) returns text ...
--   'ok' | 'duplicate' | 'invalid' | 'rate_limited'
--   30/IP/hour, 100/IP/day, 1000 site-wide/hour, 3000 site-wide/day
--   deletes attempts older than two days on each call

revoke insert on public.subscribers from anon;   -- RPC is the only way in
drop policy "anyone can subscribe" on public.subscribers;
```

**Why the IP is hashed:** this is a site for teenagers; there is no reason to keep a log of their addresses. The hash is salted so the table can't be reversed into a visitor list even by someone with database access.

**The limits were raised the same day (`raise_newsletter_rate_limits`), and the first numbers were a real mistake worth remembering.** They started at 5/IP/hour, set as if one IP meant one person. It doesn't: a school is typically a single public address, and mobile carriers put thousands of phones behind one through CGNAT. TTT's readers are teenagers on school wifi and phone data — the original limit would have blocked most of a class the moment they tried to subscribe together. **When rate-limiting by IP, always ask how many real people sit behind one.** Current numbers let a class of 30 sign up in one lesson and only bite during an actual flood; if legitimate traffic ever trips them, raise them, because turning away readers is the worse failure.

**Honest limit:** per-IP limiting is defence against casual abuse, not a determined attacker — anyone with a proxy pool presents as a different visitor each request. This was demonstrated accidentally: the first test run showed 7 requests sailing through the limit because the test sandbox egresses through rotating proxies, appearing as 5 separate visitors. **The site-wide cap of 200/hour is what actually bounds the damage.** Cloudflare Turnstile on the form remains the upgrade if it ever matters.
